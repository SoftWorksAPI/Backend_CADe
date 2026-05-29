const express = require('express')
const router = express.Router()
const { streamEvents } = require('../controllers/sse.controller')

// GET /events — SSE stream (sem auth, qualquer cliente pode escutar)
router.get('/events', streamEvents)

module.exports = router
