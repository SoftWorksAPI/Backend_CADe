const express = require('express');
const multer = require('multer');
const fileController = require('../controllers/file.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Configurar multer para arquivo em memória
const upload = multer({
  storage: multer.memoryStorage(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         originalName:
 *           type: string
 *         filename:
 *           type: string
 *         filePath:
 *           type: string
 *         fileSize:
 *           type: integer
 *         userId:
 *           type: integer
 *         description:
 *           type: string
 *         markdownContent:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /files/upload:
 *   post:
 *     tags: [Files]
 *     summary: Upload de arquivo DXF
 *     description: Fazer upload de arquivo DXF
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Arquivo enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: Arquivo inválido
 */
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

// PATCH /files/:id/title — Atualizar titulo do projeto
router.patch('/:id/title', authMiddleware, fileController.updateFileTitle);

// PATCH /files/:id/replace — Substituir arquivo DXF de um projeto existente
router.patch('/:id/replace', authMiddleware, upload.single('file'), fileController.replaceFile);

/**
 * @openapi
 * /files:
 *   get:
 *     tags: [Files]
 *     summary: Listar todos os arquivos
 *     description: Listar todos os arquivos com paginação
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
 *         description: Lista de arquivos
 */
router.get('/', authMiddleware, fileController.listAllFiles);

/**
 * @openapi
 * /files/user/{userId}:
 *   get:
 *     tags: [Files]
 *     summary: Listar arquivos de um usuário
 *     description: Listar arquivos de um usuário específico com paginação
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
 *         description: Lista de arquivos do usuário
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/user/:userId', authMiddleware, fileController.listFilesByUserId);

/**
 * @openapi
 * /files/{id}:
 *   get:
 *     tags: [Files]
 *     summary: Obter arquivo por ID
 *     description: Obter detalhes de um arquivo específico
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes do arquivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Arquivo não encontrado
 */
router.get('/:id', authMiddleware, fileController.getFileById);

/**
 * @openapi
 * /files/{id}:
 *   delete:
 *     tags: [Files]
 *     summary: Deletar arquivo por ID
 *     description: Deletar um arquivo específico
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Arquivo deletado com sucesso
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Arquivo não encontrado
 */
router.delete('/:id', authMiddleware, fileController.deleteFile);

/**
 * @openapi
 * /files/{id}/markdown:
 *   patch:
 *     tags: [Files]
 *     summary: Adicionar conteúdo markdown
 *     description: Adicionar conteúdo markdown a um arquivo
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
 *             required: [markdownContent]
 *             properties:
 *               markdownContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Markdown adicionado com sucesso
 *       400:
 *         description: Conteúdo markdown obrigatório
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Arquivo não encontrado
 */
router.patch('/:id/markdown', authMiddleware, fileController.addMarkdown);

module.exports = router;
