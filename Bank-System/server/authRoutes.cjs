// authRoutes.cjs (updated with username, role, unique checks, separate logins)
const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const { connectToDatabase } = require("./connect.cjs");

const router = express.Router();

// Regex whitelist
const regex = {
  username: /^[a-zA-Z0-9_-]{3,20}$/, // Alphanumeric, underscore, hyphen
  fullName: /^[a-zA-Z\s]{3,50}$/, // Only letters and spaces
  idNumber: /^[0-9]{6,13}$/, // 6–13 digits
  accountNumber: /^[0-9]{6,20}$/, // 6–20 digits
};

function validateRegistrationInput(
  username,
  fullName,
  idNumber,
  accountNumber,
  password
) {
  if (!regex.username.test(username)) return "Invalid username";
  if (!regex.fullName.test(fullName)) return "Invalid full name";
  if (!regex.idNumber.test(idNumber)) return "Invalid ID number";
  if (!regex.accountNumber.test(accountNumber)) return "Invalid account number";
  if (!validator.isStrongPassword(password, { minSymbols: 0 })) {
    return "Password too weak (must include uppercase, lowercase, number)";
  }
  return null;
}

// Register endpoint (customers only)
router.post("/register", async (req, res) => {
  try {
    const { username, fullName, idNumber, accountNumber, password } = req.body;

    // Input validation
    const error = validateRegistrationInput(
      username,
      fullName,
      idNumber,
      accountNumber,
      password
    );
    if (error) return res.status(400).json({ error });

    const db = await connectToDatabase();

    // Prevent duplicates
    const existing = await db.collection("Users").findOne({
      $or: [{ username }, { accountNumber }, { idNumber }],
    });
    if (existing)
      return res
        .status(400)
        .json({ error: "Username, account, or ID already exists" });

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.collection("Users").insertOne({
      username,
      fullName,
      idNumber,
      accountNumber,
      password: hashedPassword,
      role: "customer",
      createdAt: new Date(),
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Customer login endpoint
router.post("/customer-login", async (req, res) => {
  try {
    const { username, accountNumber, password } = req.body;

    const db = await connectToDatabase();
    const user = await db
      .collection("Users")
      .findOne({ username, accountNumber, role: "customer" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Save session
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    res.json({ message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Staff login endpoint
router.post("/staff-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const db = await connectToDatabase();
    const user = await db
      .collection("Users")
      .findOne({ username, role: "staff" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Save session
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    res.json({ message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Staff registration endpoint
router.post("/register-staff", async (req, res) => {
  try {
    const { username, fullName, idNumber, accountNumber, password, role } =
      req.body;

    // Ensure role is "staff"
    if (role !== "staff") {
      return res
        .status(400)
        .json({ error: "Invalid role for staff registration" });
    }

    // Input validation
    const error = validateRegistrationInput(
      username,
      fullName,
      idNumber,
      accountNumber,
      password
    );
    if (error) return res.status(400).json({ error });

    const db = await connectToDatabase();

    // Prevent duplicates
    const existing = await db.collection("Users").findOne({
      $or: [{ username }, { accountNumber }, { idNumber }],
    });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Username, account, or ID already exists" });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.collection("Users").insertOne({
      username,
      fullName,
      idNumber,
      accountNumber,
      password: hashedPassword,
      role: "staff",
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Staff user registered successfully" });
  } catch (err) {
    console.error("Staff registration error:", err);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ message: "Logout successful" });
  });
});

module.exports = router;
