const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/dashboard - Get dashboard stats
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's projects
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { teamMembers: { some: { userId } } }
        ]
      },
      select: { id: true }
    });

    const projectIds = projects.map(p => p.id);

    // Task stats by status
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { status: true }
    });

    // Task stats by priority
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      where: { projectId: { in: projectIds } },
      _count: { priority: true }
    });

    // My tasks
    const myTasks = await prisma.task.count({
      where: { assigneeId: userId }
    });

    // Overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: new Date() },
        status: { not: 'DONE' }
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    // Recent tasks
    const recentTasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    // Total counts
    const totalProjects = projects.length;
    const totalTasks = await prisma.task.count({
      where: { projectId: { in: projectIds } }
    });
    const totalMembers = await prisma.teamMember.findMany({
      where: { projectId: { in: projectIds } },
      select: { userId: true },
      distinct: ['userId']
    });

    // Format status stats
    const statusStats = {
      todo: 0,
      inProgress: 0,
      inReview: 0,
      done: 0,
    };
    tasksByStatus.forEach(s => {
      switch (s.status) {
        case 'TODO': statusStats.todo = s._count.status; break;
        case 'IN_PROGRESS': statusStats.inProgress = s._count.status; break;
        case 'IN_REVIEW': statusStats.inReview = s._count.status; break;
        case 'DONE': statusStats.done = s._count.status; break;
      }
    });

    // Format priority stats
    const priorityStats = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    tasksByPriority.forEach(p => {
      switch (p.priority) {
        case 'LOW': priorityStats.low = p._count.priority; break;
        case 'MEDIUM': priorityStats.medium = p._count.priority; break;
        case 'HIGH': priorityStats.high = p._count.priority; break;
        case 'URGENT': priorityStats.urgent = p._count.priority; break;
      }
    });

    res.json({
      stats: {
        totalProjects,
        totalTasks,
        myTasks,
        totalMembers: totalMembers.length,
        overdue: overdueTasks.length,
      },
      statusStats,
      priorityStats,
      overdueTasks,
      recentTasks,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
