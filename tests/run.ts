// Unit/rules test entry point:  npx tsx tests/run.ts
// These tests run in-process and need no server.
import { runAll } from "./harness";
import "./pieces.test";
import "./board.test";
import "./special_moves.test";

runAll();
