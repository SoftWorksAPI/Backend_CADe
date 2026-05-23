<<<<<<< Updated upstream
const express = require('express');
=======
const express = require('express')
const cors = require('cors')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const Startup = require('./config/startup')
const sequelize = require('./config/database')
const app = express()
>>>>>>> Stashed changes

const app = express();
const PORT = process.env.PORT || 3000;

<<<<<<< Updated upstream
app.use(express.json());
=======
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

// Servir arquivos estáticos da pasta /uploads
app.use('/uploads', express.static('uploads'))

// importa os models para o sequelize reconhecer
require('./models/user.model')
require('./models/file.model')
require('./models/normFile.model')

const userRoutes = require('./routes/user.routes')
const fileRoutes = require('./routes/file.routes')
const normFileRoutes = require('./routes/normFile.routes')
app.use('/users', userRoutes)
app.use('/files', fileRoutes)
app.use('/norm-files', normFileRoutes)
>>>>>>> Stashed changes

app.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

<<<<<<< Updated upstream
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
=======
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
      return
    } catch (error) {
      console.error(`Erro ao conectar ao banco: ${error.message}. Tentando novamente em ${delay / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

connectDatabase()

module.exports = app
>>>>>>> Stashed changes
