const File = require('../models/file.model');
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

    // Deletar arquivo físico
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
 * Listar todos os arquivos com paginação
 */
async function listAllFiles(page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    const { count, rows } = await File.findAndCountAll({
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

module.exports = {
  saveFileToFilesystem,
  saveFileMetadataToDatabase,
  uploadFile,
  deleteFile,
  listAllFiles,
  listFilesByUserId,
  getFileById,
};
