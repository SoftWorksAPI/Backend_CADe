const File = require('../models/file.model');
const Report = require('../models/report.model');
const User = require('../models/user.model');
const path = require('path');
const fs = require('fs').promises;

/**
 * Serviço de upload de arquivo DXF
 * Responsável pela lógica de negócio
 */

/**
 * Salvar arquivo no filesystem
 */
async function saveFileToFilesystem(fileBuffer, originalName) {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${Date.now()}-${originalName}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, fileBuffer);

    return {
      filename,
      filePath: `/uploads/${filename}`,
    };
  } catch (err) {
    throw new Error(`Erro ao salvar arquivo no servidor: ${err.message}`);
  }
}

/**
 * Salvar metadados do arquivo no banco de dados
 */
async function saveFileMetadataToDatabase(fileData, userId) {
  try {
    const file = await File.create({
      originalName: fileData.originalName,
      filename: fileData.filename,
      filePath: fileData.filePath,
      fileSize: fileData.fileSize,
      userId: userId,
      description: fileData.description || null,
    });

    return file;
  } catch (err) {
    throw new Error(`Erro ao salvar metadados no banco: ${err.message}`);
  }
}

/**
 * Fazer upload completo (arquivo + metadados)
 */
async function uploadFile(file, fileData, userId) {
  try {
    // Salvar arquivo no filesystem
    const savedFile = await saveFileToFilesystem(file.buffer, file.originalname);

    // Salvar metadados no banco
    const fileRecord = await saveFileMetadataToDatabase(
      {
        originalName: file.originalname,
        filename: savedFile.filename,
        filePath: savedFile.filePath,
        fileSize: file.size,
        description: fileData.description,
      },
      userId
    );

    return {
      id: fileRecord.id,
      originalName: fileRecord.originalName,
      filename: fileRecord.filename,
      fileSize: fileRecord.fileSize,
      createdAt: fileRecord.createdAt,
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Deletar arquivo (filesystem + banco)
 */
async function deleteFile(fileId, userId, isAdmin) {
  try {
    const file = await File.findByPk(fileId);

    if (!file) {
      throw new Error('Arquivo não encontrado');
    }

    // Converter para número para evitar problemas de comparação de tipo
    const fileUserIdNum = parseInt(file.userId, 10);
    const userIdNum = parseInt(userId, 10);

    // Verificar permissão
    if (fileUserIdNum !== userIdNum && !isAdmin) {
      throw new Error('Permissão negada');
    }

    // Deletar todos os relatórios associados (arquivos + banco)
    const reports = await Report.findAll({ where: { fileId: parseInt(fileId, 10) } });
    for (const report of reports) {
      if (report.filePath) {
        try {
          const reportFilename = path.basename(report.filePath);
          const reportAbsPath = path.join(__dirname, '../../uploads/reports', reportFilename);
          await fs.unlink(reportAbsPath);
        } catch (err) {
          console.warn('Aviso: arquivo de relatório não encontrado:', report.filePath);
        }
      }
      await report.destroy();
    }

    // Deletar arquivo DXF físico
    const filePath = path.join(__dirname, '../../uploads', file.filename);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Aviso: arquivo físico não encontrado', filePath);
    }

    // Deletar do banco
    await file.destroy();

    return { message: 'Arquivo deletado com sucesso' };
  } catch (err) {
    throw err;
  }
}

/**
 * Listar todos os arquivos com paginação (Admin vê todos, usuário só vê seus)
 */
async function listAllFiles(page = 1, limit = 10, userId = null, isAdmin = false) {
  try {
    const offset = (page - 1) * limit;

    const where = {};
    if (!isAdmin && userId) {
      where.userId = parseInt(userId, 10);
    }

    const { count, rows } = await File.findAndCountAll({
      where,
      include: {
        model: User,
        attributes: ['id', 'name', 'email'],
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      files: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  } catch (err) {
    throw new Error(`Erro ao listar arquivos: ${err.message}`);
  }
}

/**
 * Listar arquivos de um usuário específico
 */
async function listFilesByUserId(userId, requestUserId, isAdmin, page = 1, limit = 10) {
  try {
    // Converter para número para evitar problemas de comparação de tipo
    const userIdNum = parseInt(userId, 10);
    const requestUserIdNum = parseInt(requestUserId, 10);

    // Verificar se o usuário existe
    const user = await User.findByPk(userIdNum);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar permissão
    if (userIdNum !== requestUserIdNum && !isAdmin) {
      throw new Error('Permissão negada');
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await File.findAndCountAll({
      where: { userId: userIdNum },
      include: {
        model: User,
        attributes: ['id', 'name', 'email'],
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      files: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Obter arquivo por ID
 */
async function getFileById(fileId, userId, isAdmin) {
  try {
    const file = await File.findByPk(fileId, {
      include: {
        model: User,
        attributes: ['id', 'name', 'email'],
      },
    });

    if (!file) {
      throw new Error('Arquivo não encontrado');
    }

    // Converter para número para evitar problemas de comparação de tipo
    const fileUserIdNum = parseInt(file.userId, 10);
    const userIdNum = parseInt(userId, 10);

    // Verificar permissão
    if (fileUserIdNum !== userIdNum && !isAdmin) {
      throw new Error('Permissão negada');
    }

    return file;
  } catch (err) {
    throw err;
  }
}

/**
 * Substituir arquivo DXF de um projeto existente
 */
async function replaceFile(fileId, newFileBuffer, newOriginalName, newFileSize, userId, isAdmin) {
  try {
    const file = await File.findByPk(fileId);

    if (!file) {
      throw new Error('Arquivo não encontrado');
    }

    const fileUserIdNum = parseInt(file.userId, 10);
    const userIdNum = parseInt(userId, 10);

    if (fileUserIdNum !== userIdNum && !isAdmin) {
      throw new Error('Permissão negada');
    }

    // Validar extensao .dxf
    if (!newOriginalName.toLowerCase().endsWith('.dxf')) {
      throw new Error('Apenas arquivos .dxf são aceitos');
    }

    // Salvar novo arquivo no filesystem
    const savedFile = await saveFileToFilesystem(newFileBuffer, newOriginalName);

    // Deletar arquivo antigo do disco
    const oldFilePath = path.join(__dirname, '../../uploads', file.filename);
    try {
      await fs.unlink(oldFilePath);
    } catch (err) {
      console.warn('Aviso: arquivo antigo não encontrado:', oldFilePath);
    }

    // Atualizar registro no banco
    file.originalName = newOriginalName;
    file.filename = savedFile.filename;
    file.filePath = savedFile.filePath;
    file.fileSize = newFileSize;
    file.processingStatus = 'idle';
    file.markdownContent = null;
    await file.save();

    return file;
  } catch (err) {
    throw err;
  }
}

/**
 * Adicionar conteúdo markdown a um arquivo
 */
async function addMarkdownToFile(fileId, userId, isAdmin, markdownContent) {
  try {
    const file = await File.findByPk(fileId);

    if (!file) {
      throw new Error('Arquivo não encontrado');
    }

    // Converter para número para evitar problemas de comparação de tipo
    const fileUserIdNum = parseInt(file.userId, 10);
    const userIdNum = parseInt(userId, 10);

    // Verificar permissão
    if (fileUserIdNum !== userIdNum && !isAdmin) {
      throw new Error('Permissão negada');
    }

    // Validar conteúdo
    if (!markdownContent || !markdownContent.trim()) {
      throw new Error('Conteúdo markdown não pode estar vazio');
    }

    // Atualizar arquivo com conteúdo markdown
    file.markdownContent = markdownContent;
    await file.save();

    return {
      id: file.id,
      originalName: file.originalName,
      markdownContent: file.markdownContent,
      updatedAt: file.updatedAt,
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Atualizar titulo do arquivo
 */
async function updateFileTitle(fileId, title, userId, isAdmin) {
  const file = await File.findByPk(fileId);

  if (!file) {
    throw new Error('Arquivo não encontrado');
  }

  const fileUserIdNum = parseInt(file.userId, 10);
  const userIdNum = parseInt(userId, 10);

  if (fileUserIdNum !== userIdNum && !isAdmin) {
    throw new Error('Permissão negada');
  }

  file.title = title || null;
  await file.save();

  return file;
}

module.exports = {
  saveFileToFilesystem,
  saveFileMetadataToDatabase,
  uploadFile,
  replaceFile,
  deleteFile,
  listAllFiles,
  listFilesByUserId,
  getFileById,
  addMarkdownToFile,
  updateFileTitle,
};
