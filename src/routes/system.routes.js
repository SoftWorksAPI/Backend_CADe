const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/auth.middleware')
const internalAuthMiddleware = require('../middlewares/internalAuth.middleware')
const systemController = require('../controllers/system.controller')
const aiConfigController = require('../controllers/aiConfig.controller')

/**
 * Middleware que permite qualquer usuario autenticado
 */
function requireAuth(req, res, next) {
  authMiddleware(req, res, next)
}

/**
 * Middleware que exige admin
 */
function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Apenas administradores' })
  }
  next()
}

/**
 * @openapi
 * /system/ai/health:
 *   get:
 *     tags: [System]
 *     summary: Verificar se a IA esta online
 *     description: |
 *       - **Usuario comum**: retorna apenas `{ online: true/false }`.
 *       - **Admin**: retorna detalhes completos (modelo, resposta da IA).
 *     responses:
 *       200:
 *         description: Status da IA
 */
router.get('/ai/health', requireAuth, systemController.aiHealth)

/**
 * @openapi
 * /system/rag/health:
 *   get:
 *     tags: [System]
 *     summary: Status do RAG (ChromaDB)
 *     description: Retorna total de chunks e normas indexadas. Apenas admin.
 *     responses:
 *       200:
 *         description: Status do banco vetorial
 *       403:
 *         description: Acesso negado
 */
router.get('/rag/health', requireAuth, requireAdmin, systemController.ragHealth)

/**
 * @openapi
 * /system/rag/sync:
 *   post:
 *     tags: [System]
 *     summary: Sincronizar normas para o ChromaDB
 *     description: Baixa as normas ativas, extrai texto, gera embeddings e indexa. Apenas admin. Pode demorar ate 5 minutos.
 *     responses:
 *       200:
 *         description: Resultado da sincronizacao
 *       403:
 *         description: Acesso negado
 */
router.post('/rag/sync', requireAuth, requireAdmin, systemController.ragSync)

/**
 * @openapi
 * /system/ai-config:
 *   get:
 *     tags: [System]
 *     summary: Configuracao de IA (admin)
 *     description: Retorna a configuracao atual de IA (provider, modelo, etc). API key mascarada. Apenas admin.
 *     responses:
 *       200:
 *         description: Configuracao de IA
 *       403:
 *         description: Acesso negado
 *   put:
 *     tags: [System]
 *     summary: Atualizar configuracao de IA (admin)
 *     description: Atualiza provider, modelo, API key e base URL. Apenas admin.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [openrouter, ollama]
 *               model:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuracao atualizada
 *       400:
 *         description: Dados invalidos
 *       403:
 *         description: Acesso negado
 */
router.post('/ai/test', requireAuth, requireAdmin, systemController.aiTest)
router.post('/ai/test', requireAuth, requireAdmin, systemController.aiTest)
router.get('/ai-config', requireAuth, requireAdmin, aiConfigController.getSettings)
router.put('/ai-config', requireAuth, requireAdmin, aiConfigController.updateSettings)

/**
 * @openapi
 * /system/ai-config/internal:
 *   get:
 *     tags: [System]
 *     summary: Configuracao de IA (interno)
 *     description: Retorna configuracao completa de IA para uso interno do Python backend. Protegido por x-api-key.
 *     responses:
 *       200:
 *         description: Configuracao completa
 *       403:
 *         description: Acesso negado
 */
router.get('/ai-config/internal', internalAuthMiddleware, aiConfigController.getInternalConfig)

module.exports = router
