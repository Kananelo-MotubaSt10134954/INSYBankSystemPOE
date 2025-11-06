import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(
        path.resolve(__dirname, "server/certs/privatekey.pem")
      ),
      cert: fs.readFileSync(
        path.resolve(__dirname, "server/certs/certificate.pem")
      ),
    },
    port: 5173,
    proxy: {
      "/api": {
        target: "https://localhost:8443", // Backend HTTPS port
        changeOrigin: true,
        secure: false, // Ignore self-signed certificate for local dev
      },
    },
  },
  build: {
    outDir: "dist", // Ensure build output goes to Bank-System/dist/
  },
});

console.log("Loading SSL certs from:", path.resolve(__dirname, "server/certs"));

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     https: {
//       key: fs.readFileSync(
//         path.resolve(__dirname, "server/certs/privatekey.pem")
//       ),
//       cert: fs.readFileSync(
//         path.resolve(__dirname, "server/certs/certificate.pem")
//       ),
//     },
//     port: 5173,
//   },
// });

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
