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
    static async initializeAIConfig() {
        try {
            const SystemSetting = require('../models/aiConfig.model')
            const defaults = [
                { key: 'ai_provider', value: 'openrouter' },
                { key: 'ai_model', value: 'openai/gpt-oss-120b:free' },
                { key: 'ai_api_key', value: '' },
                { key: 'ai_base_url', value: 'https://openrouter.ai/api/v1/chat/completions' },
            ]
            for (const { key, value } of defaults) {
                await SystemSetting.findOrCreate({ where: { key }, defaults: { value } })
            }
            console.log('Config de IA inicializada')
        } catch (error) {
            console.error('Erro ao inicializar config de IA:', error.message)
        }
    }

    static async resetStaleProcessingStatus() {
        try {
            const File = require('../models/file.model')
            const [affected] = await File.update(
                { processingStatus: 'erro' },
                { where: { processingStatus: ['processando', 'gerando'] } }
            )
            if (affected > 0) {
                console.log(`Reset ${affected} arquivo(s) com status stale para 'erro'`)
            }
        } catch (error) {
            console.error('Erro ao resetar status stale:', error.message)
        }
    }
}

module.exports = Startup