const UserService = require('../services/user.service')

class UserController {

  static async register(req, res) {
    // Somente admins podem criar novos usuários
    try {
      if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const { email, password, name } = req.body
      const user = await UserService.register(email, password, name)
      return res.status(201).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body
      const token = await UserService.login(email, password)
      return res.status(200).json({ token })
    } catch (error) {
      return res.status(401).json({ message: error.message })
    }
  }

  static async promoteAdmin(req, res) {
    // Somente admins podem promover outros usuários
    try {
      if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Acesso negado' })
      }

      const { userId } = req.body
      const user = await UserService.promoteAdmin(userId)
      return res.status(200).json(user)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }

  static async me(req, res) {
    return res.status(200).json(req.user)
  }

}

module.exports = UserController
