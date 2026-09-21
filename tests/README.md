# Tests

Zero-dependency suites, run with `tsx`. No test framework is installed.

```bash
npx tsx tests/run.ts          # rules and piece geometry, in-process, fast
npx tsx tests/run_server.ts   # HTTP integration, spawns and stops the server
```

Both exit non-zero on failure, so they work in CI as-is.

## Layout

| File                     | What it covers                                              |
| ------------------------ | ----------------------------------------------------------- |
| `harness.ts`             | Assertions and the runner. No dependencies.                 |
| `helpers.ts`             | Position builders, board rendering, independent ground truth |
| `pieces.test.ts`         | Movement geometry for all six piece types                    |
| `board.test.ts`          | Setup, turn order, check, checkmate, stalemate, draws        |
| `special_moves.test.ts`  | Castling, en passant, promotion                              |
| `server.test.ts`         | The three HTTP endpoints, their error paths, and end-to-end rule scenarios |
| `server_control.ts`      | Spawns/stops the server; `freshBoard()` restarts it          |
| `run.ts` / `run_server.ts` | Entry points                                               |

## `test()` vs `knownBug()`

```ts
test("...", () => { ... });      // must pass
knownBug("...", () => { ... });  // asserts CORRECT chess behaviour, expected to fail
```

`knownBug` bodies assert what the engine *should* do. They are expected to
fail, and are reported as `KNOWN BUG` without breaking the run. If one starts
passing, the runner prints `FIXED!` and exits non-zero so you remember to
promote it to `test()`.

This keeps every known defect executable and self-verifying instead of living
in a stale prose checklist.

## Writing tests here

- `position(spec, activePlayer)` builds an arbitrary board. Kings are **not**
  added for you: several `Board` methods require exactly one king per side, so
  list both explicitly.
- Put `ascii(board)` in a failure message when the position matters. It renders
  the board with white uppercase and black lowercase.
- `kingIsAttacked()` and `legalMoves()` in `helpers.ts` compute check and
  legality independently of `Board.isInCheck` / `Board.hasLost`, so those
  methods are never validated against themselves.
- The server keeps **one shared board and has no reset endpoint**. Suites that
  need the starting position call `await freshBoard()` in their first test,
  which restarts the server process. Within a suite the tests run in a fixed
  order and each advances the game — a test with no `freshBoard()` call is
  deliberately continuing from the previous one. Do not reorder them.
- Prefer end-to-end scenarios over unit tests for anything that crosses the
  JSON boundary. The `POSSIBLE_MOVES flag round-trip` bugs were invisible to
  every in-process test because the flags only get serialised over HTTP.
- A server test that needs to reach move *parsing* must use
  `activePassword()`. Using the wrong side's password stops the request at
  `"Only the active player can do a move!"` and the test passes for the wrong
  reason.

## Open bugs these tests pin down

None — every defect found so far is fixed and pinned by a `test()`.

New ones go here as `knownBug()` cases; run the suites for the live list.

## Intentional deviations

Not bugs, and covered by ordinary `test()` cases rather than `knownBug()`:

- **A pawn move does not reset `timeSincePieceTaken`.** Only captures do. The
  standard 50-move rule resets on pawn moves too. Documented in
  `API_DOCUMENTATION.md` under "Intentional Deviations from Standard Chess" —
  change the docs before changing the behaviour.

## Termination

`Board.isInCheck()` and `Board.getPossibleMoves()` are the delicate pair. Both
bottom out in the private `getPseudoLegalMoves()`, which only ever reaches
`Piece.canDoMove()`. If either is rewritten to call `Board.canDoMove()` or
`Board.gameIsOver()`, this cycle reappears and blows the stack:

```
canDoMove -> canDoMoveNoCheckForKing -> gameIsOver -> hasLost
          -> getPossibleMoves -> canDoMove -> ...
```

The `termination` suite in `board.test.ts` guards against that — those tests
fail with `RangeError: Maximum call stack size exceeded` if the cycle returns.

## En passant ordering

`Board.doMoveNoKingChecks()` expires the opponent's `enPasseIsPossible` flags,
and it must do so **after** `_doMove()`. The capture reads the victim's flag
while executing, so clearing first makes the en passant move illegal at the
moment it is played. Running afterwards also leaves a pawn that double-stepped
on this very move flagged, because that pawn belongs to the mover rather than
to the player being cleared. The `en passant` suite in `special_moves.test.ts`
pins both directions.

## Caveats

- There is no `package.json`, so `@types/node` is absent and `tsc` reports
  `Cannot find name 'process'` for the harness. `tsx` runs it fine.
- `tests/` is only meaningful if it is version controlled — check that
  `.gitignore` does not exclude it.
