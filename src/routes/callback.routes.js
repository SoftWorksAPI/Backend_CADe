const express = require('express')
const router = express.Router()
const { pipelineCallback, reportCallback } = require('../controllers/callback.controller')

// POST /callback/pipeline — recebe resultado do pipeline DXF
router.post('/callback/pipeline', pipelineCallback)

// POST /callback/report — recebe resultado de geracao de relatorio
router.post('/callback/report', reportCallback)

module.exports = router
