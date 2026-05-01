const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const checkProjectRole = require('../middleware/roleCheck');
const {
  getProjectTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getDashboardStats
} = require('../controllers/taskController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Dashboard stats (must be before /:id routes)
router.get('/dashboard/stats', getDashboardStats);

// Project-scoped task routes
router.get('/project/:projectId', checkProjectRole('admin', 'member'), getProjectTasks);

router.post('/project/:projectId', checkProjectRole('admin', 'member'), [
  body('title').trim().notEmpty().withMessage('Task title is required.')
], createTask);

// Single task routes
router.get('/:id', getTask);

router.put('/:id', [
  body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty.'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Invalid status.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.')
], updateTask);

router.delete('/:id', deleteTask);

module.exports = router;
