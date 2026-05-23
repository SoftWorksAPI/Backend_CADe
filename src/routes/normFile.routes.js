const express = require('express')
const multer = require('multer')
const normFileController = require('../controllers/normFile.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
})

/**
 * @openapi
 * components:
 *   schemas:
 *     NormFile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         originalName:
 *           type: string
 *         filename:
 *           type: string
 *         filePath:
 *           type: string
 *         fileSize:
 *           type: integer
 *         fileType:
 *           type: string
 *         userId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /norm-files/upload:
 *   post:
 *     tags: [NormFiles]
 *     summary: Upload de arquivo de norma
 *     description: Fazer upload de arquivo de norma (PDF, DOCX, DOC)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, title, category]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Arquivo de norma enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 normFile:
 *                   $ref: '#/components/schemas/NormFile'
 *       400:
 *         description: Dados inválidos ou arquivo inválido
 */
router.post('/upload', authMiddleware, upload.single('file'), normFileController.uploadNormFile)

/**
 * @openapi
 * /norm-files:
 *   get:
 *     tags: [NormFiles]
 *     summary: Listar todas as normas
 *     description: Listar todas as normas com paginação e filtro por categoria
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria (ex: NBR, ASTM)
 *     responses:
 *       200:
 *         description: Lista de normas
 */
router.get('/', authMiddleware, normFileController.listAllNormFiles)

/**
 * @openapi
 * /norm-files/user/{userId}:
 *   get:
 *     tags: [NormFiles]
 *     summary: Listar normas de um usuário
 *     description: Listar normas de um usuário específico com paginação
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
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
 *         description: Lista de normas do usuário
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/user/:userId', authMiddleware, normFileController.listNormFilesByUserId)

/**
 * @openapi
 * /norm-files/{id}:
 *   get:
 *     tags: [NormFiles]
 *     summary: Obter norma por ID
 *     description: Obter detalhes de uma norma específica
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes da norma
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NormFile'
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Arquivo não encontrado
 */
router.get('/:id', authMiddleware, normFileController.getNormFileById)

/**
 * @openapi
 * /norm-files/{id}:
 *   delete:
 *     tags: [NormFiles]
 *     summary: Deletar norma por ID
 *     description: Deletar uma norma específica
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Norma deletada com sucesso
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Arquivo não encontrado
 */
router.delete('/:id', authMiddleware, normFileController.deleteNormFile)

module.exports = router
