const path = require('path')
const normFileService = require('../services/normFile.service')

function validateNormFile(file) {
  if (!file) {
    throw new Error('Nenhum arquivo foi enviado')
  }

  const ext = path.extname(file.originalname).toLowerCase()

  if (!normFileService.ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Apenas arquivos ${normFileService.ALLOWED_EXTENSIONS.join(', ')} são permitidos`)
  }

  if (file.size === 0) {
    throw new Error('Arquivo está vazio')
  }

  return true
}

async function uploadNormFile(req, res) {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Apenas administradores podem enviar normas' })
    }

    validateNormFile(req.file)

    const { title, description, category } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Título é obrigatório' })
    }

    if (!category) {
      return res.status(400).json({ message: 'Categoria é obrigatória' })
    }

    const result = await normFileService.uploadNormFile(
      req.file,
      { title, description, category },
      req.user.id
    )

    return res.status(201).json({
      message: 'Arquivo de norma enviado com sucesso',
      normFile: result,
    })
  } catch (err) {
    console.error('Erro ao fazer upload de norma:', err)
    return res.status(400).json({ message: err.message })
  }
}

async function deleteNormFile(req, res) {
  try {
    const { id } = req.params

    await normFileService.deleteNormFile(id, req.user.id, req.user.isAdmin)

    return res.status(200).json({ message: 'Arquivo de norma deletado com sucesso' })
  } catch (err) {
    console.error('Erro ao deletar norma:', err)

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message })
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message })
    }

    return res.status(500).json({ message: err.message })
  }
}

async function listAllNormFiles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const category = req.query.category || null

    const result = await normFileService.listAllNormFiles(page, limit, category)

    return res.status(200).json(result)
  } catch (err) {
    console.error('Erro ao listar normas:', err)
    return res.status(500).json({ message: err.message })
  }
}

async function listNormFilesByUserId(req, res) {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    const result = await normFileService.listNormFilesByUserId(
      userId,
      req.user.id,
      req.user.isAdmin,
      page,
      limit
    )

    return res.status(200).json(result)
  } catch (err) {
    console.error('Erro ao listar normas do usuário:', err)

    if (err.message === 'Usuário não encontrado') {
      return res.status(404).json({ message: err.message })
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message })
    }

    return res.status(500).json({ message: err.message })
  }
}

async function getNormFileById(req, res) {
  try {
    const { id } = req.params

    const normFile = await normFileService.getNormFileById(id)

    return res.status(200).json(normFile)
  } catch (err) {
    console.error('Erro ao obter norma:', err)

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message })
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message })
    }

    return res.status(500).json({ message: err.message })
  }
}

async function toggleAtivoNormFile(req, res) {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Apenas administradores podem alterar status de normas' })
    }

    const { id } = req.params
    const result = await normFileService.toggleAtivoNormFile(id)
    return res.status(200).json({
      message: `Norma ${result.ativo ? 'ativada' : 'desativada'} com sucesso`,
      normFile: result,
    })
  } catch (err) {
    console.error('Erro ao alterar status da norma:', err)

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message })
    }

    return res.status(500).json({ message: err.message })
  }
}

async function listarNormasAtivas(req, res) {
  try {
    const normas = await normFileService.listarNormasAtivas()
    return res.status(200).json({ normas })
  } catch (err) {
    console.error('Erro ao listar normas ativas:', err)
    return res.status(500).json({ message: err.message })
  }
}

module.exports = {
  uploadNormFile,
  deleteNormFile,
  listAllNormFiles,
  listNormFilesByUserId,
  getNormFileById,
  toggleAtivoNormFile,
  listarNormasAtivas,
}
