const router = require('express').Router()
const UserController = require('../controllers/user.controller')
const authMiddleware = require('../middlewares/auth.middleware')

router.post('/register', authMiddleware, UserController.register)
router.post('/login',    UserController.login)
router.post('/promote',  authMiddleware, UserController.promoteAdmin)
router.get('/me',        authMiddleware, UserController.me)

module.exports = router