const aiConfigService = require('../services/aiConfig.service')

/**
 * GET /system/ai-config — Retorna configuracao de IA (admin only, API key mascarada).
 */
async function getSettings(req, res) {
  try {
    const settings = await aiConfigService.getAll()
    return res.json(settings)
  } catch (err) {
    console.error('Erro ao buscar config de IA:', err.message)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * PUT /system/ai-config — Atualiza configuracao de IA (admin only).
 * Body: { provider?, model?, apiKey?, baseUrl? }
 */
async function updateSettings(req, res) {
  try {
    const { provider, model, apiKey, baseUrl } = req.body

    if (provider && !['openrouter', 'ollama'].includes(provider)) {
      return res.status(400).json({ message: 'Provider deve ser "openrouter" ou "ollama"' })
    }

    const updated = await aiConfigService.update({ provider, model, apiKey, baseUrl })
    return res.json(updated)
  } catch (err) {
    console.error('Erro ao atualizar config de IA:', err.message)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * GET /system/ai-config/internal — Retorna configuracao completa (para Python backend).
 */
async function getInternalConfig(req, res) {
  try {
    const settings = await aiConfigService.getAllInternal()
    return res.json(settings)
  } catch (err) {
    console.error('Erro ao buscar config interna de IA:', err.message)
    return res.status(500).json({ message: err.message })
  }
}

module.exports = { getSettings, updateSettings, getInternalConfig }
