// Integration test entry point:  npx tsx tests/run_server.ts
//
// Starts src/main.ts on port 12345, runs the HTTP tests against it, then tears
// the process tree down. Scenario suites restart the server themselves via
// freshBoard(), since the board cannot otherwise be reset.
import { runAll } from "./harness";
import { URL, isUp, startServer, stopServer } from "./server_control";
import "./server.test";

async function main() {
  if (await isUp()) {
    console.error(
      `A server is already listening on ${URL}.\n` +
        `These tests need a fresh board and the server has no reset endpoint,\n` +
        `so stop the running one first.`,
    );
    process.exit(1);
  }

  console.log(`Starting server on port ${URL}...`);
  try {
    await startServer();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  console.log("Server is up.\n");
  try {
    await runAll();
  } finally {
    await stopServer();
  }

  process.exit(process.exitCode ?? 0);
}

main();
