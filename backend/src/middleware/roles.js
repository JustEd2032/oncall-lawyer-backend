export function requireRole(role) {
  return (req, res, next) => {
    // req.user is already the decoded token from authenticate()
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
