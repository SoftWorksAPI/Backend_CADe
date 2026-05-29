const File = require('../models/file.model')
const Report = require('../models/report.model')
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')
const pythonClient = require('../services/pythonClient.service')
const reportService = require('../services/report.service')

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports')

/**
 * Processar arquivo DXF — gera apenas os JSONs (cru + tratado)
 * Chama Python POST /v1/extract/dxf (extração + RAG + LLM + parse)
 * Os relatórios MD/PDF são gerados separadamente via /processing/:fileId/relatorio/pdf|markdown
 */
async function processFile(req, res) {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[NODE] Inicio do processamento - fileId: ${fileId}`)
    console.log(`${'='.repeat(60)}`)

    // 1. Buscar arquivo no BD
    const file = await File.findByPk(fileId)
    if (!file) {
      return res.status(404).json({ message: 'Arquivo nao encontrado' })
    }

    // 2. Verificar permissao
    const fileUserId = parseInt(file.userId, 10)
    const requestUserId = parseInt(userId, 10)
    if (fileUserId !== requestUserId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Permissao negada' })
    }

    // 3. Marcar como processando
    file.processingStatus = 'processando'
    await file.save()

    // 4. Disparar processamento no Python (fire-and-forget)
    const filePath = file.filePath.startsWith('/') ? file.filePath : `/${file.filePath}`
    pythonClient.callPipelineAsync(filePath, file.originalName, parseInt(fileId, 10))
      .catch(err => console.error('[NODE] Erro ao enviar para Python:', err.message))

    // 5. Retornar 202 imediatamente
    console.log(`[NODE] Processamento disparado para fileId: ${fileId}`)
    return res.status(202).json({ message: 'Processamento iniciado', status: 'processando' })
  } catch (err) {
    console.error('[NODE] ERRO ao iniciar processamento:', err.message)
    try {
      const file = await File.findByPk(req.params.fileId)
      if (file) { file.processingStatus = 'erro'; await file.save() }
    } catch (_) {}
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Helper: buscar jsons do disco para um fileId
 */
async function _getJsonsFromDisk(fileId) {
  const jsonReports = await Report.findAll({
    where: { fileId: parseInt(fileId, 10), fileType: 'json' },
    order: [['createdAt', 'DESC']],
  })

  let jsonCru = null
  let jsonTratado = null

  for (const report of jsonReports) {
    if (!report.filePath) continue
    const filename = path.basename(report.filePath)
    const absPath = path.join(REPORTS_DIR, filename)
    if (!fs.existsSync(absPath)) continue

    const content = fs.readFileSync(absPath, 'utf-8')
    const parsed = JSON.parse(content)

    if (filename.includes('json_cru')) {
      jsonCru = parsed
    } else if (filename.includes('json_tratado')) {
      jsonTratado = parsed
    }
  }

  return { jsonCru, jsonTratado }
}

/**
 * Helper: criar Report 'gerando' e disparar geracao via callback
 */
async function _generateReportAsync(req, res, fileType, titlePrefix) {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    const file = await File.findByPk(fileId)
    if (!file) {
      return res.status(404).json({ message: 'Arquivo nao encontrado' })
    }

    const fileUserId = parseInt(file.userId, 10)
    const requestUserId = parseInt(userId, 10)
    if (fileUserId !== requestUserId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Permissao negada' })
    }

    // Buscar JSONs do disco
    const { jsonCru, jsonTratado } = await _getJsonsFromDisk(fileId)
    if (!jsonCru || !jsonTratado) {
      return res.status(404).json({
        message: 'JSONs de extracao nao encontrados. Execute a pipeline principal primeiro via POST /processing/:fileId/process',
      })
    }

    // Criar Report com status 'gerando'
    const pendingReport = await reportService.createReport({
      title: `${titlePrefix} - ${file.originalName}`,
      fileId: parseInt(fileId, 10),
      userId: requestUserId,
      fileType,
      status: 'gerando',
    })

    // Disparar geracao no Python (fire-and-forget)
    pythonClient.generateReportAsync(fileType, jsonTratado, jsonCru, file.originalName, pendingReport.id)
      .catch(err => console.error(`[NODE] Erro ao enviar ${fileType} para Python:`, err.message))

    // Retornar 202 imediatamente
    return res.status(202).json({ message: 'Geracao iniciada', status: 'gerando', reportId: pendingReport.id })
  } catch (err) {
    console.error(`[NODE] Erro ao iniciar geracao de ${fileType}:`, err.message)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Gerar relatorio PDF via IA para um arquivo ja processado
 */
async function generatePdfReport(req, res) {
  return _generateReportAsync(req, res, 'pdf', 'Memorial PDF')
}

/**
 * Gerar relatorio XLSX via IA para um arquivo ja processado
 */
async function generateXlsxReport(req, res) {
  return _generateReportAsync(req, res, 'xlsx', 'Memorial XLSX')
}

/**
 * Gerar relatorio Markdown via IA para um arquivo ja processado
 */
async function generateMarkdownReport(req, res) {
  return _generateReportAsync(req, res, 'markdown', 'Memorial Markdown')
}

module.exports = {
  processFile,
  generatePdfReport,
  generateMarkdownReport,
  generateXlsxReport,
}
