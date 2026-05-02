/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'A record with this value already exists',
      field: err.meta?.target?.[0]
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }

  // Validation errors
  if (err.type === 'validation') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors
    });
  }

  // Default
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error'
  });
};

module.exports = { errorHandler };
