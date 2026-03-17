const User  = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')

async function register(email, password) {
  const existing = await User.findOne({ where: { email } })
  if (existing) throw new Error('Email já cadastrado')

  const password_hash = await bcrypt.hash(password, 10)

  const user = await User.create({ email, password_hash })

  // retorna sem o password_hash
  return { id: user.id, email: user.email, created_at: user.created_at }
}

async function login(email, password) {
  const user = await User.findOne({ where: { email } })
  if (!user) throw new Error('Usuário não encontrado')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('Senha incorreta')

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  return token
}

module.exports = { register, login }