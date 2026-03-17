const router = require('express').Router()
const userController = require('../controllers/user.controller')
const authMiddleware = require('../middlewares/auth.middleware')

router.post('/register', userController.register)
router.post('/login',    userController.login)
router.get('/me',        authMiddleware, userController.me)

module.exports = router