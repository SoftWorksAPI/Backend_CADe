require('dotenv').config()
const bcrypt = require('bcrypt')
const User = require('../models/user.model')

class Startup {

    // Cria um usuário admin padrão se ele não existir
    static async initializeAdminUser() {
        try {
            const adminExists = await User.findOne({ where: { isAdmin: true } })
            
            if (!adminExists) {
                const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
                
                await User.create({
                    email: process.env.ADMIN_EMAIL,
                    name: 'Admin',
                    passwordHash,
                    isAdmin: true
                })
                console.log('User Admin criado')
            }
        } catch (error) {
            console.error('Erro ao criar admin:', error.message)
        }
    }
}

module.exports = Startup