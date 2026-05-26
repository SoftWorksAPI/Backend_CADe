const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/auth.middleware')
const processingController = require('../controllers/processing.controller')

/**
 * @openapi
 * /processing/{fileId}/process:
 *   post:
 *     tags: [Processing]
 *     summary: Processar arquivo DXF via pipeline Python
 *     description: Envia o DXF para o backend Python que extrai dados, gera memorial descritivo com IA, e retorna relatorios MD+PDF. O relatorio e salvo automaticamente no banco de dados.
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do arquivo DXF
 *     responses:
 *       200:
 *         description: Arquivo processado com sucesso
 *       404:
 *         description: Arquivo nao encontrado
 */
router.post('/:fileId/process', authMiddleware, processingController.processFile)

/**
 * @openapi
 * /processing/{fileId}/relatorio/pdf:
 *   post:
 *     tags: [Processing]
 *     summary: Gerar relatorio PDF
 *     description: Gera um relatorio PDF a partir do memorial descritivo ja existente no banco de dados. Requer que o arquivo tenha sido processado antes.
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do arquivo DXF
 *       - in: query
 *         name: timeout
 *         required: false
 *         schema:
 *           type: integer
 *         description: Timeout em milissegundos (padrao 180000 = 3min)
 *     responses:
 *       200:
 *         description: PDF gerado com sucesso (binary)
 *       404:
 *         description: Arquivo ou relatorio nao encontrado
 */
router.post('/:fileId/relatorio/pdf', authMiddleware, processingController.generatePdfReport)

/**
 * @openapi
 * /processing/{fileId}/relatorio/markdown:
 *   post:
 *     tags: [Processing]
 *     summary: Gerar relatorio Markdown
 *     description: Gera um relatorio Markdown a partir do memorial descritivo ja existente no banco de dados. Requer que o arquivo tenha sido processado antes.
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do arquivo DXF
 *       - in: query
 *         name: timeout
 *         required: false
 *         schema:
 *           type: integer
 *         description: Timeout em milissegundos (padrao 180000 = 3min)
 *     responses:
 *       200:
 *         description: Markdown gerado com sucesso (text)
 *       404:
 *         description: Arquivo ou relatorio nao encontrado
 */
router.post('/:fileId/relatorio/markdown', authMiddleware, processingController.generateMarkdownReport)

/**
 * @openapi
 * /processing/{fileId}/relatorio/xlsx:
 *   post:
 *     tags: [Processing]
 *     summary: Gerar relatorio XLSX
 *     description: Gera um relatorio XLSX (memorial descritivo) a partir do memorial descritivo ja existente no banco de dados. Requer que o arquivo tenha sido processado antes.
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do arquivo DXF
 *       - in: query
 *         name: timeout
 *         required: false
 *         schema:
 *           type: integer
 *         description: Timeout em milissegundos (padrao 180000 = 3min)
 *     responses:
 *       200:
 *         description: XLSX gerado com sucesso (binary)
 *       404:
 *         description: Arquivo ou relatorio nao encontrado
 */
router.post('/:fileId/relatorio/xlsx', authMiddleware, processingController.generateXlsxReport)

module.exports = router
