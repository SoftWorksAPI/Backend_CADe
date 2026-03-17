const userService = require('../services/user.service')

async function register(req, res) {
  try {
    const { email, password } = req.body
    const user = await userService.register(email, password)
    return res.status(201).json(user)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body
    const token = await userService.login(email, password)
    return res.status(200).json({ token })
  } catch (error) {
    return res.status(401).json({ message: error.message })
  }
}

async function me(req, res) {
  return res.status(200).json(req.user)
}

module.exports = { register, login, me }