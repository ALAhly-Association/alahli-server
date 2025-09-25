const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// دالة لإرجاع بيانات المستخدم بدون كلمة المرور
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

// تسجيل الدخول
// POST /auth/login
router.post('/login', async (req,res)=>{
  try{
    const { username, password } = req.body || {};
    if(!username || !password){
      return res.status(400).json({ error: 'username and password required' });
    }

    let user;
    // لو رئيس يستخدم username
    if(username === 'badrturkistani'){
      user = await prisma.user.findFirst({ where: { username } });
    } else {
      // الأعضاء والمشرفين بالعضوية
      user = await prisma.user.findFirst({ where: { membershipNumber: String(username) } });
    }

    if(!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(400).json({ error: 'Invalid credentials' });

    if(user.status === 'FROZEN'){
      return res.status(403).json({ error: 'Account is frozen' });
    }

    const token = jwt.sign(
      { id:user.id, role:user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: safeUser(user) });
  }catch(e){
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// تسجيل عضو جديد (Pending User)
router.post('/register', async (req,res)=>{
  try{
    const { fullName, phone, nid, membershipNumber, email, password } = req.body || {};
    if(!fullName || !phone || !nid || !membershipNumber || !email || !password){
      return res.status(400).json({ error: 'All fields required' });
    }

    const existsUser = await prisma.user.findFirst({ where: { membershipNumber: String(membershipNumber) } });
    if(existsUser) return res.status(400).json({ error: 'Membership number already used' });

    const hash = await bcrypt.hash(password, 10);

    const pending = await prisma.pendingUser.create({
      data: { fullName, phone, nid, membershipNumber: String(membershipNumber), email, passwordHash: hash }
    });

    res.json({ ok:true, pendingId: pending.id });
  }catch(e){
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const { auth, requireRole } = require('./middleware/jwt');
