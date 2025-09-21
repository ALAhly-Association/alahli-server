require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const app = express();

/* ====== CORS مؤقتًا نسمح للكل حتى نتأكد من التشغيل ====== */
app.use(cors());
app.use(express.json());

/* ====== راوتراتك موجودة في الجذر ====== */
const authRoutes    = require('./auth');     // كان ./routes/auth
const adminRoutes   = require('./admin');    // كان ./routes/admin
const groupsRoutes  = require('./groups');   // كان ./routes/groups
const matchesRoutes = require('./matches');  // كان ./routes/matches

/* ====== Health & Root ====== */
app.get('/', (req, res) => res.json({ ok: true, service: 'Rabta API' }));
app.get('/health', (req, res) => res.json({ ok: true }));

/* ====== Use routes ====== */
app.use('/auth',    authRoutes);
app.use('/admin',   adminRoutes);
app.use('/groups',  groupsRoutes);
app.use('/matches', matchesRoutes);

/* ====== 404 ====== */
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

/* ====== Error handler ====== */
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

/* ====== Listen ====== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));