const jwt = require('jsonwebtoken')
const User = require('../models/user.model')

/**
 * Middleware de autenticacao para rotas internas.
 *
 * Aceita duas formas de autenticacao:
 * 1. Header x-api-key com chave valida (FastAPI)
 * 2. JWT Bearer token com isAdmin: true (Admin)
 */
async function internalAuthMiddleware(req, res, next) {
  // Opcao 1: API key (FastAPI)
  const apiKey = req.headers['x-api-key']
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return next()
  }

  // Opcao 2: JWT admin
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

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Apenas administradores' })
      }

      req.user = user
      return next()
    } catch (error) {
      return res.status(401).json({ message: 'Token invalido' })
    }
  }

  return res.status(403).json({ message: 'Acesso negado: forneça x-api-key ou JWT admin' })
}

module.exports = internalAuthMiddleware
