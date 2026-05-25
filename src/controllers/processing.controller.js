const File = require('../models/file.model')
const Report = require('../models/report.model')
const pythonClient = require('../services/pythonClient.service')
const reportService = require('../services/report.service')

/**
 * Processar arquivo DXF via pipeline Python (extracao + IA + relatorios)
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

    // 4. Salvar relatorio no BD
    const report = await reportService.createReport({
      title: `Memorial Descritivo - ${file.originalName}`,
      fileId: parseInt(fileId, 10),
      userId: requestUserId,
      fileType: 'md,pdf',
      memorialDescritivo: resultado.memorial_descritivo || null,
      dadosExtracao: resultado.dados_extracao || null,
      confianca: resultado.confianca || null,
      numInconsistencias: resultado.num_inconsistencias || 0,
      status: resultado.sucesso ? 'concluido' : 'erro',
      tentativasRevisao: resultado.revisao?.tentativas || 1,
    })

    // 5. Atualizar markdownContent no File (baixando .md do Python via HTTP)
    if (resultado.relatorio_md) {
      try {
        // Extrair nome do arquivo do caminho retornado (funciona Windows e Linux)
        const mdFilename = resultado.relatorio_md.split(/[\\/]/).pop()
        const mdBuffer = await pythonClient.downloadReport(mdFilename)
        file.markdownContent = mdBuffer.toString('utf-8')
        await file.save()
      } catch (err) {
        console.warn('Aviso: nao foi possivel baixar o .md para atualizar File:', err.message)
      }
    }

    // 6. Retornar resultado
    return res.status(200).json({
      message: 'Arquivo processado com sucesso',
      sucesso: resultado.sucesso,
      report: {
        id: report.id,
        title: report.title,
        status: report.status,
      },
      memorial_descritivo: resultado.memorial_descritivo,
      dados_extracao: resultado.dados_extracao,
      confianca: resultado.confianca,
      num_inconsistencias: resultado.num_inconsistencias,
      relatorio_md: resultado.relatorio_md,
      relatorio_pdf: resultado.relatorio_pdf,
      revisao: resultado.revisao,
    })
  } catch (err) {
    console.error('Erro ao processar arquivo:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Gerar relatorio PDF para um arquivo ja processado
 */
async function generatePdfReport(req, res) {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    // Buscar arquivo no BD
    const file = await File.findByPk(fileId)
    if (!file) {
      return res.status(404).json({ message: 'Arquivo nao encontrado' })
    }

    // Verificar permissao
    const fileUserId = parseInt(file.userId, 10)
    const requestUserId = parseInt(userId, 10)
    if (fileUserId !== requestUserId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Permissao negada' })
    }

    // Buscar relatorio mais recente do arquivo
    const report = await Report.findOne({
      where: { fileId: parseInt(fileId, 10) },
      order: [['createdAt', 'DESC']],
    })

    if (!report || !report.memorialDescritivo) {
      return res.status(404).json({
        message: 'Nenhum relatorio encontrado para este arquivo. Execute o processamento primeiro.',
      })
    }

    // Chamar Python para gerar PDF
    const pdfBuffer = await pythonClient.generatePdf(
      report.memorialDescritivo,
      report.dadosExtracao || {},
      file.originalName
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName.replace('.dxf', '')}_memorial.pdf"`)
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('Erro ao gerar PDF:', err)
    return res.status(500).json({ message: err.message })
  }
}

/**
 * Gerar relatorio Markdown para um arquivo ja processado
 */
async function generateMarkdownReport(req, res) {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    // Buscar arquivo no BD
    const file = await File.findByPk(fileId)
    if (!file) {
      return res.status(404).json({ message: 'Arquivo nao encontrado' })
    }

    // Verificar permissao
    const fileUserId = parseInt(file.userId, 10)
    const requestUserId = parseInt(userId, 10)
    if (fileUserId !== requestUserId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Permissao negada' })
    }

    // Buscar relatorio mais recente do arquivo
    const report = await Report.findOne({
      where: { fileId: parseInt(fileId, 10) },
      order: [['createdAt', 'DESC']],
    })

    if (!report || !report.memorialDescritivo) {
      return res.status(404).json({
        message: 'Nenhum relatorio encontrado para este arquivo. Execute o processamento primeiro.',
      })
    }

    // Chamar Python para gerar Markdown
    const mdBuffer = await pythonClient.generateMarkdown(
      report.memorialDescritivo,
      report.dadosExtracao || {},
      file.originalName
    )

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
}
