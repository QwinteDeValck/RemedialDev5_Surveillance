const { Router } = require('express');
const authController = require('../controllers/auth');

const router = Router();

router.post('/login', async (req, res) => {
  const result = await authController.login(req.body);
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.json(result);
});

module.exports = router;
