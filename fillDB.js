const bcrypt = require('bcrypt')
const { Sequelize } = require('sequelize')
require('dotenv').config()
const User = require('./src/models/user.model.js')
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST,
    port:    process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // mude para console.log para ver as queries
  }
)

async function fillDB() {
  try {
    console.log('📝 Iniciando preenchimento do banco...\n')
    
    // Verificar variáveis de ambiente
    console.log('🔍 Verificando variáveis de ambiente:')
    console.log('  DB_HOST:', process.env.DB_HOST || '❌ NÃO DEFINIDO')
    console.log('  DB_PORT:', process.env.DB_PORT || '❌ NÃO DEFINIDO')
    console.log('  DB_NAME:', process.env.DB_NAME || '❌ NÃO DEFINIDO')
    console.log('  DB_USER:', process.env.DB_USER || '❌ NÃO DEFINIDO')
    console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '✓ DEFINIDO' : '❌ NÃO DEFINIDO')
    
    console.log('\n⏳ Tentando conectar ao banco...')
    
    // Conectar ao banco
    await sequelize.authenticate()
    console.log('✓ Conectado ao banco de dados')
    
    // Sincronizar modelos com banco
    console.log('\n⏳ Sincronizando modelos com banco...')
    await sequelize.sync({ alter: true })
    console.log('✓ Banco sincronizado\n')

    // Limpar usuários antigos (opcional)
    console.log('🗑️  Limpando usuários antigos...')
    await User.destroy({ where: {} })
    console.log('✓ Usuarios antigos removidos\n')

    // Hash da senha
    const password = '123456'
    const passwordHash = await bcrypt.hash(password, 10)
    console.log(`✓ Senha hasheada\n`)

    // Criar 50 usuários
    console.log('Criando usuários...')
    for (let index = 0; index < 50; index++) {
      await User.create({
        email: `user${index + 1}@example.com`,
        name: `User ${index + 1}`,
        passwordHash,
        isAdmin: false
      })
      
      if ((index + 1) % 10 === 0) {
        console.log(`  ${index + 1}/50 usuários criados`)
      }
    }

    console.log('\n✓ Banco preenchido com sucesso!')
    console.log(`✓ Total: 50 usuários`)
    console.log(`✓ Email: user1@example.com até user50@example.com`)
    console.log(`✓ Senha: ${password}`)

  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    console.error('Stack completo:', error.stack)
  } finally {
    if (sequelize) {
      await sequelize.close()
      console.log('\n✓ Conexão fechada')
    }
  }
}

fillDB()