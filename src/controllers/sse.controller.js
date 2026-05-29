const sseService = require('../services/sse.service')

/**
 * GET /events — Abre conexao SSE para o frontend receber atualizacoes em tempo real.
 */
function streamEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Nginx proxy compatibility
  })

  // Enviar evento inicial para confirmar conexao
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)

  sseService.addClient(res)

  // Keepalive a cada 30s
  const keepalive = setInterval(() => {
    try {
      res.write(': keepalive\n\n')
    } catch {
      clearInterval(keepalive)
    }
  }, 30000)

  res.on('close', () => {
    clearInterval(keepalive)
  })
}

module.exports = { streamEvents }
