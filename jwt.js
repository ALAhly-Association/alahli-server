// middleware/jwt.js
const jwt = require('jsonwebtoken');

/**
 * يتحقق من وجود وتحقق توكن JWT
 * يضع الحمولة في req.user إذا كانت صحيحة
 */
function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // مثال الحمولة المتوقعة: { id, role, iat, exp }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * يتحقق من أن دور المستخدم ضمن الأدوار المسموحة
 * usage: requireRole('PRESIDENT'), requireRole('SUPERVISOR','PRESIDENT')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { auth, requireRole };