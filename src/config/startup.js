require('dotenv').config()
const bcrypt = require('bcrypt')
const User = require('../models/user.model')

class Startup {

    // Cria um usuário admin padrão se ele não existir
    static async initializeAdminUser() {
        try {
            const adminExists = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } })
            
            if (!adminExists) {
            const password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
            
            await User.create({
                email: process.env.ADMIN_EMAIL,
                name: 'Admin',
                password_hash,
                is_admin: true
            })
            console.log('User Admin criado')
            }
        } catch (error) {
            console.error('Erro ao criar admin:', error.message)
        }
    }
}

module.exports = Startup