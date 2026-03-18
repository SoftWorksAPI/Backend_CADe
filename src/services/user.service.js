const User  = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')

async function register(email, password, name) {
  const existing = await User.findOne({ where: { email } })
  if (existing) throw new Error('Email já cadastrado')

  const password_hash = await bcrypt.hash(password, 10)

  const user = await User.create({ email, password_hash, name })

  // retorna sem o password_hash
  return { id: user.id, email: user.email, name: user.name, created_at: user.created_at }
}

async function login(email, password) {
  const user = await User.findOne({ where: { email } })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!user || !valid) throw new Error('Senha ou Usuário incorretos')

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  return token
}

async function promoteAdmin(token, userId) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  const requester = await User.findByPk(decoded.id)

  if (!requester || !requester.is_admin) throw new Error('Acesso negado')

  const user = await User.findByPk(userId)
  if (!user) throw new Error('Usuário não encontrado')

  user.is_admin = true
  await user.save()

  return user
}

module.exports = { register, login, promoteAdmin }
