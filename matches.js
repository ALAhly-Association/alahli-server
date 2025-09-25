const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth, requireRole } = require('../middleware/jwt');

/**
 * الرئيس: إنشاء مباراة
 * body: { title, type: "FOOTBALL"|"OTHER"|"TIFO", dateISO, location, points }
 */
router.post('/create', requireAuth, requireRole('PRESIDENT'), async (req, res) => {
  try {
    const { title, type, dateISO, location, points } = req.body || {};
    if (!title || !type || !dateISO || !location) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const match = await prisma.match.create({
      data: {
        title,
        type,
        date: new Date(dateISO),
        location,
        points: Number(points || 0)
      }
    });
    res.json({ ok: true, match });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** عام: قائمة المباريات */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const list = await prisma.match.findMany({ orderBy: { date: 'desc' } });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** الرئيس: قفل/فتح المباراة */
router.post('/:matchId/lock', requireAuth, requireRole('PRESIDENT'), async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const { locked } = req.body || {};
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { locked: !!locked }
    });
    res.json({ ok: true, match: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** الرئيس: حذف مباراة (يحذف أيضًا سجلات الحضور التابعة) */
router.delete('/:matchId', requireAuth, requireRole('PRESIDENT'), async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    await prisma.attendance.deleteMany({ where: { matchId } });
    await prisma.match.delete({ where: { id: matchId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * المشرف/الرئيس: تحضير يدوي (PRESENT/ABSENT/EXCUSED)
 * body: { membershipNumber, status }
 * ملاحظة: النقاط تُدار بدون تكرار (إضافة/سحب عند تغيير الحالة).
 */
router.post('/:matchId/attend', requireAuth, requireRole('PRESIDENT', 'SUPERVISOR'), async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const { membershipNumber, status } = req.body || {};
    if (!membershipNumber || !status) {
      return res.status(400).json({ error: 'membershipNumber and status required' });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.locked) return res.status(400).json({ error: 'Match is locked' });

    const member = await prisma.user.findFirst({ where: { membershipNumber: String(membershipNumber) } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.status === 'FROZEN') return res.status(403).json({ error: 'Account is frozen' });

    // الحالة السابقة إن وجدت
    const prev = await prisma.attendance.findUnique({
      where: { matchId_userId: { matchId, userId: member.id } }
    });

    // إنشاء/تحديث حضور
    const att = await prisma.attendance.upsert({
      where: { matchId_userId: { matchId, userId: member.id } },
      create: { matchId, userId: member.id, status },
      update: { status }
    });

    // إدارة النقاط حسب التغيير
    if (prev?.status === 'PRESENT' && status !== 'PRESENT') {
      await prisma.user.update({
        where: { id: member.id },
        data: { points: { decrement: match.points } }
      });
    } else if ((prev?.status ?? 'NONE') !== 'PRESENT' && status === 'PRESENT') {
      await prisma.user.update({
        where: { id: member.id },
        data: { points: { increment: match.points } }
      });
    }

    // تجميد بعد 3 غيابات في مباريات كرة القدم فقط
    if (match.type === 'FOOTBALL') {
      const absents = await prisma.attendance.count({
        where: { userId: member.id, status: 'ABSENT', match: { type: 'FOOTBALL' } }
      });
      if (absents >= 3) {
        await prisma.user.update({ where: { id: member.id }, data: { status: 'FROZEN' } });
      }
    }

    res.json({ ok: true, attendance: att });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** إحصائيات مباراة + أرقام العضويات لكل حالة */
router.get('/:matchId/stats', requireAuth, async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const [present, absent, excused] = await Promise.all([
      prisma.attendance.findMany({ where: { matchId, status: 'PRESENT' }, include: { user: true } }),
      prisma.attendance.findMany({ where: { matchId, status: 'ABSENT' }, include: { user: true } }),
      prisma.attendance.findMany({ where: { matchId, status: 'EXCUSED' }, include: { user: true } })
    ]);

    res.json({
      match,
      counts: {
        present: present.length,
        absent: absent.length,
        excused: excused.length
      },
      membershipNumbers: {
        present: present.map(a => a.user.membershipNumber),
        absent: absent.map(a => a.user.membershipNumber),
        excused: excused.map(a => a.user.membershipNumber)
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const { auth, requireRole } = require('./middleware/jwt');
