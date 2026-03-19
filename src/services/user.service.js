const User  = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')

class UserService {

  static async register(email, password, name) {
    const alreadyExists = await User.findOne({ where: { email } })
    if (alreadyExists) throw new Error('Email já cadastrado')

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ email, passwordHash, name })

    return { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      createdAt: user.createdAt 
    }
  }

  static async login(email, password) {
    const user = await User.findOne({ where: { email } })
    if (!user) throw new Error('Senha ou Usuário incorretos')

    const valid = await bcrypt.compare(password, user.passwordHash)
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

    user.isAdmin = true
    await user.save()

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      updatedAt: user.updatedAt
    }
  }

}

module.exports = UserService
