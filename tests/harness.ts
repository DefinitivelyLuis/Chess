// Minimal zero-dependency test harness.
//
// test(name, fn)     - must pass.
// knownBug(name, fn) - documents a bug that is still present. The body asserts
//                      CORRECT chess behaviour, so it is expected to fail. If it
//                      starts passing, the bug was fixed and the suite fails so
//                      you remember to promote it to test().

type Fn = () => void | Promise<void>;

interface Case {
  suite: string;
  name: string;
  fn: Fn;
  expectFail: boolean;
}

const cases: Case[] = [];
let currentSuite = "(ungrouped)";

export function suite(name: string, body: () => void): void {
  const previous = currentSuite;
  currentSuite = name;
  body();
  currentSuite = previous;
}

export function test(name: string, fn: Fn): void {
  cases.push({ suite: currentSuite, name, fn, expectFail: false });
}

export function knownBug(name: string, fn: Fn): void {
  cases.push({ suite: currentSuite, name, fn, expectFail: true });
}

// ---------------------------------------------------------------- assertions

export class AssertionError extends Error {}

function fail(message: string): never {
  throw new AssertionError(message);
}

export function ok(actual: boolean, what: string): void {
  if (actual !== true) fail(`${what}: expected true, got ${actual}`);
}

export function notOk(actual: boolean, what: string): void {
  if (actual !== false) fail(`${what}: expected false, got ${actual}`);
}

export function equal<T>(actual: T, expected: T, what: string): void {
  if (actual !== expected)
    fail(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

export function deepEqual<T>(actual: T, expected: T, what: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) fail(`${what}:\n    expected ${b}\n    got      ${a}`);
}

export function throws(fn: () => unknown, what: string): void {
  try {
    fn();
  } catch {
    return;
  }
  fail(`${what}: expected a throw, but nothing was thrown`);
}

export function doesNotThrow(fn: () => unknown, what: string): void {
  try {
    fn();
  } catch (error) {
    fail(`${what}: unexpected throw - ${(error as Error).message}`);
  }
}

// ------------------------------------------------------------------- running

export async function runAll(): Promise<void> {
  let passed = 0;
  let failed = 0;
  let known = 0;
  let fixed = 0;
  const failures: string[] = [];
  const fixedBugs: string[] = [];
  let lastSuite = "";

  for (const c of cases) {
    if (c.suite !== lastSuite) {
      process.stdout.write(`\n${c.suite}\n`);
      lastSuite = c.suite;
    }

    let error: Error | null = null;
    try {
      await c.fn();
    } catch (e) {
      error = e as Error;
    }

    if (c.expectFail) {
      if (error) {
        known++;
        process.stdout.write(`  KNOWN BUG  ${c.name}\n`);
        process.stdout.write(`             ${error.message.split("\n").join("\n             ")}\n`);
      } else {
        fixed++;
        fixedBugs.push(`${c.suite} > ${c.name}`);
        process.stdout.write(`  FIXED!     ${c.name}  <- now passing, change knownBug() to test()\n`);
      }
      continue;
    }

    if (error) {
      failed++;
      failures.push(`${c.suite} > ${c.name}\n    ${error.message}`);
      process.stdout.write(`  FAIL       ${c.name}\n`);
      process.stdout.write(`             ${error.message.split("\n").join("\n             ")}\n`);
      if (!(error instanceof AssertionError) && error.stack)
        process.stdout.write(`             ${error.stack.split("\n")[1]?.trim() ?? ""}\n`);
    } else {
      passed++;
      process.stdout.write(`  pass       ${c.name}\n`);
    }
  }

  process.stdout.write(`\n${"=".repeat(60)}\n`);
  process.stdout.write(
    `${passed} passed, ${failed} failed, ${known} known bugs still open, ${fixed} newly fixed\n`,
  );

  if (failures.length) {
    process.stdout.write(`\nFailures:\n`);
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
  }
  if (fixedBugs.length) {
    process.stdout.write(
      `\nThese knownBug() cases now pass - promote them to test():\n`,
    );
    for (const f of fixedBugs) process.stdout.write(`  - ${f}\n`);
  }

  if (failed > 0 || fixed > 0) process.exitCode = 1;
}
