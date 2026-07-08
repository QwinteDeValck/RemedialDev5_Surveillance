const { Router } = require('express');
const usersController = require('../controllers/users');

const router = Router();

router.post('/', async (req, res) => {
  const result = await usersController.createUser(req.body);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result);
});

router.get('/', async (req, res) => {
  const users = await usersController.getUsers();
  res.json(users);
});


module.exports = router;

