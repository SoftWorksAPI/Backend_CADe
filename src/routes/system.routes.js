const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/auth.middleware')
const systemController = require('../controllers/system.controller')

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

module.exports = router
