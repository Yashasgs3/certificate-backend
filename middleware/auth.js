const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Get token
  let token = req.header("x-auth-token");

  if (!token && req.header("Authorization")) {
    token = req.header("Authorization").replace(/^Bearer\s+/i, "");
  }

  // No token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FIXED
    req.user = decoded.user;
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ msg: "Token is not valid" });
  }
  next();
};
