const express = require('express')
const router = express.Router()
const multer = require('multer')
const authMiddleware = require('../middlewares/auth.middleware')
const authOrApiKeyMiddleware = require('../middlewares/authOrApiKey.middleware')
const reportController = require('../controllers/report.controller')

const upload = multer({ storage: multer.memoryStorage() })

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Reports]
 *     summary: Criar relatorio
 *     description: |
 *       Cria um relatorio. Aceita dois formatos:
 *       - **application/json**: para chamadas internas (Python backend via API key) ou criacao sem upload.
 *       - **multipart/form-data**: para upload manual de arquivo (usuario/admin via JWT).
 *       fileId e obrigatorio em ambos os formatos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileId]
 *             properties:
 *               title:
 *                 type: string
 *               fileId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               filePath:
 *                 type: string
 *               fileType:
 *                 type: string
 *               review:
 *                 type: string
 *               confianca:
 *                 type: string
 *               numInconsistencias:
 *                 type: integer
 *               status:
 *                 type: string
 *               tentativasRevisao:
 *                 type: integer
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, title, fileId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo do relatorio (qualquer formato)
 *               title:
 *                 type: string
 *                 description: Nome do relatorio
 *               fileId:
 *                 type: integer
 *                 description: ID do arquivo DXF ao qual o relatorio pertence
 *     responses:
 *       201:
 *         description: Relatorio criado com sucesso
 *       400:
 *         description: Dados obrigatorios faltando
 *       403:
 *         description: Acesso negado
 */
router.post('/', authOrApiKeyMiddleware, upload.single('file'), reportController.createReport)

/**
 * @openapi
 * /reports:
 *   get:
 *     tags: [Reports]
 *     summary: Listar relatorios
 *     description: Lista relatorios do usuario logado (ou todos se admin). Filtra por fileId opcional.
 *     parameters:
 *       - in: query
 *         name: fileId
 *         schema:
 *           type: integer
 *         description: Filtrar por arquivo DXF
 *     responses:
 *       200:
 *         description: Lista de relatorios
 */
router.get('/', authMiddleware, reportController.listReports)

/**
 * @openapi
 * /reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Buscar relatorio por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes do relatorio
 *       404:
 *         description: Relatorio nao encontrado
 *       403:
 *         description: Permissao negada
 */
router.get('/:id', authMiddleware, reportController.getReportById)

/**
 * @openapi
 * /reports/{id}:
 *   delete:
 *     tags: [Reports]
 *     summary: Deletar relatorio
 *     description: Deleta um relatorio (admin ou dono)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Relatorio deletado
 *       404:
 *         description: Relatorio nao encontrado
 *       403:
 *         description: Permissao negada
 */
router.delete('/:id', authMiddleware, reportController.deleteReport)

module.exports = router
