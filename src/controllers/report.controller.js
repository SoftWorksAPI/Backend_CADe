const File = require('../models/file.model')
const reportService = require('../services/report.service')
const fs = require('fs')
const path = require('path')

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports')

async function createReport(req, res) {
  try {
    const data = req.body

    if (!data.fileId) {
      return res.status(400).json({ message: 'fileId é obrigatório' })
    }

    // Se chamado via API key (FastAPI), userId vem do body e não há verificação de ownership
    // Se chamado via JWT, userId vem do middleware e verificamos ownership
    const isApiKey = !req.user
    const userId = isApiKey ? data.userId : req.user.id

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' })
    }

    // Verificar ownership apenas para chamadas via JWT (usuários autenticados)
    if (!isApiKey && !req.user.isAdmin) {
      const file = await File.findByPk(data.fileId)
      if (!file) {
        return res.status(404).json({ message: 'Arquivo não encontrado' })
      }

      const fileUserId = parseInt(file.userId, 10)
      if (fileUserId !== parseInt(userId, 10)) {
        return res.status(403).json({ message: 'Permissão negada: arquivo não pertence ao usuário' })
      }
    }

    // Upload manual com arquivo (multipart/form-data)
    if (req.file) {
      if (!data.title) {
        return res.status(400).json({ message: 'title é obrigatório para upload manual' })
      }

      fs.mkdirSync(REPORTS_DIR, { recursive: true })
      const ts = Date.now()
      const ext = path.extname(req.file.originalname)
      const filename = `${parseInt(userId, 10)}_${ts}_manual${ext}`
      const filePath = path.join(REPORTS_DIR, filename)
      fs.writeFileSync(filePath, req.file.buffer)

      const fileType = ext.replace('.', '').toLowerCase()

      const report = await reportService.createReport({
        title: data.title,
        fileId: parseInt(data.fileId, 10),
        userId: parseInt(userId, 10),
        filePath: `/uploads/reports/${filename}`,
        fileType,
        status: 'concluido',
      })

      return res.status(201).json({
        message: 'Relatório criado com sucesso',
        report,
      })
    }

    // JSON puro (comportamento atual — API key ou corpo puro)
    const report = await reportService.createReport({
      ...data,
      userId,
    })

    return res.status(201).json({
      message: 'Relatório criado com sucesso',
      report,
    })
  } catch (err) {
    console.error('Erro ao criar relatório:', err)
    return res.status(500).json({ message: err.message })
  }
}

async function listReports(req, res) {
  try {
    const { fileId } = req.query
    const userId = req.user.id
    const isAdmin = req.user.isAdmin

    const reports = await reportService.listReports({ fileId, userId, isAdmin })

    return res.status(200).json({ reports })
  } catch (err) {
    console.error('Erro ao listar relatórios:', err)
    return res.status(500).json({ message: err.message })
  }
}

async function getReportById(req, res) {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.isAdmin

    const report = await reportService.getReportById(id, userId, isAdmin)

    return res.status(200).json({ report })
  } catch (err) {
    console.error('Erro ao buscar relatório:', err)

    if (err.message === 'Relatório não encontrado') {
      return res.status(404).json({ message: err.message })
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message })
    }

    return res.status(500).json({ message: err.message })
  }
}

async function deleteReport(req, res) {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.isAdmin

    await reportService.deleteReport(id, userId, isAdmin)

    return res.status(200).json({ message: 'Relatório deletado com sucesso' })
  } catch (err) {
    console.error('Erro ao deletar relatório:', err)

    if (err.message === 'Relatório não encontrado') {
      return res.status(404).json({ message: err.message })
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message })
    }

    return res.status(500).json({ message: err.message })
  }
}

module.exports = {
  createReport,
  listReports,
  getReportById,
  deleteReport,
}
