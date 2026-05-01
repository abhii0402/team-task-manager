const Task = require('../models/Task');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// @desc    Get tasks for a project
// @route   GET /api/projects/:projectId/tasks
exports.getProjectTasks = async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    const filter = { project: req.params.projectId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create task
// @route   POST /api/projects/:projectId/tasks
exports.createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, assignee, priority, dueDate, status } = req.body;

    // If assignee is provided, verify they are a project member
    if (assignee) {
      const project = await Project.findById(req.params.projectId);
      const isMember = project.members.some(
        m => m.user.toString() === assignee
      );
      if (!isMember) {
        return res.status(400).json({ message: 'Assignee must be a project member.' });
      }
    }

    const task = await Task.create({
      title,
      description,
      project: req.params.projectId,
      assignee: assignee || null,
      creator: req.user._id,
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate: dueDate || null
    });

    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('creator', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('creator', 'name email')
      .populate('project', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Check if user is a member of the project
    const project = await Project.findById(task.project._id || task.project);
    const isMember = project.owner.toString() === req.user._id.toString() ||
      project.members.some(m => m.user.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(task);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Check project membership
    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const membership = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !membership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const userRole = isOwner ? 'admin' : membership.role;

    // Members can only update status; admins can update everything
    const { title, description, assignee, priority, dueDate, status } = req.body;

    if (userRole === 'member') {
      // Members can only update status
      if (status) task.status = status;
    } else {
      // Admins can update everything
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (assignee !== undefined) task.assignee = assignee || null;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate || null;
      if (status) task.status = status;
    }

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Check admin role on project
    const project = await Project.findById(task.project);
    const isOwner = project.owner.toString() === req.user._id.toString();
    const membership = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );
    const userRole = isOwner ? 'admin' : (membership ? membership.role : null);

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete tasks.' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get dashboard stats for current user
// @route   GET /api/tasks/dashboard/stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Get all projects the user belongs to
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });

    const projectIds = projects.map(p => p._id);

    // Get all tasks for these projects
    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate('assignee', 'name email')
      .populate('creator', 'name email')
      .populate('project', 'name');

    const now = new Date();
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
      ).length,
      myTasks: tasks.filter(t => 
        t.assignee && t.assignee._id.toString() === req.user._id.toString()
      ).length
    };

    // Get recent tasks (last 10)
    const recentTasks = tasks
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10);

    // Get overdue tasks
    const overdueTasks = tasks
      .filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      stats,
      recentTasks,
      overdueTasks,
      projects: projects.map(p => ({ _id: p._id, name: p.name }))
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
