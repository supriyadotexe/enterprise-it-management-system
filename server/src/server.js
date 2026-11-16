import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(
    `[api] ${env.serviceName} listening on http://localhost:${env.port} ` +
      `(${env.nodeEnv}, ${env.appTimezone})`,
  );
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[api] Port ${env.port} is already in use.`);
  } else {
    console.error('[api] Failed to start', error);
  }
  process.exitCode = 1;
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, closing server`);

  server.close(() => {
    console.log('[api] Closed cleanly');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[api] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
