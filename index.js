require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');      // ✅ تعريف واحد
const adminRoutes = require('./routes/admin');    // ✅ تعريف واحد

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, service: 'Rabta API' }));

app.use('/auth', authRoutes);     // ✅ استدعاء واحد
app.use('/admin', adminRoutes);   // ✅ استدعاء واحد

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));

const groupsRoutes = require('./routes/groups');

app.use('/groups', groupsRoutes);

const matchesRoutes = require('./routes/matches');
app.use('/matches', matchesRoutes);

