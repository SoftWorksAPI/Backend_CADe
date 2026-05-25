const File = require('../models/file.model')
const Report = require('../models/report.model')
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')
const pythonClient = require('../services/pythonClient.service')
const reportService = require('../services/report.service')

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports')

/**
 * Processar arquivo DXF via pipeline Python (extracao + IA + relatorios)
 * Cria 4 registros na tabela reports: json_cru, json_tratado, md, pdf
 * Salva os arquivos em uploads/reports/
 */
async function processFile(req, res) {
  try {
    const { fileId } = req.params
    const userId = req.user.id

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

    // 3. Chamar pipeline Python
    const filePath = file.filePath.startsWith('/')
      ? file.filePath
      : `/${file.filePath}`
    const resultado = await pythonClient.callPipeline(
      filePath,
      file.originalName,
      parseInt(fileId, 10)
    )

    // 4. Garantir que a pasta uploads/reports existe
    fs.mkdirSync(REPORTS_DIR, { recursive: true })

    // 5. Definir base name para os arquivos
    const fileIntId = parseInt(fileId, 10)
    const ts = Date.now()
    const baseName = `${fileIntId}_${ts}`

    // 6. Baixar .md e .pdf do Python
    let mdBuffer = null
    let pdfBuffer = null

    if (resultado.relatorio_md) {
      try {
        const mdFilename = resultado.relatorio_md.split(/[\\/]/).pop()
        mdBuffer = await pythonClient.downloadReport(mdFilename)
      } catch (err) {
        console.warn('Aviso: nao foi possivel baixar o .md:', err.message)
      }
    }

    if (resultado.relatorio_pdf) {
      try {
        const pdfFilename = resultado.relatorio_pdf.split(/[\\/]/).pop()
        pdfBuffer = await pythonClient.downloadReport(pdfFilename)
      } catch (err) {
        console.warn('Aviso: nao foi possivel baixar o .pdf:', err.message)
      }
    }

    // 7. Salvar 4 arquivos em uploads/reports/
    const jsonCruPath = path.join(REPORTS_DIR, `${baseName}_json_cru.json`)
    const jsonTratadoPath = path.join(REPORTS_DIR, `${baseName}_json_tratado.json`)
    const mdPath = path.join(REPORTS_DIR, `${baseName}_memorial.md`)
    const pdfPath = path.join(REPORTS_DIR, `${baseName}_memorial.pdf`)

    const dadosExtracao = resultado.dados_extracao || {}
    const memorialDescritivo = resultado.memorial_descritivo || {}

    fs.writeFileSync(jsonCruPath, JSON.stringify(dadosExtracao, null, 2), 'utf-8')
    fs.writeFileSync(jsonTratadoPath, JSON.stringify(memorialDescritivo, null, 2), 'utf-8')
    if (mdBuffer) fs.writeFileSync(mdPath, mdBuffer)
    if (pdfBuffer) fs.writeFileSync(pdfPath, pdfBuffer)

    // 8. Criar 4 registros Report no BD
    const fileUrlBase = '/uploads/reports'
    const status = resultado.sucesso ? 'concluido' : 'erro'
    const tentativas = resultado.revisao?.tentativas || 1
    const confianca = resultado.confianca || null
    const numInconsistencias = resultado.num_inconsistencias || 0

    const reportJsonCru = await reportService.createReport({
      title: `JSON Cru - ${file.originalName}`,
      fileId: fileIntId,
      userId: requestUserId,
      filePath: `${fileUrlBase}/${baseName}_json_cru.json`,
      fileType: 'json',
      confianca,
      numInconsistencias,
      status,
      tentativasRevisao: tentativas,
    })

    const reportJsonTratado = await reportService.createReport({
      title: `JSON Tratado - ${file.originalName}`,
      fileId: fileIntId,
      userId: requestUserId,
      filePath: `${fileUrlBase}/${baseName}_json_tratado.json`,
      fileType: 'json',
      confianca,
      numInconsistencias,
      status,
      tentativasRevisao: tentativas,
    })

    const reportMd = await reportService.createReport({
      title: `Memorial Markdown - ${file.originalName}`,
      fileId: fileIntId,
      userId: requestUserId,
      filePath: `${fileUrlBase}/${baseName}_memorial.md`,
      fileType: 'md',
      confianca,
      numInconsistencias,
      status,
      tentativasRevisao: tentativas,
    })

    const reportPdf = await reportService.createReport({
      title: `Memorial PDF - ${file.originalName}`,
      fileId: fileIntId,
      userId: requestUserId,
      filePath: `${fileUrlBase}/${baseName}_memorial.pdf`,
      fileType: 'pdf',
      confianca,
      numInconsistencias,
      status,
      tentativasRevisao: tentativas,
    })

    // 9. Atualizar markdownContent no File
    if (mdBuffer) {
      try {
        file.markdownContent = mdBuffer.toString('utf-8')
        await file.save()
      } catch (err) {
        console.warn('Aviso: nao foi possivel atualizar markdownContent:', err.message)
      }
    }

    // 10. Retornar resultado
    return res.status(200).json({
      message: 'Arquivo processado com sucesso',
      sucesso: resultado.sucesso,
      reports: {
        json_cru: { id: reportJsonCru.id, filePath: reportJsonCru.filePath },
        json_tratado: { id: reportJsonTratado.id, filePath: reportJsonTratado.filePath },
        md: { id: reportMd.id, filePath: reportMd.filePath },
        pdf: { id: reportPdf.id, filePath: reportPdf.filePath },
      },
      confianca: resultado.confianca,
      num_inconsistencias: resultado.num_inconsistencias,
      revisao: resultado.revisao,
    })
  } catch (err) {
    console.error('Erro ao processar arquivo:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Servir relatorio PDF ja gerado para um arquivo processado
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

    const report = await Report.findOne({
      where: { fileId: parseInt(fileId, 10), fileType: 'pdf' },
      order: [['createdAt', 'DESC']],
    })

    if (!report || !report.filePath) {
      return res.status(404).json({
        message: 'Nenhum PDF encontrado para este arquivo. Execute o processamento primeiro.',
      })
    }

    const filename = path.basename(report.filePath)
    const absPath = path.join(REPORTS_DIR, filename)
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: 'Arquivo PDF nao encontrado no disco' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace('.dxf', '')}_memorial.pdf"`)
    return res.sendFile(absPath)
  } catch (err) {
    console.error('Erro ao servir PDF:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Servir relatorio Markdown ja gerado para um arquivo processado
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

    const report = await Report.findOne({
      where: { fileId: parseInt(fileId, 10), fileType: 'md' },
      order: [['createdAt', 'DESC']],
    })

    if (!report || !report.filePath) {
      return res.status(404).json({
        message: 'Nenhum Markdown encontrado para este arquivo. Execute o processamento primeiro.',
      })
    }

    const filename = path.basename(report.filePath)
    const absPath = path.join(REPORTS_DIR, filename)
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: 'Arquivo Markdown nao encontrado no disco' })
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace('.dxf', '')}_memorial.md"`)
    return res.sendFile(absPath)
  } catch (err) {
    console.error('Erro ao servir Markdown:', err)
    return res.status(500).json({ message: err.message })
  }
}

module.exports = {
  processFile,
  generatePdfReport,
  generateMarkdownReport,
}
