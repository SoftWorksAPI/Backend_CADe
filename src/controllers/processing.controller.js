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
  const startTime = Date.now()
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

    // 3. Garantir que a pasta uploads/reports existe
    fs.mkdirSync(REPORTS_DIR, { recursive: true })

    const fileIntId = parseInt(fileId, 10)
    const fileUrlBase = '/uploads/reports'

    // ============================
    // Extracao + LLM → JSONs
    // ============================
    console.log(`[NODE] Chamando extracao + LLM (POST /v1/extract/dxf)...`)
    const filePath = file.filePath.startsWith('/')
      ? file.filePath
      : `/${file.filePath}`
    const resultado = await pythonClient.callPipeline(
      filePath,
      file.originalName,
      fileIntId
    )

    if (!resultado.sucesso) {
      console.log(`[NODE] ERRO na extracao: ${resultado.erro}`)
      return res.status(422).json({ message: resultado.erro || 'Erro na extracao do DXF' })
    }

    const dadosExtracao = resultado.dados_extracao || {}
    const memorialDescritivo = resultado.memorial_descritivo || {}
    const confianca = resultado.confianca || null
    const numInconsistencias = resultado.num_inconsistencias || 0

    // Salvar JSONs em disco
    const ts = Date.now()
    const baseName = `${fileIntId}_${ts}`

    const jsonCruPath = path.join(REPORTS_DIR, `${baseName}_json_cru.json`)
    const jsonTratadoPath = path.join(REPORTS_DIR, `${baseName}_json_tratado.json`)
    fs.writeFileSync(jsonCruPath, JSON.stringify(dadosExtracao, null, 2), 'utf-8')
    fs.writeFileSync(jsonTratadoPath, JSON.stringify(memorialDescritivo, null, 2), 'utf-8')
    console.log(`[NODE] JSONs salvos: ${baseName}_json_cru.json, ${baseName}_json_tratado.json`)

    // Criar Reports de JSON
    await reportService.createReport({
      title: `JSON Cru - ${file.originalName}`,
      fileId: fileIntId,
      userId: requestUserId,
      filePath: `${fileUrlBase}/${baseName}_json_cru.json`,
      fileType: 'json',
      confianca,
      numInconsistencias,
      status: 'concluido',
    })

    await reportService.createReport({
      title: `JSON Tratado - ${file.originalName}`,
      fileId: fileIntId,
      userId: requestUserId,
      filePath: `${fileUrlBase}/${baseName}_json_tratado.json`,
      fileType: 'json',
      confianca,
      numInconsistencias,
      status: 'concluido',
    })

    // Atualizar markdownContent no File com o JSON tratado (memorial)
    try {
      file.markdownContent = JSON.stringify(memorialDescritivo, null, 2)
      await file.save()
    } catch (err) {
      console.warn('Aviso: nao foi possivel atualizar markdownContent:', err.message)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[NODE] Processamento concluido em ${elapsed}s - 2 Reports criados\n`)

    return res.status(200).json({
      message: 'Arquivo processado com sucesso',
      sucesso: true,
      reports: {
        json_cru: { filePath: `${fileUrlBase}/${baseName}_json_cru.json` },
        json_tratado: { filePath: `${fileUrlBase}/${baseName}_json_tratado.json` },
      },
      confianca,
      num_inconsistencias: numInconsistencias,
    })
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`[NODE] ERRO apos ${elapsed}s:`, err.message)
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
 * Gerar relatorio PDF via IA para um arquivo ja processado
 */
async function generatePdfReport(req, res) {
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

    // Chamar Python para gerar PDF via IA
    const timeout = req.query.timeout ? parseInt(req.query.timeout, 10) : 180000
    const pdfBuffer = await pythonClient.generatePdf(jsonTratado, jsonCru, file.originalName, timeout)

    // Salvar em uploads/reports/
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
    const ts = Date.now()
    const baseName = `${parseInt(fileId, 10)}_${ts}`
    const pdfPath = path.join(REPORTS_DIR, `${baseName}_memorial.pdf`)
    fs.writeFileSync(pdfPath, pdfBuffer)

    // Criar Report no BD
    await reportService.createReport({
      title: `Memorial PDF - ${file.originalName}`,
      fileId: parseInt(fileId, 10),
      userId: requestUserId,
      filePath: `/uploads/reports/${baseName}_memorial.pdf`,
      fileType: 'pdf',
      status: 'concluido',
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace('.dxf', '')}_memorial.pdf"`)
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('Erro ao gerar PDF:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Gerar relatorio XLSX via IA para um arquivo ja processado
 */
async function generateXlsxReport(req, res) {
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

    // Chamar Python para gerar XLSX via IA
    const timeout = req.query.timeout ? parseInt(req.query.timeout, 10) : 180000
    const xlsxBuffer = await pythonClient.generateXlsx(jsonTratado, jsonCru, file.originalName, timeout)

    // Salvar em uploads/reports/
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
    const ts = Date.now()
    const baseName = `${parseInt(fileId, 10)}_${ts}`
    const xlsxPath = path.join(REPORTS_DIR, `${baseName}_memorial.xlsx`)
    fs.writeFileSync(xlsxPath, xlsxBuffer)

    // Criar Report no BD
    await reportService.createReport({
      title: `Memorial XLSX - ${file.originalName}`,
      fileId: parseInt(fileId, 10),
      userId: requestUserId,
      filePath: `/uploads/reports/${baseName}_memorial.xlsx`,
      fileType: 'xlsx',
      status: 'concluido',
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace('.dxf', '')}_memorial.xlsx"`)
    return res.send(xlsxBuffer)
  } catch (err) {
    console.error('Erro ao gerar XLSX:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Gerar relatorio Markdown via IA para um arquivo ja processado
 */
async function generateMarkdownReport(req, res) {
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

    // Chamar Python para gerar MD via IA
    const timeout = req.query.timeout ? parseInt(req.query.timeout, 10) : 180000
    const mdBuffer = await pythonClient.generateMarkdown(jsonTratado, jsonCru, file.originalName, timeout)

    // Salvar em uploads/reports/
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
    const ts = Date.now()
    const baseName = `${parseInt(fileId, 10)}_${ts}`
    const mdPath = path.join(REPORTS_DIR, `${baseName}_memorial.md`)
    fs.writeFileSync(mdPath, mdBuffer)

    // Criar Report no BD
    await reportService.createReport({
      title: `Memorial Markdown - ${file.originalName}`,
      fileId: parseInt(fileId, 10),
      userId: requestUserId,
      filePath: `/uploads/reports/${baseName}_memorial.md`,
      fileType: 'md',
      status: 'concluido',
    })

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace('.dxf', '')}_memorial.md"`)
    return res.send(mdBuffer)
  } catch (err) {
    console.error('Erro ao gerar Markdown:', err)
    return res.status(500).json({ message: err.message })
  }
}

module.exports = {
  processFile,
  generatePdfReport,
  generateMarkdownReport,
  generateXlsxReport,
}
