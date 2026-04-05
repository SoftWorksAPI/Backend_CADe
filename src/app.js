const express = require('express')
const cors = require('cors')
const Startup = require('./config/startup')
const sequelize = require('./config/database')
const app = express()

app.use(cors())
app.use(express.json())

// importa os models para o sequelize reconhecer
require('./models/user.model')

const userRoutes = require('./routes/user.routes')
app.use('/users', userRoutes)

app.get('/', (req, res) => {
  res.send('Hello World')
})

// sincroniza os models com o banco ao subir
sequelize.sync({ alter: true }).then(() => {
  console.log('Banco sincronizado')
  try {
    Startup.initializeAdminUser()
  } catch (error) {
    console.error('Erro ao inicializar admin:', error.message)
  }
})

module.exports = app