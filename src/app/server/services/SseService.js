/**
 * Server-Sent Events (SSE) Broadcast Service
 * Enables real-time synchronization between Synology NAS changes, desktop client actions, and web browsers.
 */

class SseService {
  constructor() {
    this.clients = new Set();

    // Periodic heartbeat to prevent intermediate proxy timeout
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  addClient(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering on NGINX reverse proxy

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const client = {
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      res,
      user: req.user || null
    };

    this.clients.add(client);
    console.log(`[SseService] Client connected: ${client.id} (Active: ${this.clients.size})`);

    // Initial Handshake
    this.sendToClient(client, 'connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
      activeClients: this.clients.size
    });

    req.on('close', () => {
      this.clients.delete(client);
      console.log(`[SseService] Client disconnected: ${client.id} (Active: ${this.clients.size})`);
    });
  }

  sendToClient(client, event, data) {
    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(`[SseService] Error sending to ${client.id}:`, err.message);
      this.clients.delete(client);
    }
  }

  broadcast(event, data) {
    if (this.clients.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.error(`[SseService] Broadcast error for ${client.id}:`, err.message);
        this.clients.delete(client);
      }
    }
  }

  sendHeartbeat() {
    for (const client of this.clients) {
      try {
        client.res.write(': ping\n\n');
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

module.exports = new SseService();
