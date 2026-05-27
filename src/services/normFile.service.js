const NormFile = require('../models/normFile.model')
const User = require('../models/user.model')
const path = require('path')
const fs = require('fs').promises

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls']

async function saveNormFileToFilesystem(fileBuffer, originalName) {
  const uploadsDir = path.join(__dirname, '../../uploads/norms')
  await fs.mkdir(uploadsDir, { recursive: true })

  const filename = `${Date.now()}-${originalName}`
  const filePath = path.join(uploadsDir, filename)

  await fs.writeFile(filePath, fileBuffer)

  return {
    filename,
    filePath: `/uploads/norms/${filename}`,
  }
}

async function uploadNormFile(file, metadata, userId) {
  const savedFile = await saveNormFileToFilesystem(file.buffer, file.originalname)

  const ext = path.extname(file.originalname).toLowerCase()

  const normFile = await NormFile.create({
    title: metadata.title,
    description: metadata.description || null,
    category: metadata.category,
    originalName: file.originalname,
    filename: savedFile.filename,
    filePath: savedFile.filePath,
    fileSize: file.size,
    fileType: ext.replace('.', ''),
    userId: userId,
  })

  return {
    id: normFile.id,
    title: normFile.title,
    category: normFile.category,
    originalName: normFile.originalName,
    filename: normFile.filename,
    fileSize: normFile.fileSize,
    fileType: normFile.fileType,
    createdAt: normFile.createdAt,
  }
}

async function deleteNormFile(normFileId, userId, isAdmin) {
  const normFile = await NormFile.findByPk(normFileId)

  if (!normFile) {
    throw new Error('Arquivo não encontrado')
  }

  const normFileUserIdNum = parseInt(normFile.userId, 10)
  const userIdNum = parseInt(userId, 10)

  if (normFileUserIdNum !== userIdNum && !isAdmin) {
    throw new Error('Permissão negada')
  }

  const filePath = path.join(__dirname, '../../uploads/norms', normFile.filename)
  try {
    await fs.unlink(filePath)
  } catch (err) {
    console.warn('Aviso: arquivo físico não encontrado', filePath)
  }

  await normFile.destroy()

  return { message: 'Arquivo de norma deletado com sucesso' }
}

async function listAllNormFiles(page = 1, limit = 10, category = null) {
  const offset = (page - 1) * limit

  const where = {}
  if (category) {
    where.category = category
  }

  const { count, rows } = await NormFile.findAndCountAll({
    where,
    include: {
      model: User,
      attributes: ['id', 'name', 'email'],
    },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  })

  return {
    normFiles: rows,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    },
  }
}

async function listNormFilesByUserId(userId, requestUserId, isAdmin, page = 1, limit = 10) {
  const userIdNum = parseInt(userId, 10)
  const requestUserIdNum = parseInt(requestUserId, 10)

  const user = await User.findByPk(userIdNum)
  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  if (userIdNum !== requestUserIdNum && !isAdmin) {
    throw new Error('Permissão negada')
  }

  const offset = (page - 1) * limit

  const { count, rows } = await NormFile.findAndCountAll({
    where: { userId: userIdNum },
    include: {
      model: User,
      attributes: ['id', 'name', 'email'],
    },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  })

  return {
    normFiles: rows,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    },
  }
}

async function getNormFileById(normFileId) {
  const normFile = await NormFile.findByPk(normFileId, {
    include: {
      model: User,
      attributes: ['id', 'name', 'email'],
    },
  })

  if (!normFile) {
    throw new Error('Arquivo não encontrado')
  }

  return normFile
}

async function updateNormFile(normFileId, updates) {
  const normFile = await NormFile.findByPk(normFileId)

  if (!normFile) {
    throw new Error('Arquivo não encontrado')
  }

  if (updates.title !== undefined) {
    normFile.title = updates.title
  }
  if (updates.category !== undefined) {
    normFile.category = updates.category
  }

  await normFile.save()

  return {
    id: normFile.id,
    title: normFile.title,
    category: normFile.category,
    description: normFile.description,
    originalName: normFile.originalName,
    fileType: normFile.fileType,
    ativo: normFile.ativo,
    createdAt: normFile.createdAt,
  }
}

async function toggleAtivoNormFile(normFileId) {
  const normFile = await NormFile.findByPk(normFileId)

  if (!normFile) {
    throw new Error('Arquivo não encontrado')
  }

  normFile.ativo = !normFile.ativo
  await normFile.save()

  return {
    id: normFile.id,
    title: normFile.title,
    ativo: normFile.ativo,
  }
}

async function listarNormasAtivas() {
  const normFiles = await NormFile.findAll({
    where: { ativo: true },
    attributes: ['id', 'title', 'description', 'category', 'filePath', 'filename', 'originalName'],
    order: [['createdAt', 'DESC']],
  })

  return normFiles
}

module.exports = {
  ALLOWED_EXTENSIONS,
  uploadNormFile,
  deleteNormFile,
  listAllNormFiles,
  listNormFilesByUserId,
  getNormFileById,
  toggleAtivoNormFile,
  updateNormFile,
  listarNormasAtivas,
}
