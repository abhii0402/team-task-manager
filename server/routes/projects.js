const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const checkProjectRole = require('../middleware/roleCheck');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} = require('../controllers/projectController');

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get('/', getProjects);

router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required.')
], createProject);

router.get('/:id', getProject);

router.put('/:id', checkProjectRole('admin'), [
  body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty.')
], updateProject);

router.delete('/:id', checkProjectRole('admin'), deleteProject);

// Member management
router.post('/:id/members', checkProjectRole('admin'), [
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member.')
], addMember);

router.delete('/:id/members/:userId', checkProjectRole('admin'), removeMember);

module.exports = router;
