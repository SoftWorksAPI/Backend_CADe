const jwt = require('jsonwebtoken')
const User = require('../models/user.model')

/**
 * Middleware de autenticacao que aceita:
 * 1. Header x-api-key com chave valida (FastAPI) — sem req.user
 * 2. JWT Bearer token valido (qualquer usuario autenticado) — com req.user
 */
async function authOrApiKeyMiddleware(req, res, next) {
  // Opcao 1: API key (FastAPI)
  const apiKey = req.headers['x-api-key']
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return next()
  }

  // Opcao 2: JWT Bearer token
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'email', 'isAdmin'],
      })

      if (!user) {
        return res.status(401).json({ message: 'Usuario nao encontrado' })
      }

      req.user = user
      return next()
    } catch (error) {
      return res.status(401).json({ message: 'Token invalido' })
    }
  }

  return res.status(401).json({ message: 'Autenticacao necessaria: forneça Bearer token ou x-api-key' })
}

module.exports = authOrApiKeyMiddleware
