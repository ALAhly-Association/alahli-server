const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// دالة تُرجع بيانات آمنة بدون كلمة المرور
function safeUser(u){
  return {
    id: u.id,
    username: u.username,
    membershipNumber: u.membershipNumber,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    points: u.points,
    groupId: u.groupId
  };
}

// GET /admin/pending  — عرض كل الطلبات المعلقة
router.get('/pending', async (req,res)=>{
  try {
    const pendings = await prisma.pendingUser.findMany({ orderBy: { createdAt: 'desc' }});
    res.json(pendings);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/approve/:id  { role: "MEMBER" | "SUPERVISOR" } — الموافقة وتحويله مستخدم
router.post('/approve/:id', async (req,res)=>{
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body || {};
    const FINAL_ROLE = (String(role||'').toUpperCase() === 'SUPERVISOR') ? 'SUPERVISOR' : 'MEMBER';

    const pending = await prisma.pendingUser.findUnique({ where: { id } });
    if(!pending) return res.status(404).json({ error: 'Not found' });

    // تأكد عدم وجود مستخدم بنفس رقم العضوية
    const exists = await prisma.user.findFirst({ where: { membershipNumber: pending.membershipNumber } });
    if(exists) return res.status(400).json({ error: 'Membership already used' });

    const user = await prisma.user.create({
      data: {
        membershipNumber: pending.membershipNumber,
        fullName: pending.fullName,
        email: pending.email,
        phone: pending.phone,
        nid: pending.nid,
        passwordHash: pending.passwordHash,
        role: FINAL_ROLE,
        status: 'ACTIVE'
      }
    });

    await prisma.pendingUser.delete({ where: { id } });

    res.json({ ok:true, user: safeUser(user) });
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /admin/reject/:id — حذف الطلب
router.delete('/reject/:id', async (req,res)=>{
  try {
    const id = parseInt(req.params.id);
    await prisma.pendingUser.delete({ where: { id } });
    res.json({ ok:true });
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const { auth, requireRole } = require('./middleware/jwt');
