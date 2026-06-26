const File = require('../models/file.model')
const Report = require('../models/report.model')
const fs = require('fs')
const path = require('path')
const pythonClient = require('../services/pythonClient.service')

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports')

/**
 * Helper: buscar jsons do disco para um fileId
 */
async function _getJsonsFromDisk(fileId) {
  const jsonReports = await Report.findAll({
    where: { fileId: parseInt(fileId, 10), fileType: 'json' },
    order: [['createdAt', 'DESC']],
  })

  let jsonCru = null
  let jsonTratado = null

  for (const report of jsonReports) {
    if (!report.filePath) continue
    const filename = path.basename(report.filePath)
    const absPath = path.join(REPORTS_DIR, filename)
    if (!fs.existsSync(absPath)) continue

    const content = fs.readFileSync(absPath, 'utf-8')
    const parsed = JSON.parse(content)

    if (filename.includes('json_cru')) {
      jsonCru = parsed
    } else if (filename.includes('json_tratado')) {
      jsonTratado = parsed
    }
  }

  return { jsonCru, jsonTratado }
}

/**
 * Enviar mensagem ao chat IA sobre um projeto processado
 */
async function sendMessage(req, res) {
  try {
    const { fileId, pergunta, historico } = req.body
    const userId = req.user.id

    if (!fileId || !pergunta) {
      return res.status(400).json({ message: 'fileId e pergunta sao obrigatorios' })
    }

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

    // Buscar JSONs do disco
    const { jsonCru, jsonTratado } = await _getJsonsFromDisk(fileId)
    if (!jsonCru || !jsonTratado) {
      return res.status(404).json({
        message: 'JSONs de extracao nao encontrados. Execute a pipeline principal primeiro.',
      })
    }

    // Buscar TODOS os reports do projeto (nao so JSONs)
    const allReports = await Report.findAll({
      where: { fileId: parseInt(fileId, 10) },
      order: [['createdAt', 'DESC']],
    })

    const reportsParaChat = allReports
      .filter(r => r.filePath)
      .map(r => {
        // Converter caminho de URL para caminho de filesystem
        const filename = path.basename(r.filePath)
        const absPath = path.join(REPORTS_DIR, filename)
        const exists = fs.existsSync(absPath)
        console.log(`[CHAT] Report: ${r.title} | fileType: ${r.fileType} | filePath: ${r.filePath} | absPath: ${absPath} | exists: ${exists}`)
        return {
          title: r.title,
          filePath: exists ? absPath : r.filePath,
          fileType: r.fileType || '',
        }
      })

    // Chamar Python
    const response = await pythonClient.chatMessage(
      jsonCru,
      jsonTratado,
      pergunta,
      historico || [],
      reportsParaChat
    )

    return res.status(200).json(response)
  } catch (err) {
    console.error('Erro no chat:', err.message)
    return res.status(500).json({ message: err.message })
  }
}

module.exports = {
  sendMessage,
}
