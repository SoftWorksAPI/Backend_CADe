const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

/**
 * Model para configuracoes do sistema (key-value).
 * Usado para armazenar configuracao de IA (provider, model, api_key, etc.)
 */
const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'system_settings',
  timestamps: true,
  underscored: true,
})

module.exports = SystemSetting
