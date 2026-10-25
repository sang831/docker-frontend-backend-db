function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: error.message });
  }
  console.error("Request failed:", error.message);
  return res.status(500).json({ error: "An unexpected server error occurred." });
}

module.exports = { errorHandler };
