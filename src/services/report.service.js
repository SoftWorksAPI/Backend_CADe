const { Op } = require('sequelize')
const Report = require('../models/report.model')
const File = require('../models/file.model')
const User = require('../models/user.model')
const fs = require('fs')
const path = require('path')

async function createReport(data) {
  const report = await Report.create({
    title: data.title || 'Memorial Descritivo',
    fileId: data.fileId,
    userId: data.userId,
    filePath: data.filePath || null,
    fileType: data.fileType || null,
    confianca: data.confianca || null,
    numInconsistencias: data.numInconsistencias || 0,
    status: data.status || 'concluido',
    tentativasRevisao: data.tentativasRevisao || 1,
    review: data.review || null,
  })

  return report
}

async function listReports({ fileId, userId, isAdmin, page = 1, limit = 20 }) {
  const where = {}

  if (fileId) {
    where.fileId = fileId
  }

  // Admin ve tudo. Nao-admin ve reports dos seus arquivos + seus proprios reports
  if (!isAdmin && userId) {
    const userIdInt = parseInt(userId, 10)
    where[Op.or] = [
      { userId: userIdInt },
      { '$File.user_id$': userIdInt }
    ]
  }

  const offset = (page - 1) * limit

  const { count, rows } = await Report.findAndCountAll({
    where,
    include: [
      { model: File, attributes: ['id', 'originalName', 'filename', 'userId'], required: !isAdmin && !!userId },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  })

  return {
    reports: rows,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    },
  }
}

async function getReportById(id, userId, isAdmin) {
  const report = await Report.findByPk(id, {
    include: [
      { model: File, attributes: ['id', 'originalName', 'filename', 'filePath', 'userId'] },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
  })

  if (!report) {
    throw new Error('Relatório não encontrado')
  }

  const userIdNum = parseInt(userId, 10)
  const reportUserIdNum = parseInt(report.userId, 10)
  const fileUserIdNum = report.File ? parseInt(report.File.userId, 10) : null

  // Admin tem acesso total. Usuario comum: acesso se é dono do relatório OU dono do arquivo associado
  if (!isAdmin && reportUserIdNum !== userIdNum && fileUserIdNum !== userIdNum) {
    throw new Error('Permissão negada')
  }

  return report
}

async function updateReport(id, data) {
  const report = await Report.findByPk(id)
  if (!report) throw new Error('Relatório não encontrado')
  return await report.update(data)
}

async function deleteReport(id, userId, isAdmin) {
  const report = await Report.findByPk(id, {
    include: [{ model: File, attributes: ['id', 'userId'] }],
  })

  if (!report) {
    throw new Error('Relatório não encontrado')
  }

  const userIdNum = parseInt(userId, 10)
  const reportUserIdNum = parseInt(report.userId, 10)
  const fileUserIdNum = report.File ? parseInt(report.File.userId, 10) : null

  if (!isAdmin && reportUserIdNum !== userIdNum && fileUserIdNum !== userIdNum) {
    throw new Error('Permissão negada')
  }

  // Deletar arquivo fisico se existir
  if (report.filePath) {
    try {
      const filename = path.basename(report.filePath)
      const absPath = path.join(__dirname, '../../uploads/reports', filename)
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
    } catch (err) {
      console.warn('Aviso: nao foi possivel deletar arquivo do report:', err.message)
    }
  }

  await report.destroy()
  return { message: 'Relatório deletado com sucesso' }
}

module.exports = {
  createReport,
  updateReport,
  listReports,
  getReportById,
  deleteReport,
}
