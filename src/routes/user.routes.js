const router = require('express').Router()
const userController = require('../controllers/user.controller')
const authMiddleware = require('../middlewares/auth.middleware')

router.post('/register', authMiddleware, userController.register)
router.post('/login',    userController.login)
router.post('/promote',  authMiddleware, userController.promoteAdmin)
router.get('/me',        authMiddleware, userController.me)

module.exports = router