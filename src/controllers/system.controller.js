const pythonClient = require('../services/pythonClient.service')

/**
 * Verificar se a IA esta online.
 * - Admin: resposta completa (modelo, resposta da IA)
 * - Usuario comum: apenas { online: true/false }
 */
async function aiHealth(req, res) {
  try {
    const data = await pythonClient.aiHealth()

    if (!req.user.isAdmin) {
      return res.json({ online: data.status === 'online' })
    }

    return res.json(data)
  } catch (err) {
    console.error('Erro ao verificar AI health:', err)
    if (!req.user.isAdmin) {
      return res.json({ online: false })
    }
    return res.json({ status: 'erro_conexao', modelo: null, resposta: null, erro: err.message })
  }
}

/**
 * Verificar status do RAG (ChromaDB) — apenas admin
 */
async function ragHealth(req, res) {
  try {
    const data = await pythonClient.ragHealth()
    return res.json(data)
  } catch (err) {
    console.error('Erro ao verificar RAG health:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Sincronizar normas ativas para o ChromaDB — apenas admin
 */
async function ragSync(req, res) {
  try {
    const data = await pythonClient.ragSync()
    return res.json(data)
  } catch (err) {
    console.error('Erro ao sincronizar RAG:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * POST /system/ai/test — Testar conexao com o provider de IA (admin only)
 */
async function aiTest(req, res) {
  try {
    const response = await require('../services/pythonClient.service').aiTest()
    return res.json(response)
  } catch (err) {
    console.error('Erro ao testar conexao IA:', err.message)
    return res.json({ status: 'erro_conexao', erro: err.message })
  }
}

module.exports = {
  aiHealth,
  ragHealth,
  ragSync,
  aiTest,
}
