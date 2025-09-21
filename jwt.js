// middleware/jwt.js
const jwt = require('jsonwebtoken');

/**
 * استعمال:
 *   const requireAuth = require('./middleware/jwt');
 *   // للسماح لأي مستخدم مسجل:
 *   router.use(requireAuth());
 *   // لتقييد أدوار معينة:
 *   router.use(requireAuth(['PRESIDENT']));
 *   // أو داخل مسار:
 *   router.post('/x', requireAuth(['PRESIDENT', 'SUPERVISOR']), handler)
 */
module.exports = function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Missing token' });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // payload سيكون مثلاً: { id, role, iat, exp }
      req.user = payload;

      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(payload.role)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};
