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

  static async updateUserById(id, updates, exceptions = []) {
    const user = await User.findByPk(id)
    if (!user) throw new Error('Usuário não encontrado')
    // Campos sempre protegidos
    const protectedFields = ['id', 'email', 'createdAt', 'updatedAt', 'passwordHash', ...exceptions]
    // Atualizar apenas os campos fornecidos que não estão na lista de exceções
    Object.keys(updates).forEach(
      key => {
        if (!protectedFields.includes(key)) {
          user[key] = updates[key]
        }
      }
    )

    await user.save()

    const userData = {
      id: user.id,
      updatedAt: user.updatedAt
    }

    return {
      message: 'Usuário atualizado com sucesso',
      user: userData
    }
  }

  static async changePassword(id, newPassword, oldPassword = null, isAdmin = false) {
    const user = await User.findByPk(id)
    if (!user) throw new Error('Usuário não encontrado')

    if (!isAdmin) {
      const valid = await bcrypt.compare(oldPassword, user.passwordHash)
      if (!valid) throw new Error('Senha incorreta')
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    user.passwordHash = passwordHash
    await user.save()

    const userData = {
      id: user.id,
      updatedAt: user.updatedAt
    }

    return {
      message: 'Senha atualizada com sucesso',
      user: userData
    }
  }
}

module.exports = UserService
