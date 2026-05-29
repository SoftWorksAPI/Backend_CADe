const fileService = require('../services/file.service');

/**
 * Validar arquivo DXF
 */
function validateDXFFile(file) {
  if (!file) {
    throw new Error('Nenhum arquivo foi enviado');
  }

  if (!file.originalname.toLowerCase().endsWith('.dxf')) {
    throw new Error('Apenas arquivos .dxf são permitidos');
  }

  if (file.size === 0) {
    throw new Error('Arquivo está vazio');
  }

  return true;
}

/**
 * Upload de arquivo DXF
 */
async function uploadFile(req, res) {
  try {
    // Validar antes de enviar ao service
    validateDXFFile(req.file);

    const result = await fileService.uploadFile(
      req.file,
      {
        description: req.body.description,
      },
      req.user.id
    );

    return res.status(201).json({
      message: 'Arquivo enviado com sucesso',
      file: result,
    });
  } catch (err) {
    console.error('Erro ao fazer upload:', err);
    return res.status(400).json({ message: err.message });
  }
}

/**
 * Substituir arquivo DXF de um projeto existente
 */
async function replaceFile(req, res) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    // Validar extensão .dxf
    const originalName = req.file.originalname;
    if (!originalName.toLowerCase().endsWith('.dxf')) {
      return res.status(400).json({ message: 'Apenas arquivos .dxf são aceitos' });
    }

    const result = await fileService.replaceFile(
      id,
      req.file.buffer,
      originalName,
      req.file.size,
      req.user.id,
      req.user.isAdmin
    );

    return res.status(200).json({
      message: 'Arquivo substituído com sucesso',
      file: {
        id: result.id,
        originalName: result.originalName,
        filename: result.filename,
        fileSize: result.fileSize,
        processingStatus: result.processingStatus,
      },
    });
  } catch (err) {
    console.error('Erro ao substituir arquivo:', err);

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message });
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message });
    }

    if (err.message === 'Apenas arquivos .dxf são aceitos') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message });
  }
}

/**
 * Deletar arquivo por ID
 */
async function deleteFile(req, res) {
  try {
    const { id } = req.params;

    await fileService.deleteFile(id, req.user.id, req.user.isAdmin);

    return res.status(200).json({ message: 'Arquivo deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar arquivo:', err);

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message });
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message });
  }
}

/**
 * Listar todos os arquivos (com paginação)
 */
async function listAllFiles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await fileService.listAllFiles(page, limit, req.user.id, req.user.isAdmin);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Erro ao listar arquivos:', err);
    return res.status(500).json({ message: err.message });
  }
}

/**
 * Listar arquivos de um usuário específico
 */
async function listFilesByUserId(req, res) {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await fileService.listFilesByUserId(
      userId,
      req.user.id,
      req.user.isAdmin,
      page,
      limit
    );

    return res.status(200).json(result);
  } catch (err) {
    console.error('Erro ao listar arquivos do usuário:', err);

    if (err.message === 'Usuário não encontrado') {
      return res.status(404).json({ message: err.message });
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message });
  }
}

/**
 * Obter arquivo por ID
 */
async function getFileById(req, res) {
  try {
    const { id } = req.params;

    const file = await fileService.getFileById(id, req.user.id, req.user.isAdmin);

    return res.status(200).json(file);
  } catch (err) {
    console.error('Erro ao obter arquivo:', err);

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message });
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message });
  }
}

/**
 * Adicionar conteúdo markdown a um arquivo
 */
async function addMarkdown(req, res) {
  try {
    const { id } = req.params;
    const { markdownContent } = req.body;

    if (!markdownContent) {
      return res.status(400).json({ message: 'Conteúdo markdown é obrigatório' });
    }

    const result = await fileService.addMarkdownToFile(
      id,
      req.user.id,
      req.user.isAdmin,
      markdownContent
    );

    return res.status(200).json({
      message: 'Markdown adicionado com sucesso',
      file: result,
    });
  } catch (err) {
    console.error('Erro ao adicionar markdown:', err);

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message });
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message });
    }

    if (err.message.includes('vazio')) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message });
  }
}

/**
 * Atualizar titulo do arquivo
 */
async function updateFileTitle(req, res) {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const file = await fileService.updateFileTitle(id, title, req.user.id, req.user.isAdmin);

    return res.status(200).json({ message: 'Titulo atualizado', file });
  } catch (err) {
    console.error('Erro ao atualizar titulo:', err);

    if (err.message === 'Arquivo não encontrado') {
      return res.status(404).json({ message: err.message });
    }

    if (err.message === 'Permissão negada') {
      return res.status(403).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  validateDXFFile,
  uploadFile,
  replaceFile,
  deleteFile,
  listAllFiles,
  listFilesByUserId,
  getFileById,
  addMarkdown,
  updateFileTitle,
};
