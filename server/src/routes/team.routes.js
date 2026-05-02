const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, projectAccess } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/teams/:projectId/members - Add member to project
router.post('/:projectId/members', authenticate, projectAccess('ADMIN'), async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, avatar: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found. They must sign up first.' });
    }

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: req.params.projectId
        }
      }
    });

    if (existing) {
      return res.status(409).json({ message: 'User is already a team member' });
    }

    const member = await prisma.teamMember.create({
      data: {
        userId: user.id,
        projectId: req.params.projectId,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    res.status(201).json({ member });
  } catch (error) {
    next(error);
  }
});

// PUT /api/teams/:projectId/members/:memberId - Update member role
router.put('/:projectId/members/:memberId', authenticate, projectAccess('ADMIN'), async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ message: 'Valid role is required (ADMIN or MEMBER)' });
    }

    const member = await prisma.teamMember.update({
      where: { id: req.params.memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    res.json({ member });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:projectId/members/:memberId - Remove member from project
router.delete('/:projectId/members/:memberId', authenticate, projectAccess('ADMIN'), async (req, res, next) => {
  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: req.params.memberId }
    });

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Cannot remove project owner
    if (member.userId === req.project.ownerId) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }

    await prisma.teamMember.delete({ where: { id: req.params.memberId } });
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:projectId/members - Get project members
router.get('/:projectId/members', authenticate, projectAccess(), async (req, res, next) => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { projectId: req.params.projectId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { joinedAt: 'asc' }
    });

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
