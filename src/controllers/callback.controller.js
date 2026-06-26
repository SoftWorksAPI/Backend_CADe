/**
 * Callback Controller — recebe callbacks do Python quando o processamento termina.
 */
const fs = require('fs')
const path = require('path')
const File = require('../models/file.model')
const Report = require('../models/report.model')
const reportService = require('../services/report.service')
const sseService = require('../services/sse.service')

const REPORTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'reports')
const FILE_URL_BASE = '/uploads/reports'

/**
 * POST /callback/pipeline
 * Recebe o resultado do pipeline DXF do Python.
 */
async function pipelineCallback(req, res) {
  try {
    const {
      file_id,
      sucesso,
      memorial_descritivo,
      dados_extracao,
      confianca,
      num_inconsistencias: numInconsistencias,
      erro,
    } = req.body

    console.log(`[CALLBACK] Pipeline recebido para file_id=${file_id}, sucesso=${sucesso}`)

    const file = await File.findByPk(file_id)
    if (!file) {
      console.error(`[CALLBACK] File ${file_id} nao encontrado`)
      return res.status(404).json({ message: 'File not found' })
    }

    if (!sucesso) {
      console.log(`[CALLBACK] Pipeline falhou: ${erro}`)
      file.processingStatus = 'erro'
      await file.save()
      sseService.broadcast('file-updated', { fileId: file_id, userId: file.userId, name: file.originalName, status: 'erro', erro })
      return res.status(200).json({ ok: true })
    }

    // Salvar JSONs em disco
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
    const ts = Date.now()
    const baseName = `${file_id}_${ts}`

    const jsonCruPath = path.join(REPORTS_DIR, `${baseName}_json_cru.json`)
    const jsonTratadoPath = path.join(REPORTS_DIR, `${baseName}_json_tratado.json`)
    fs.writeFileSync(jsonCruPath, JSON.stringify(dados_extracao, null, 2), 'utf-8')
    fs.writeFileSync(jsonTratadoPath, JSON.stringify(memorial_descritivo, null, 2), 'utf-8')

    // Criar Reports de JSON
    await reportService.createReport({
      title: `JSON Cru - ${file.originalName}`,
      fileId: file_id,
      userId: file.userId,
      filePath: `${FILE_URL_BASE}/${baseName}_json_cru.json`,
      fileType: 'json',
      confianca,
      numInconsistencias,
      status: 'concluido',
    })

    await reportService.createReport({
      title: `JSON Tratado - ${file.originalName}`,
      fileId: file_id,
      userId: file.userId,
      filePath: `${FILE_URL_BASE}/${baseName}_json_tratado.json`,
      fileType: 'json',
      confianca,
      numInconsistencias,
      status: 'concluido',
    })

    // Atualizar File
    file.markdownContent = JSON.stringify(memorial_descritivo, null, 2)
    file.processingStatus = 'concluido'
    await file.save()

    console.log(`[CALLBACK] Pipeline concluido para file_id=${file_id}`)

    // Notificar frontend via SSE
    sseService.broadcast('file-updated', { fileId: file_id, userId: file.userId, name: file.originalName, status: 'concluido' })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[CALLBACK] Erro no pipeline callback:', err.message)
    // Tentar marcar como erro
    try {
      const file = await File.findByPk(req.body.file_id)
      if (file) { file.processingStatus = 'erro'; await file.save() }
      sseService.broadcast('file-updated', { fileId: req.body.file_id, userId: file?.userId, name: file?.originalName, status: 'erro' })
    } catch (_) {}
    return res.status(500).json({ message: err.message })
  }
}

/**
 * POST /callback/report
 * Recebe o resultado da geracao de relatorio (PDF/MD/XLSX) do Python.
 */
async function reportCallback(req, res) {
  try {
    const { report_id, report_base64, review, sucesso, erro } = req.body

    console.log(`[CALLBACK] Report recebido para report_id=${report_id}, sucesso=${sucesso}`)

    const report = await Report.findByPk(report_id)
    if (!report) {
      console.error(`[CALLBACK] Report ${report_id} nao encontrado`)
      return res.status(404).json({ message: 'Report not found' })
    }

    if (!sucesso) {
      console.log(`[CALLBACK] Report falhou: ${erro}`)
      await reportService.updateReport(report_id, { status: 'erro' })
      sseService.broadcast('report-updated', { reportId: report_id, fileId: report.fileId, userId: report.userId, name: report.title, status: 'erro' })
      return res.status(200).json({ ok: true })
    }

    // Decodificar base64 e salvar arquivo
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
    const ts = Date.now()
    const baseName = `${report.fileId}_${ts}`

    const ext = report.fileType === 'markdown' ? 'md' : report.fileType
    const fileName = `${baseName}_memorial.${ext}`
    const filePath = path.join(REPORTS_DIR, fileName)
    const fileBuffer = Buffer.from(report_base64, 'base64')
    fs.writeFileSync(filePath, fileBuffer)

    // Atualizar Report
    await reportService.updateReport(report_id, {
      filePath: `${FILE_URL_BASE}/${fileName}`,
      status: 'concluido',
      review: review || null,
    })

    console.log(`[CALLBACK] Report ${report_id} concluido`)

    // Notificar frontend via SSE
    sseService.broadcast('report-updated', { reportId: report_id, fileId: report.fileId, userId: report.userId, name: report.title, status: 'concluido' })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[CALLBACK] Erro no report callback:', err.message)
    try {
      await reportService.updateReport(req.body.report_id, { status: 'erro' })
      const report = await Report.findByPk(req.body.report_id)
      if (report) {
        sseService.broadcast('report-updated', { reportId: req.body.report_id, fileId: report.fileId, userId: report.userId, name: report.title, status: 'erro' })
      }
    } catch (_) {}
    return res.status(500).json({ message: err.message })
  }
}

module.exports = { pipelineCallback, reportCallback }
