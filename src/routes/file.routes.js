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
 * POST /files/upload
 * Fazer upload de arquivo DXF
 * Requer autenticação
 */
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

/**
 * GET /files
 * Listar todos os arquivos com paginação
 * Query: ?page=1&limit=10
 */
router.get('/', authMiddleware, fileController.listAllFiles);

/**
 * GET /files/user/:userId
 * Listar arquivos de um usuário específico
 * Query: ?page=1&limit=10
 */
router.get('/user/:userId', authMiddleware, fileController.listFilesByUserId);

/**
 * GET /files/:id
 * Obter arquivo por ID
 */
router.get('/:id', authMiddleware, fileController.getFileById);

/**
 * DELETE /files/:id
 * Deletar arquivo por ID
 */
router.delete('/:id', authMiddleware, fileController.deleteFile);

/**
 * PATCH /files/:id/markdown
 * Adicionar conteúdo markdown a um arquivo
 */
router.patch('/:id/markdown', authMiddleware, fileController.addMarkdown);

module.exports = router;
