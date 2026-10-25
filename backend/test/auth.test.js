const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createAuthMiddleware, getCookieOptions, issueToken, validateAuthConfig } = require("../auth");

const authEnv = {
  APP_USERNAME: "todo-admin",
  APP_PASSWORD: "a-strong-password-123",
  JWT_SECRET: "a-long-test-signing-secret-with-more-than-32-characters",
};

test("auth configuration requires credentials and a strong signing secret", () => {
  assert.throws(() => validateAuthConfig({}), /must be configured/);
  assert.throws(() => validateAuthConfig({ ...authEnv, APP_PASSWORD: "short" }), /at least 12/);
  assert.throws(() => validateAuthConfig({ ...authEnv, JWT_SECRET: "too-short" }), /at least 32/);
});

test("configured password comparison accepts only the configured password", () => {
  const config = validateAuthConfig(authEnv);
  assert.equal(config.comparePassword(authEnv.APP_PASSWORD), true);
  assert.equal(config.comparePassword("different-password"), false);
});

test("login token has an issuer, audience, subject, and expiration", () => {
  const token = issueToken(authEnv.APP_USERNAME, authEnv.JWT_SECRET);
  const payload = jwt.verify(token, authEnv.JWT_SECRET, { issuer: "todo-api", audience: "todo-app" });
  assert.equal(payload.sub, authEnv.APP_USERNAME);
  assert.ok(payload.exp > payload.iat);
});

test("session cookies are HttpOnly, same-site, and secure in production", () => {
  assert.deepEqual(getCookieOptions(false), {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    path: "/api",
    maxAge: 8 * 60 * 60 * 1000,
  });
  assert.equal(getCookieOptions(true).secure, true);
});

test("auth middleware rejects missing and invalid session cookies", () => {
  const middleware = createAuthMiddleware(authEnv.JWT_SECRET);
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let nextCalled = false;

  middleware({ cookies: {} }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);

  middleware({ cookies: { todo_session: "invalid" } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("auth middleware accepts a valid session cookie", () => {
  const middleware = createAuthMiddleware(authEnv.JWT_SECRET);
  const token = issueToken(authEnv.APP_USERNAME, authEnv.JWT_SECRET);
  const req = { cookies: { todo_session: token } };
  const res = { status() { throw new Error("Unexpected response"); }, json() { throw new Error("Unexpected response"); } };
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.sub, authEnv.APP_USERNAME);
});
