const express = require('express')
const userController = require('../controllers/user.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const router = express.Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         isAdmin:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /users/login:
 *   post:
 *     tags: [Users]
 *     summary: Autenticar usuário
 *     description: Autenticar usuário e receber JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT retornado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', userController.login)

/**
 * @openapi
 * /users/register:
 *   post:
 *     tags: [Users]
 *     summary: Criar novo usuário
 *     description: Criar novo usuário (apenas admins)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado
 */
router.post('/register', authMiddleware, userController.register)

/**
 * @openapi
 * /users/update/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Atualizar usuário por ID
 *     description: Atualizar dados de um usuário (admin ou próprio usuário)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado
 */
router.patch('/update/:id', authMiddleware, userController.updateUserById)

/**
 * @openapi
 * /users/change-password:
 *   patch:
 *     tags: [Users]
 *     summary: Alterar senha
 *     description: Alterar senha de um usuário (admin ou próprio usuário)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, newPassword, oldPassword]
 *             properties:
 *               id:
 *                 type: integer
 *               newPassword:
 *                 type: string
 *               oldPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado
 */
router.patch('/change-password', authMiddleware, userController.changePassword)

/**
 * @openapi
 * /users/delete/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Deletar usuário por ID
 *     description: Deletar usuário (apenas admins)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 *       400:
 *         description: Erro na requisição
 *       403:
 *         description: Acesso negado
 */
router.delete('/delete/:userId', authMiddleware, userController.deleteById)

/**
 * @openapi
 * /users/list:
 *   get:
 *     tags: [Users]
 *     summary: Listar todos os usuários
 *     description: Listar todos os usuários com paginação (apenas admins)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       403:
 *         description: Acesso negado
 */
router.get('/list', authMiddleware, userController.listAll)

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Obter perfil do usuário logado
 *     description: Retorna os dados do usuário autenticado
 *     responses:
 *       200:
 *         description: Dados do usuário logado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/me', authMiddleware, userController.me)

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obter usuário por ID
 *     description: Obter dados de um usuário (admin ou próprio usuário)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', authMiddleware, userController.getById)

module.exports = router
