const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const COOKIE_NAME = "todo_session";

function getCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return { httpOnly: true, secure: isProduction, sameSite: "strict", path: "/api", maxAge: 8 * 60 * 60 * 1000 };
}

function safeEqual(value, expected) {
  const actualBytes = Buffer.from(value, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function validateAuthConfig(env) {
  const username = env.APP_USERNAME;
  const password = env.APP_PASSWORD;
  const secret = env.JWT_SECRET;
  if (!username || !password || !secret) {
    throw new Error("APP_USERNAME, APP_PASSWORD, and JWT_SECRET must be configured.");
  }
  if (password.length < 12) throw new Error("APP_PASSWORD must contain at least 12 characters.");
  if (secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return { username, secret, comparePassword: (candidate) => safeEqual(candidate, password) };
}

function issueToken(username, secret) {
  return jwt.sign({ sub: username }, secret, { expiresIn: "8h", issuer: "todo-api", audience: "todo-app" });
}

function createAuthMiddleware(secret) {
  return (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Authentication required." });
    try {
      req.user = jwt.verify(token, secret, { issuer: "todo-api", audience: "todo-app" });
      return next();
    } catch {
      return res.status(401).json({ error: "Session is invalid or expired. Please sign in again." });
    }
  };
}

module.exports = { COOKIE_NAME, createAuthMiddleware, getCookieOptions, issueToken, validateAuthConfig };
