const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/auth.middleware')
const chatController = require('../controllers/chat.controller')

/**
 * @openapi
 * /chat:
 *   post:
 *     tags: [Chat]
 *     summary: Chat IA sobre projeto
 *     description: Envia uma pergunta sobre um projeto processado e recebe uma resposta da IA com contexto do projeto e normas tecnicas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileId, pergunta]
 *             properties:
 *               fileId:
 *                 type: integer
 *                 description: ID do arquivo processado
 *               pergunta:
 *                 type: string
 *                 description: Pergunta do usuario
 *               historico:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                     content:
 *                       type: string
 *                 description: Historico de mensagens anteriores
 *     responses:
 *       200:
 *         description: Resposta da IA
 *       400:
 *         description: fileId ou pergunta nao informados
 *       404:
 *         description: Projeto nao encontrado ou nao processado
 */
router.post('/', authMiddleware, chatController.sendMessage)

module.exports = router
