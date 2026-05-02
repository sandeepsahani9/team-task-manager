const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Authenticate JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    next(error);
  }
};

/**
 * Authorize based on user role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Check if user is a member of the project (with optional role check)
 */
const projectAccess = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.projectId || req.params.id;
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID required' });
      }

      // Check if user is the project owner
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (project.ownerId === req.user.id) {
        req.projectRole = 'ADMIN';
        req.project = project;
        return next();
      }

      // Check team membership
      const member = await prisma.teamMember.findUnique({
        where: {
          userId_projectId: {
            userId: req.user.id,
            projectId: projectId
          }
        }
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this project' });
      }

      if (requiredRole === 'ADMIN' && member.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required for this project' });
      }

      req.projectRole = member.role;
      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, authorize, projectAccess };
