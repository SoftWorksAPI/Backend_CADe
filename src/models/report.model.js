const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const User = require('./user.model')
const File = require('./file.model')

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: File,
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  filePath: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Caminho do arquivo no disco do FastAPI',
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Extensao do arquivo: md, pdf, docx, xlsx',
  },
  memorialDescritivo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Memorial descritivo completo em JSON',
  },
  dadosExtracao: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Dados brutos da extracao DXF',
  },
  confianca: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nivel de confianca: alta, media, baixa',
  },
  numInconsistencias: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'concluido',
    comment: 'Status: concluido, erro, revisado',
  },
  tentativasRevisao: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Quantas vezes o relatorio foi revisado',
  },
}, {
  tableName: 'reports',
  timestamps: true,
  underscored: true,
})

Report.belongsTo(File, { foreignKey: 'fileId' })
Report.belongsTo(User, { foreignKey: 'userId' })
File.hasMany(Report, { foreignKey: 'fileId' })

module.exports = Report
