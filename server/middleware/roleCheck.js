const Project = require('../models/Project');

/**
 * Middleware factory to check if user has the required role on a project.
 * @param  {...string} roles - Required roles ('admin', 'member')
 */
const checkProjectRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;
      
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required.' });
      }

      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found.' });
      }

      // Check if user is the owner (always has admin access)
      if (project.owner.toString() === req.user._id.toString()) {
        req.project = project;
        req.userRole = 'admin';
        return next();
      }

      // Check if user is a member
      const membership = project.members.find(
        m => m.user.toString() === req.user._id.toString()
      );

      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this project.' });
      }

      // Check if user has the required role
      if (roles.length > 0 && !roles.includes(membership.role)) {
        return res.status(403).json({ message: 'You do not have permission to perform this action.' });
      }

      req.project = project;
      req.userRole = membership.role;
      next();
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid project ID.' });
      }
      res.status(500).json({ message: 'Server error during authorization.' });
    }
  };
};

module.exports = checkProjectRole;
