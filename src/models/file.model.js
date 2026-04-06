const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const User = require('./user.model')

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  markdownContent: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Conteúdo do arquivo markdown gerado',
  },
}, {
  tableName: 'files',
  timestamps: true,
  underscored: true,
})

// Definir relacionamento
File.belongsTo(User, { foreignKey: 'userId' })

module.exports = File
