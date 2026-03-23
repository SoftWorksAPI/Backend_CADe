const router = require('express').Router()
const UserController = require('../controllers/user.controller')
const authMiddleware = require('../middlewares/auth.middleware')

router.post('/register', authMiddleware, UserController.register)
router.post('/login',    UserController.login)
router.patch('/update/:id', authMiddleware, UserController.updateUserById)
router.patch('/change-password', authMiddleware, UserController.changePassword)
router.delete('/delete/:userId',  authMiddleware, UserController.deleteById)
router.get('/list',      authMiddleware, UserController.listAll)
router.get('/me',        authMiddleware, UserController.me)
router.get('/:id',       authMiddleware, UserController.getById)

module.exports = router