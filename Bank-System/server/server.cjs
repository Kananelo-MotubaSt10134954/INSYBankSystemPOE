const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");
const authRoutes = require("./authRoutes.cjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const expressSanitizer = require("express-sanitizer");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const { ObjectId } = require("mongodb");
const sanitize = require("mongo-sanitize");
const cors = require("cors");

require("dotenv").config({ path: path.join(__dirname, "config.env") });

const { connectToDatabase, closeDatabase } = require("./connect.cjs");

const app = express();

const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const HTTP_PORT = process.env.HTTP_PORT || 8080;

app.use(
  cors({
    origin: "https://localhost:5173", // Match Vite's HTTPS dev server
    credentials: true, // Allow cookies for sessions
  })
);

// app.use(
//   cors({
//     origin:
//       process.env.NODE_ENV === "production"
//         ? "https://localhost:8443"
//         : "https://localhost:5173",
//     credentials: true,
//   })
// );

const keyPath = path.join(__dirname, "certs", "privatekey.pem");
const certPath = path.join(__dirname, "certs", "certificate.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("SSL certificate or key missing in server/certs/");
  process.exit(1);
}
const privateKey = fs.readFileSync(keyPath, "utf8");
const certificate = fs.readFileSync(certPath, "utf8");

// Security middlewares
app.use(helmet());
app.use(helmet.frameguard({ action: "deny" }));
app.use(
  helmet.hsts({ maxAge: 63072000, includeSubDomains: true, preload: true })
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(expressSanitizer());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// Sessions with MongoStore
app.use(
  session({
    secret: process.env.SESSION_SECRET || "replace_this_in_production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.ATLAS_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Authentication middleware
const isAuthenticated =
  (allowedRoles = []) =>
  async (req, res, next) => {
    if (!req.session.userId || !req.session.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const db = await connectToDatabase(); // Reuse existing connection
      req.user = await db
        .collection("Users")
        .findOne({ _id: new ObjectId(req.session.userId) });
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      next();
    } catch (err) {
      console.error("Authentication error:", err);
      res.status(500).json({ error: "Authentication error" });
    }
  };

// Routes
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/users", isAuthenticated(["staff"]), async (req, res) => {
  try {
    const db = await connectToDatabase(); // Reuse existing connection
    const users = await db.collection("Users").find().limit(100).toArray();
    res.json(users);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "DB error" });
  }
});
app.get("/api/bankpayments", isAuthenticated(["staff"]), async (req, res) => {
  try {
    const db = await connectToDatabase(); // Reuse existing connection
    const payments = await db
      .collection("BankPayments")
      .find()
      .limit(100)
      .toArray();
    res.json(payments);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "DB error" });
  }
});
app.post(
  "/api/bankpayments",
  isAuthenticated(["customer"]),
  async (req, res) => {
    try {
      const { amount, currency, payeeAccount, swiftCode } = sanitize(req.body);
      const regexPayment = {
        amount: /^\d+(\.\d{1,2})?$/,
        currency: /^[A-Z]{3}$/,
        payeeAccount: /^[A-Z0-9]{5,34}$/,
        swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
      };
      if (!regexPayment.amount.test(amount))
        return res.status(400).json({ error: "Invalid amount" });
      if (!regexPayment.currency.test(currency))
        return res.status(400).json({ error: "Invalid currency" });
      if (!regexPayment.payeeAccount.test(payeeAccount))
        return res.status(400).json({ error: "Invalid payee account" });
      if (!regexPayment.swiftCode.test(swiftCode))
        return res.status(400).json({ error: "Invalid SWIFT code" });
      const db = await connectToDatabase(); // Reuse existing connection
      await db.collection("BankPayments").insertOne({
        customerId: req.user._id,
        amount: parseFloat(amount),
        currency,
        provider: "SWIFT",
        payeeAccount,
        swiftCode,
        status: "pending",
        createdAt: new Date(),
      });
      res.status(201).json({ message: "Payment created successfully" });
    } catch (err) {
      console.error("Payment creation error:", err);
      res.status(500).json({ error: "Payment creation failed" });
    }
  }
);
app.patch(
  "/api/bankpayments/:id/verify",
  isAuthenticated(["staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = await connectToDatabase(); // Reuse existing connection
      const result = await db.collection("BankPayments").updateOne(
        { _id: new ObjectId(id), status: "pending" },
        {
          $set: {
            status: "verified",
            verifiedAt: new Date(),
            verifiedBy: req.user._id,
          },
        }
      );
      if (result.matchedCount === 0)
        return res
          .status(404)
          .json({ error: "Payment not found or already processed" });
      res.json({ message: "Payment verified" });
    } catch (err) {
      console.error("Verification error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  }
);
app.post(
  "/api/bankpayments/submit-to-swift",
  isAuthenticated(["staff"]),
  async (req, res) => {
    try {
      const { ids } = sanitize(req.body);
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ error: "Invalid IDs" });
      const db = await connectToDatabase(); // Reuse existing connection
      const objectIds = ids.map((id) => new ObjectId(id));
      const result = await db.collection("BankPayments").updateMany(
        { _id: { $in: objectIds }, status: "verified" },
        {
          $set: {
            status: "submitted",
            submittedAt: new Date(),
            submittedBy: req.user._id,
          },
        }
      );
      if (result.matchedCount === 0)
        return res.status(404).json({ error: "No verified payments found" });
      res.json({
        message: `${result.modifiedCount} payments submitted to SWIFT`,
      });
    } catch (err) {
      console.error("Submission error:", err);
      res.status(500).json({ error: "Submission failed" });
    }
  }
);

// Serve frontend with error handling
//const clientDist = path.join(__dirname, "..", "client", "dist");
const clientDist = path.join(__dirname, "..", "dist");
if (
  fs.existsSync(clientDist) &&
  fs.existsSync(path.join(clientDist, "index.html"))
) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    try {
      res.sendFile(path.join(clientDist, "index.html"), (err) => {
        if (err) {
          console.error("Error serving index.html:", err);
          next(err);
        }
      });
    } catch (err) {
      console.error("Catch-all route error:", err);
      next(err);
    }
  });
} else {
  app.get("/", (req, res) => {
    res
      .status(200)
      .send("API running. No client build found or index.html missing.");
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start servers with MongoDB connection
async function startServer() {
  try {
    await connectToDatabase(); // Establish connection at startup
    console.log("Server setup continuing..."); // Debug log

    // HTTPS server
    https
      .createServer({ key: privateKey, cert: certificate }, app)
      .listen(HTTPS_PORT, () => {
        console.log(
          `HTTPS server listening on https://localhost:${HTTPS_PORT}`
        );
      });

    // HTTP redirect server
    http
      .createServer((req, res) => {
        const host = req.headers.host
          ? req.headers.host.split(":")[0]
          : "localhost";
        const portPart =
          HTTPS_PORT && HTTPS_PORT != 443 ? `:${HTTPS_PORT}` : "";
        res.writeHead(301, {
          Location: `https://${host}${portPart}${req.url}`,
        });
        res.end();
      })
      .listen(HTTP_PORT, () => {
        console.log(`HTTP redirect server listening on port ${HTTP_PORT}`);
      });
  } catch (err) {
    console.error("Server startup error:", err.message);
    process.exit(1); // Exit on failure
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("SIGINT received: closing DB connection");
  await closeDatabase();
  process.exit(0);
});
