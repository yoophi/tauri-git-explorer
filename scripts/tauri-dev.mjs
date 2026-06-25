import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const MAX_PORT = 65535;

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const desktopDir = join(rootDir, "apps", "desktop");
const require = createRequire(import.meta.url);

function parsePort(value, fallback) {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
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

function getServerPort(server) {
  const address = server.httpServer?.address();

  if (!address || typeof address === "string") {
    throw new Error("Vite dev server address could not be resolved.");
  }

  return address.port;
}

async function loadVite() {
  const viteEntry = require.resolve("vite", {
    paths: [desktopDir],
  });

  return import(pathToFileURL(viteEntry).href);
}

const host = normalizeHost(process.env.TAURI_DEV_HOST ?? process.env.DEV_HOST);
const requestedPort = parsePort(process.env.DEV_PORT ?? process.env.PORT, 0);
const devUrlHost = host === "0.0.0.0" ? "127.0.0.1" : host;
const { createServer } = await loadVite();

process.env.DEV_HOST = host;
process.env.DEV_PORT = String(requestedPort);
process.env.DEV_STRICT_PORT = "false";

const viteServer = await createServer({
  root: desktopDir,
  server: {
    host,
    port: requestedPort,
    strictPort: false,
  },
});

await viteServer.listen();

const port = getServerPort(viteServer);
const devUrl = `http://${devUrlHost}:${port}`;

const tauriConfig = {
  build: {
    devUrl,
    beforeDevCommand: "echo Vite dev server already started by scripts/tauri-dev.mjs",
  },
};

let isShuttingDown = false;
let child;

async function shutdown(code = 0, signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (child && !child.killed) {
    child.kill(signal ?? "SIGTERM");
  }

  await viteServer.close();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code);
}

process.once("SIGINT", () => {
  void shutdown(0, "SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown(0, "SIGTERM");
});

console.log(`Starting Vite dev server on ${devUrl}`);

child = spawn(
  "pnpm",
  ["--filter", "desktop", "exec", "tauri", "dev", "--config", JSON.stringify(tauriConfig)],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      DEV_HOST: host,
      DEV_PORT: String(port),
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  void shutdown(code ?? 0, signal ?? undefined);
});
