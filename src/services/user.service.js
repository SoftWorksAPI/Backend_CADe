const User  = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')

class UserService {

  static async register(email, password, name) {
    const alreadyExists = await User.findOne({ where: { email } })
    if (alreadyExists) throw new Error('Email já cadastrado')

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ email, passwordHash, name })

    const userData = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      createdAt: user.createdAt 
    }

    return {
      message: 'Usuário registrado com sucesso',
      user: userData
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

  static async toggleAdmin(userId) {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('Usuário não encontrado')

    user.isAdmin = !user.isAdmin
    await user.save()

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      updatedAt: user.updatedAt
    }

    return {
      message: 'Usuário atualizado com sucesso',
      user: userData
    }
  }

  static async delete(userId) {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('Usuário não encontrado')

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email
    }

    await user.destroy()
    return { 
      message: 'Usuário deletado com sucesso', 
      user: userData 
    }
  }

  static async listAll(page, limit) {
    const offset = (page - 1) * limit
    const { count, rows } = await User.findAndCountAll({
      attributes: ['id', 'email', 'name', 'isAdmin', 'createdAt', 'updatedAt'],
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    })
    
    return {
      users: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit)
    }
  }

  static async getById(id) {
    const user = await User.findByPk(id, {
      attributes: ['id', 'email', 'name', 'isAdmin', 'createdAt', 'updatedAt']
    })
    if (!user) throw new Error('Usuário não encontrado')

    return user
  }

}

module.exports = UserService
