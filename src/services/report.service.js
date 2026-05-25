const Report = require('../models/report.model')
const File = require('../models/file.model')
const User = require('../models/user.model')

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
  })

  return report
}

async function listReports({ fileId, userId, isAdmin }) {
  const where = {}

  if (fileId) {
    where.fileId = fileId
  }

  if (!isAdmin && userId) {
    where.userId = userId
  }

  const reports = await Report.findAll({
    where,
    include: [
      { model: File, attributes: ['id', 'originalName', 'filename'] },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  })

  return reports
}

async function getReportById(id, userId, isAdmin) {
  const report = await Report.findByPk(id, {
    include: [
      { model: File, attributes: ['id', 'originalName', 'filename', 'filePath'] },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
  })

  if (!report) {
    throw new Error('Relatório não encontrado')
  }

  const reportUserIdNum = parseInt(report.userId, 10)
  const userIdNum = parseInt(userId, 10)

  if (reportUserIdNum !== userIdNum && !isAdmin) {
    throw new Error('Permissão negada')
  }

  return report
}

async function deleteReport(id, userId, isAdmin) {
  const report = await Report.findByPk(id)

  if (!report) {
    throw new Error('Relatório não encontrado')
  }

  const reportUserIdNum = parseInt(report.userId, 10)
  const userIdNum = parseInt(userId, 10)

  if (reportUserIdNum !== userIdNum && !isAdmin) {
    throw new Error('Permissão negada')
  }

  await report.destroy()
  return { message: 'Relatório deletado com sucesso' }
}

module.exports = {
  createReport,
  listReports,
  getReportById,
  deleteReport,
}
