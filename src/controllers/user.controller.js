const UserService = require('../services/user.service')

class UserController {

  // Registrar User
  static async register(req, res) {
    // Somente admins podem criar novos usuários
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const { email, password, name } = req.body
      const user = await UserService.register(email, password, name)
      return res.status(201).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  //Logar User
  static async login(req, res) {
    try {
      const { email, password } = req.body
      const token = await UserService.login(email, password)
      return res.status(200).json({ token })
    } catch (error) {
      return res.status(401).json({ message: error.message })
    }
  }

  static async updateUserById(req, res) {
    try {
      const { id } = req.params

      if (!req.user.isAdmin && req.user.id.toString() !== id) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const user = await UserService.updateUserById(id, req.body)

      return res.status(200).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  static async changePassword(req, res) {
    try {
      const { id, newPassword, oldPassword } = req.body

      if (!req.user.isAdmin && req.user.id.toString() !== id) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const user = await UserService.changePassword(id, newPassword, oldPassword, req.user.isAdmin)

      return res.status(200).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }
  //Deletar User por ID
  static async deleteById(req, res) {
    // Somente admins podem excluir outros usuários
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const { userId } = req.params
      const user = await UserService.delete(userId)
      return res.status(200).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  //Listar Todos os User com Paginação
  static async listAll(req, res) {
    // Somente admins podem listar todos os usuários
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const { page, limit } = req.query
      const users = await UserService.listAll(page, limit)
      return res.status(200).json(users)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  // Obter User por ID
  static async getById(req, res) {
    try {
      const { id } = req.params
      console.log('ID do usuário token:', req.user.id, 'ID solicitado:', id)

      if (!req.user.isAdmin && req.user.id.toString() !== id) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const user = await UserService.getById(id)
      return res.status(200).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  // Obter perfil do usuário logado
  static async me(req, res) {
    return res.status(200).json(req.user)
  }

}

module.exports = UserController
