const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all projects for current user
// @route   GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ updatedAt: -1 });

    // Add task counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskCounts = await Task.aggregate([
          { $match: { project: project._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const counts = { todo: 0, 'in-progress': 0, done: 0, total: 0 };
        taskCounts.forEach(tc => {
          counts[tc._id] = tc.count;
          counts.total += tc.count;
        });

        return { ...project.toObject(), taskCounts: counts };
      })
    );

    res.json(projectsWithCounts);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Check membership
    const isMember = project.owner._id.toString() === req.user._id.toString() ||
      project.members.some(m => m.user._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this project.' });
    }

    // Get task counts
    const taskCounts = await Task.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = { todo: 0, 'in-progress': 0, done: 0, total: 0 };
    taskCounts.forEach(tc => {
      counts[tc._id] = tc.count;
      counts.total += tc.count;
    });

    // Determine user role
    let userRole = 'member';
    if (project.owner._id.toString() === req.user._id.toString()) {
      userRole = 'admin';
    } else {
      const membership = project.members.find(
        m => m.user._id.toString() === req.user._id.toString()
      );
      if (membership) userRole = membership.role;
    }

    res.json({ ...project.toObject(), taskCounts: counts, userRole });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid project ID.' });
    }
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, description } = req.body;

    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.status(201).json({
      ...populated.toObject(),
      taskCounts: { todo: 0, 'in-progress': 0, done: 0, total: 0 }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, description } = req.body;
    const project = req.project;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.json(populated);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    // Delete all tasks in the project
    await Task.deleteMany({ project: req.project._id });

    // Delete the project
    await Project.findByIdAndDelete(req.project._id);

    res.json({ message: 'Project and all associated tasks deleted.' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
exports.addMember = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, role = 'member' } = req.body;
    const project = req.project;

    // Find user by email
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'No user found with this email.' });
    }

    // Check if already a member
    const alreadyMember = project.members.some(
      m => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this project.' });
    }

    project.members.push({ user: userToAdd._id, role });
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.json(populated);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
exports.removeMember = async (req, res) => {
  try {
    const project = req.project;
    const userIdToRemove = req.params.userId;

    // Cannot remove the owner
    if (project.owner.toString() === userIdToRemove) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }

    // Check if user is a member
    const memberIndex = project.members.findIndex(
      m => m.user.toString() === userIdToRemove
    );
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'User is not a member of this project.' });
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    // Unassign any tasks assigned to removed member
    await Task.updateMany(
      { project: project._id, assignee: userIdToRemove },
      { assignee: null }
    );

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.json(populated);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
