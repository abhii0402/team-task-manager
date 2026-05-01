const express = require('express');
const auth = require('../middleware/auth');
const { searchUsers } = require('../controllers/userController');

const router = express.Router();

router.use(auth);

router.get('/search', searchUsers);

module.exports = router;
