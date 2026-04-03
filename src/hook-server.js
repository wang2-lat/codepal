/**
 * Hook HTTP server — receives events from Claude Code hooks.
 * Listens on 127.0.0.1:23456
 */
const express = require('express');

const PORT = 23456;

function startHookServer(onEvent) {
  const app = express();
  app.use(express.json());

  // Claude Code hooks POST here
  app.post('/hook/:eventType', (req, res) => {
    const eventType = req.params.eventType;
    const body = req.body || {};

    const event = {
      type: eventType,
      tool: body.tool_name || body.tool || null,
      success: body.success !== undefined ? body.success : null,
      timestamp: Date.now(),
      data: body,
    };

    try {
      onEvent(event);
    } catch (e) {
      // Don't crash the server
    }

    res.json({ ok: true });
  });

  // Health check
  app.get('/status', (req, res) => {
    res.json({ alive: true, pet: 'codepal', port: PORT });
  });

  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[CodePal] Hook server listening on 127.0.0.1:${PORT}`);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`[CodePal] Port ${PORT} already in use, another instance may be running`);
    }
  });

  return server;
}

module.exports = { startHookServer, PORT };
