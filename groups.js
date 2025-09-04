const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth, requireRole } = require('../middleware/jwt');

// ===== الرئيس: إنشاء مجموعة =====
router.post('/create', requireAuth, requireRole('PRESIDENT'), async (req,res)=>{
  try{
    const { name } = req.body || {};
    if(!name) return res.status(400).json({ error: 'name required' });
    const exists = await prisma.group.findUnique({ where: { name } });
    if(exists) return res.status(400).json({ error: 'Group name exists' });
    const g = await prisma.group.create({ data: { name } });
    res.json({ ok:true, group: g });
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== الرئيس: تعيين مشرف للمجموعة =====
router.post('/:groupId/assign-supervisor', requireAuth, requireRole('PRESIDENT'), async (req,res)=>{
  try{
    const groupId = +req.params.groupId;
    const { supervisorId } = req.body || {};
    const g = await prisma.group.findUnique({ where: { id: groupId } });
    if(!g) return res.status(404).json({ error: 'Group not found' });

    const sup = await prisma.user.findUnique({ where: { id: Number(supervisorId) } });
    if(!sup || sup.role !== 'SUPERVISOR') return res.status(400).json({ error: 'User is not supervisor' });

    const updated = await prisma.group.update({ where: { id: groupId }, data: { supervisorId: sup.id } });
    res.json({ ok:true, group: updated });
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== الرئيس: حذف مجموعة (يفك ربط الأعضاء) =====
router.delete('/:groupId', requireAuth, requireRole('PRESIDENT'), async (req,res)=>{
  try{
    const groupId = +req.params.groupId;
    const g = await prisma.group.findUnique({ where: { id: groupId } });
    if(!g) return res.status(404).json({ error: 'Group not found' });

    await prisma.user.updateMany({ where: { groupId }, data: { groupId: null } });
    await prisma.group.delete({ where: { id: groupId } });
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== عام: قائمة المجموعات مع المشرف والأعضاء =====
router.get('/list', requireAuth, async (req,res)=>{
  try{
    const groups = await prisma.group.findMany({
      include: {
        supervisor: { select: { id:true, fullName:true, membershipNumber:true }},
        members: { select: { id:true, fullName:true, membershipNumber:true, role:true }}
      },
      orderBy: { id: 'asc' }
    });
    res.json(groups);
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== المشرف: معلومات مجموعتي =====
router.get('/my', requireAuth, requireRole('SUPERVISOR'), async (req,res)=>{
  try{
    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    const g = await prisma.group.findFirst({
      where: { supervisorId: me.id },
      include: { members: { select: { id:true, fullName:true, membershipNumber:true, role:true, groupId:true }}}
    });
    if(!g) return res.json(null);
    res.json(g);
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== المشرف: إضافة عضو لمجموعتي برقم العضوية =====
router.post('/my/add-member', requireAuth, requireRole('SUPERVISOR'), async (req,res)=>{
  try{
    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    const g = await prisma.group.findFirst({ where: { supervisorId: me.id } });
    if(!g) return res.status(400).json({ error: 'No group assigned to you' });

    const { membershipNumber } = req.body || {};
    if(!membershipNumber) return res.status(400).json({ error: 'membershipNumber required' });

    const member = await prisma.user.findFirst({ where: { membershipNumber: String(membershipNumber) } });
    if(!member) return res.status(404).json({ error: 'Member not found' });
    if(member.role === 'SUPERVISOR') return res.status(400).json({ error: 'Cannot add a supervisor as member' });
    if(member.id === me.id) return res.status(400).json({ error: 'Cannot add yourself' });
    if(member.groupId) return res.status(400).json({ error: 'Member already in group' });

    const updated = await prisma.user.update({ where: { id: member.id }, data: { groupId: g.id }});
    res.json({ ok:true, memberId: updated.id, groupId: g.id });
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===== الرئيس: إضافة عضو لمجموعة محددة =====
router.post('/:groupId/add-member', requireAuth, requireRole('PRESIDENT'), async (req,res)=>{
  try{
    const groupId = +req.params.groupId;
    const { membershipNumber } = req.body || {};
    const g = await prisma.group.findUnique({ where: { id: groupId } });
    if(!g) return res.status(404).json({ error: 'Group not found' });

    const member = await prisma.user.findFirst({ where: { membershipNumber: String(membershipNumber) } });
    if(!member) return res.status(404).json({ error: 'Member not found' });
    if(member.role === 'SUPERVISOR') return res.status(400).json({ error: 'Cannot add a supervisor as member' });
    if(member.groupId) return res.status(400).json({ error: 'Member already in a group' });

    await prisma.user.update({ where: { id: member.id }, data: { groupId }});
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
