// index.js (في الجذر)
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// ✅ الاستيراد من الجذر مباشرة
const authRoutes    = require('./auth');
const adminRoutes   = require('./admin');
const groupsRoutes  = require('./groups');
const matchesRoutes = require('./matches');

const app = express();

// مؤقتًا افتح CORS للجميع (اختبر)، ثم شدده لاحقًا
app.use(cors());
app.use(express.json());

// Health & Root
app.get('/',      (req, res) => res.json({ ok: true, service: 'Rabta API' }));
app.get('/health',(req, res) => res.json({ ok: true }));

// ربط الراوترات
app.use('/auth',    authRoutes);
app.use('/admin',   adminRoutes);
app.use('/groups',  groupsRoutes);
app.use('/matches', matchesRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

// PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
const { auth, requireRole } = require('./middleware/jwt');
