const axios = require('axios')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'cade-internal-key-2026'

/**
 * Chamar o pipeline completo de processamento DXF no Python
 * @param {string} filePath - Caminho do arquivo DXF no disco
 * @param {string} fileName - Nome original do arquivo
 * @param {number|null} fileId - ID do arquivo no banco Node.js
 * @returns {Promise<object>} Resposta do pipeline Python
 */
async function callPipeline(filePath, fileName, fileId = null) {
  const absolutePath = path.resolve(filePath.startsWith('/') ? filePath.slice(1) : filePath)

  const form = new FormData()
  form.append('file', fs.createReadStream(absolutePath), fileName)

  if (fileId) {
    form.append('file_id', String(fileId))
  }

  const response = await axios.post(`${PYTHON_API_URL}/v1/extract/dxf`, form, {
    headers: {
      ...form.getHeaders(),
      'x-api-key': INTERNAL_API_KEY,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300000, // 3 minutos (extracao + RAG + LLM)
  })

  return response.data
}

/**
 * Gerar relatorio PDF a partir de dados ja existentes
 * @param {object} memorialDescritivo - Memorial descritivo completo (JSON)
 * @param {object} dadosExtracao - Dados brutos da extracao DXF (JSON)
 * @param {string} arquivoOriginal - Nome do arquivo DXF original
 * @param {number} timeoutMs - Timeout em milissegundos (default 300000 = 5min)
 * @returns {Promise<{report: Buffer, review: string}>} Buffer do PDF + revisao da IA
 */
async function generatePdf(memorialDescritivo, dadosExtracao, arquivoOriginal, timeoutMs = 300000) {
  const response = await axios.post(`${PYTHON_API_URL}/v1/relatorios/pdf`, {
    memorial_descritivo: memorialDescritivo,
    dados_extracao: dadosExtracao,
    arquivo_original: arquivoOriginal,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': INTERNAL_API_KEY,
    },
    timeout: timeoutMs,
  })

  const { report: reportBase64, review } = response.data
  return { report: Buffer.from(reportBase64, 'base64'), review }
}

/**
 * Gerar relatorio Markdown a partir de dados ja existentes
 * @param {object} memorialDescritivo - Memorial descritivo completo (JSON)
 * @param {object} dadosExtracao - Dados brutos da extracao DXF (JSON)
 * @param {string} arquivoOriginal - Nome do arquivo DXF original
 * @param {number} timeoutMs - Timeout em milissegundos (default 300000 = 5min)
 * @returns {Promise<{report: Buffer, review: string}>} Buffer do Markdown + revisao da IA
 */
async function generateMarkdown(memorialDescritivo, dadosExtracao, arquivoOriginal, timeoutMs = 300000) {
  const response = await axios.post(`${PYTHON_API_URL}/v1/relatorios/markdown`, {
    memorial_descritivo: memorialDescritivo,
    dados_extracao: dadosExtracao,
    arquivo_original: arquivoOriginal,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': INTERNAL_API_KEY,
    },
    timeout: timeoutMs,
  })

  const { report: reportBase64, review } = response.data
  return { report: Buffer.from(reportBase64, 'base64'), review }
}

/**
 * Gerar relatorio XLSX a partir de dados ja existentes
 * @param {object} memorialDescritivo - Memorial descritivo completo (JSON)
 * @param {object} dadosExtracao - Dados brutos da extracao DXF (JSON)
 * @param {string} arquivoOriginal - Nome do arquivo DXF original
 * @param {number} timeoutMs - Timeout em milissegundos (default 300000 = 5min)
 * @returns {Promise<{report: Buffer, review: string}>} Buffer do XLSX + revisao da IA
 */
async function generateXlsx(memorialDescritivo, dadosExtracao, arquivoOriginal, timeoutMs = 300000) {
  const response = await axios.post(`${PYTHON_API_URL}/v1/relatorios/xlsx`, {
    memorial_descritivo: memorialDescritivo,
    dados_extracao: dadosExtracao,
    arquivo_original: arquivoOriginal,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': INTERNAL_API_KEY,
    },
    timeout: timeoutMs,
  })

  const { report: reportBase64, review } = response.data
  return { report: Buffer.from(reportBase64, 'base64'), review }
}

/**
 * Baixar um relatorio gerado do Python
 * @param {string} filename - Nome do arquivo no servidor Python
 * @returns {Promise<Buffer>} Buffer do arquivo
 */
async function downloadReport(filename) {
  const response = await axios.get(`${PYTHON_API_URL}/v1/reports/download/${filename}`, {
    responseType: 'arraybuffer',
    timeout: 30000,
  })

  return Buffer.from(response.data)
}

/**
 * Verificar se a IA (OpenRouter) esta online
 * @returns {Promise<object>} Status da IA
 */
async function aiHealth() {
  const response = await axios.get(`${PYTHON_API_URL}/v1/ai/health`, {
    headers: { 'x-api-key': INTERNAL_API_KEY },
    timeout: 30000,
  })
  return response.data
}

/**
 * Verificar status do RAG (ChromaDB)
 * @returns {Promise<object>} Status do banco vetorial
 */
async function ragHealth() {
  const response = await axios.get(`${PYTHON_API_URL}/v1/rag/health`, {
    headers: { 'x-api-key': INTERNAL_API_KEY },
    timeout: 10000,
  })
  return response.data
}

/**
 * Sincronizar normas ativas para o ChromaDB
 * @returns {Promise<object>} Resultado da sincronizacao
 */
async function ragSync() {
  const response = await axios.post(`${PYTHON_API_URL}/v1/rag/sync`, {}, {
    headers: { 'x-api-key': INTERNAL_API_KEY },
    timeout: 300000, // 5min — sync pode demorar
  })
  return response.data
}

/**
 * Enviar mensagem de chat para o Python backend
 * @param {object} jsonCru - Dados brutos da extracao DXF (JSON)
 * @param {object} jsonTratado - Memorial descritivo tratado pela IA (JSON)
 * @param {string} pergunta - Pergunta do usuario
 * @param {Array} historico - Historico de mensagens [{role, content}]
 * @returns {Promise<object>} Resposta do chat Python
 */
async function chatMessage(jsonCru, jsonTratado, pergunta, historico = []) {
  const response = await axios.post(`${PYTHON_API_URL}/v1/chat`, {
    pergunta,
    json_cru: jsonCru,
    json_tratado: jsonTratado,
    historico,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': INTERNAL_API_KEY,
    },
    timeout: 120000, // 2 minutos
  })

  return response.data
}

module.exports = {
  callPipeline,
  generatePdf,
  generateMarkdown,
  generateXlsx,
  downloadReport,
  aiHealth,
  ragHealth,
  ragSync,
  chatMessage,
}
