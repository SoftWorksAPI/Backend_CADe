const express = require('express')
const cors = require('cors')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const Startup = require('./config/startup')
const sequelize = require('./config/database')

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors())

// Body parser
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API CADê',
      version: '1.0.0',
      description: 'Documentação da API do sistema CADê',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Logging de requisições
app.use((req, res, next) => {
  const start = Date.now()
  const originalEnd = res.end

  res.end = function (...args) {
    const duration = Date.now() - start
    const status = res.statusCode
    const method = req.method
    const url = req.originalUrl

    // Cores ANSI
    const reset = '\x1b[0m'
    const bold = '\x1b[1m'
    let color
    if (status < 300) color = '\x1b[32m'       // verde
    else if (status < 400) color = '\x1b[36m'   // ciano
    else if (status < 500) color = '\x1b[33m'   // amarelo
    else color = '\x1b[31m'                      // vermelho

    console.log(`${color}${bold}${method}${reset} ${url} → ${color}${status}${reset} (${duration}ms)`)

    originalEnd.apply(res, args)
  }

  next()
})

// Servir arquivos estáticos da pasta /uploads
app.use('/uploads', express.static('uploads'))

// importa os models para o sequelize reconhecer
require('./models/user.model')
require('./models/file.model')
require('./models/normFile.model')
require('./models/report.model')

const userRoutes = require('./routes/user.routes')
const fileRoutes = require('./routes/file.routes')
const normFileRoutes = require('./routes/normFile.routes')
const reportRoutes = require('./routes/report.routes')
const processingRoutes = require('./routes/processing.routes')
const systemRoutes = require('./routes/system.routes')
const chatRoutes = require('./routes/chat.routes')
app.use('/users', userRoutes)
app.use('/files', fileRoutes)
app.use('/norm-files', normFileRoutes)
app.use('/reports', reportRoutes)
app.use('/processing', processingRoutes)
app.use('/system', systemRoutes)
app.use('/chat', chatRoutes)

app.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

// Handler de erros não tratados
app.use((err, req, res, next) => {
  console.error(`\x1b[31m[ERRO] ${req.method} ${req.originalUrl}: ${err.message}\x1b[0m`)
  console.error(err.stack)
  res.status(500).json({ message: 'Erro interno do servidor' })
})

// sincroniza os models com o banco ao subir (com retry)
async function connectDatabase() {
  const delay = 5000
  while (true) {
    try {
      await sequelize.authenticate()
      console.log('Banco conectado')
      await sequelize.sync({ alter: true })
      console.log('Models sincronizados')
      await Startup.initializeAdminUser()
      await Startup.resetStaleProcessingStatus()
      return
    } catch (error) {
      console.error(`Erro ao conectar ao banco: ${error.message}. Tentando novamente em ${delay / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend Node.js rodando na porta ${PORT}`)
    console.log(`Swagger: http://localhost:${PORT}/api-docs`)
  })
})

module.exports = app
