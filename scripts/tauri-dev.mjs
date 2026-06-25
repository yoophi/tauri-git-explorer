import net from "node:net";
import { spawn } from "node:child_process";

const DEFAULT_PORT = 1420;
const DEFAULT_HOST = "127.0.0.1";
const MAX_PORT = 65535;

function parsePort(value, fallback) {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

function normalizeHost(value) {
  const host = value || DEFAULT_HOST;
  if (!/^[\w.:-]+$/.test(host)) {
    throw new Error(`Invalid host: ${host}`);
  }

  return host;
}

function canListen(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(startPort, host) {
  for (let port = startPort; port <= MAX_PORT; port += 1) {
    if (await canListen(port, host)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort}`);
}

const host = normalizeHost(process.env.TAURI_DEV_HOST ?? process.env.DEV_HOST);
const startPort = parsePort(process.env.DEV_PORT ?? process.env.PORT, DEFAULT_PORT);
const port = await findAvailablePort(startPort, host);
const devUrlHost = host === "0.0.0.0" ? "127.0.0.1" : host;
const devUrl = `http://${devUrlHost}:${port}`;

const tauriConfig = {
  build: {
    devUrl,
    beforeDevCommand: `pnpm exec vite --host ${host} --port ${port} --strictPort`,
  },
};

console.log(`Starting Tauri dev server on ${devUrl}`);

const child = spawn(
  "pnpm",
  ["--filter", "desktop", "exec", "tauri", "dev", "--config", JSON.stringify(tauriConfig)],
  {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      DEV_HOST: host,
      DEV_PORT: String(port),
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
