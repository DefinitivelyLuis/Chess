// Server lifecycle for the integration tests.
//
// The server keeps ONE board in memory and has no reset endpoint, so the only
// way back to the starting position is a fresh process. Scenario suites call
// freshBoard() to get one.
import { spawn, spawnSync, ChildProcess } from "child_process";

export const PORT = 12345;
export const URL = `http://localhost:${PORT}`;

let current: ChildProcess | null = null;

export async function isUp(): Promise<boolean> {
  try {
    const raw = await fetch(URL, {
      method: "POST",
      body: JSON.stringify({ type: "GET_BOARD", id: 0 }),
    });
    const envelope = JSON.parse(await raw.text());
    return envelope?.response?.board?.pieces?.length > 0;
  } catch {
    return false;
  }
}

async function waitUntil(
  wanted: boolean,
  attempts = 80,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if ((await isUp()) === wanted) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * tsx runs the server in a grandchild process, so killing the pid we spawned
 * leaves the real server holding the port (and our stdio pipes, which stops
 * this process from ever exiting). Kill the whole tree.
 */
function killTree(pid: number): void {
  if (process.platform === "win32")
    spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)], {
      stdio: "ignore",
      shell: true,
    });
  else
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      /* already gone */
    }
}

export async function startServer(): Promise<void> {
  if (current) throw new Error("a server is already running");

  const server = spawn("npx", ["tsx", "./src/main.ts"], {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  current = server;

  let output = "";
  server.stdout?.on("data", (d) => (output += d));
  server.stderr?.on("data", (d) => (output += d));

  let exited = false;
  server.on("exit", () => (exited = true));

  if (!(await waitUntil(true)) || exited) {
    if (server.pid) killTree(server.pid);
    current = null;
    throw new Error(`server did not start. Output:\n${output}`);
  }
}

export async function stopServer(): Promise<void> {
  if (!current) return;
  if (current.pid) killTree(current.pid);
  current = null;
  await waitUntil(false);
}

/** A server with the standard starting position. Safe to call repeatedly. */
export async function freshBoard(): Promise<void> {
  await stopServer();
  await startServer();
}
