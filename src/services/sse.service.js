/**
 * Servico SSE (Server-Sent Events) para notificar o frontend em tempo real.
 */

const clients = new Set()

/**
 * Adiciona uma conexao SSE ao pool de clientes.
 */
function addClient(res) {
  clients.add(res)
  res.on('close', () => {
    clients.delete(res)
  })
}

/**
 * Envia um evento para todos os clientes conectados.
 * @param {string} event - Nome do evento (ex: 'file-updated', 'report-updated')
 * @param {object} data - Dados do evento
 */
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      client.write(message)
    } catch {
      clients.delete(client)
    }
  }
}

/**
 * Retorna o numero de clientes conectados.
 */
function getClientCount() {
  return clients.size
}

module.exports = { addClient, broadcast, getClientCount }
