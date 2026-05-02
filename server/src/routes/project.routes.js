const express = require('express');
const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, projectAccess } = require('../middleware/auth.middleware');
const { projectValidation } = require('../middleware/validation.middleware');

const router = express.Router();

// GET /api/projects - Get all projects for the user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { teamMembers: { some: { userId: req.user.id } } }
        ]
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        _count: { select: { tasks: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Add task stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await prisma.task.groupBy({
          by: ['status'],
          where: { projectId: project.id },
          _count: { status: true }
        });

        const stats = {
          total: 0,
          todo: 0,
          inProgress: 0,
          inReview: 0,
          done: 0,
        };

        taskStats.forEach(s => {
          stats.total += s._count.status;
          switch (s.status) {
            case 'TODO': stats.todo = s._count.status; break;
            case 'IN_PROGRESS': stats.inProgress = s._count.status; break;
            case 'IN_REVIEW': stats.inReview = s._count.status; break;
            case 'DONE': stats.done = s._count.status; break;
          }
        });

        return { ...project, taskStats: stats };
      })
    );

    res.json({ projects: projectsWithStats });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', authenticate, projectAccess(), async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            _count: { select: { comments: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.json({ project, userRole: req.projectRole });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create a new project
router.post('/', authenticate, projectValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, description, color } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        color: color || '#6366f1',
        ownerId: req.user.id,
        teamMembers: {
          create: {
            userId: req.user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        }
      }
    });

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authenticate, projectAccess('ADMIN'), projectValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, description, color } = req.body;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description, color },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        }
      }
    });

    res.json({ project });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticate, projectAccess('ADMIN'), async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
