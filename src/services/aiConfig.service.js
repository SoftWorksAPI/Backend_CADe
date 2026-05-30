const SystemSetting = require('../models/aiConfig.model')
const pythonClient = require('./pythonClient.service')

const AI_KEYS = ['ai_provider', 'ai_model', 'ai_api_key', 'ai_base_url']

const DEFAULTS = {
  ai_provider: 'openrouter',
  ai_model: 'openai/gpt-oss-120b:free',
  ai_api_key: '',
  ai_base_url: 'https://openrouter.ai/api/v1/chat/completions',
}

async function _loadSettings() {
  const settings = await SystemSetting.findAll({ where: { key: AI_KEYS } })
  const map = {}
  for (const s of settings) map[s.key] = s.value
  for (const key of AI_KEYS) {
    if (!(key in map)) map[key] = DEFAULTS[key] || ''
  }
  return map
}

function _maskKey(key) {
  if (!key || key.length < 8) return key || ''
  return key.slice(0, 4) + '****' + key.slice(-4)
}

/**
 * Retorna config formatada para o admin (API key mascarada).
 */
async function getAll() {
  const map = await _loadSettings()
  return {
    provider: map.ai_provider,
    model: map.ai_model,
    apiKey: _maskKey(map.ai_api_key),
    baseUrl: map.ai_base_url,
  }
}

/**
 * Retorna config completa (para uso interno do Python).
 */
async function getAllInternal() {
  const map = await _loadSettings()
  return {
    provider: map.ai_provider,
    model: map.ai_model,
    apiKey: map.ai_api_key || '',
    baseUrl: map.ai_base_url,
  }
}

/**
 * Atualiza configuracoes de IA.
 * @param {object} settings - Formato camelCase: { provider, model, apiKey, baseUrl }
 */
async function update(settings) {
  const fieldMap = {
    provider: 'ai_provider',
    model: 'ai_model',
    apiKey: 'ai_api_key',
    baseUrl: 'ai_base_url',
  }

  for (const [camel, dbKey] of Object.entries(fieldMap)) {
    if (settings[camel] !== undefined && settings[camel] !== '') {
      await SystemSetting.upsert({
        key: dbKey,
        value: String(settings[camel]),
      })
    }
  }

  // Propagar para Python (fire-and-forget)
  const fullConfig = await getAllInternal()
  pythonClient.pushAIConfig(fullConfig).catch(() => {})

  return await getAll()
}

/**
 * Seed inicial.
 */
async function seedDefaults() {
  for (const key of AI_KEYS) {
    await SystemSetting.findOrCreate({
      where: { key },
      defaults: { key, value: DEFAULTS[key] || '' },
    })
  }
}

module.exports = { getAll, getAllInternal, update, seedDefaults }
