const express = require('express');
const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth.middleware');
const { taskValidation, taskUpdateValidation } = require('../middleware/validation.middleware');

const router = express.Router();

// GET /api/tasks - Get all tasks for the user (across projects)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, projectId, assigneeId, search, sortBy, order } = req.query;

    const where = {
      project: {
        OR: [
          { ownerId: req.user.id },
          { teamMembers: { some: { userId: req.user.id } } }
        ]
      }
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const orderBy = {};
    if (sortBy) {
      orderBy[sortBy] = order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } }
      },
      orderBy
    });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create a new task
router.post('/', authenticate, taskValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;

    // Verify user has access to the project
    const projectAccess = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: req.user.id },
          { teamMembers: { some: { userId: req.user.id } } }
        ]
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ message: 'No access to this project' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        creatorId: req.user.id,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
      }
    });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticate, taskUpdateValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    // Verify task exists and user has access
    const existingTask = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true }
    });

    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await prisma.project.findFirst({
      where: {
        id: existingTask.projectId,
        OR: [
          { ownerId: req.user.id },
          { teamMembers: { some: { userId: req.user.id } } }
        ]
      }
    });

    if (!hasAccess) {
      return res.status(403).json({ message: 'No access to this task' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } }
      }
    });

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only project admin/owner or task creator can delete
    const isOwner = task.project.ownerId === req.user.id;
    const isCreator = task.creatorId === req.user.id;
    const isAdmin = await prisma.teamMember.findFirst({
      where: {
        userId: req.user.id,
        projectId: task.projectId,
        role: 'ADMIN'
      }
    });

    if (!isOwner && !isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only admins or task creator can delete tasks' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId: req.params.id,
        userId: req.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
