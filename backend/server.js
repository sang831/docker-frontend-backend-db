require("dotenv").config();

const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { COOKIE_NAME, createAuthMiddleware, getCookieOptions, issueToken, validateAuthConfig } = require("./auth");
const { errorHandler } = require("./middleware/errors");
const routes = require("./routes");

async function main() {
  const config = validateAuthConfig(process.env);
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/todos";
  const port = Number(process.env.PORT) || 3001;
  const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type"], maxAge: 600 }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable", database: ready ? "connected" : "disconnected" });
  });

  app.post("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }), (req, res) => {
    const username = typeof req.body?.username === "string" ? req.body.username : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (username !== config.username || !config.comparePassword(password)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    res.cookie(COOKIE_NAME, issueToken(config.username, config.secret), getCookieOptions());
    return res.json({ authenticated: true, expiresIn: "8h" });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, getCookieOptions());
    return res.status(204).end();
  });

  app.use("/api", createAuthMiddleware(config.secret));
  app.get("/api/auth/session", (req, res) => res.json({ authenticated: true, username: req.user.sub }));
  app.use("/api", routes);
  app.use((req, res) => res.status(404).json({ error: "Route not found." }));
  app.use(errorHandler);

  const server = app.listen(port, () => console.log(`API listening on port ${port}`));
  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("API failed to start:", error.message);
  process.exitCode = 1;
});
