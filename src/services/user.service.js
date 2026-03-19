const User  = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')

class UserService {

  static async register(email, password, name) {
    const alreadyExists = await User.findOne({ where: { email } })
    if (alreadyExists) throw new Error('Email já cadastrado')

    const password_hash = await bcrypt.hash(password, 10)
    const user = await User.create({ email, password_hash, name })

    return { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      created_at: user.created_at 
    }
  }

  static async login(email, password) {
    const user = await User.findOne({ where: { email } })
    if (!user) throw new Error('Senha ou Usuário incorretos')

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) throw new Error('Senha ou Usuário incorretos')

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return token
  }

  static async promoteAdmin(userId) {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('Usuário não encontrado')

    user.is_admin = true
    await user.save()

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      updated_at: user.updated_at
    }
  }

}

module.exports = UserService
