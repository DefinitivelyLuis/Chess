// HTTP-level tests against a real server process.
//
// The server keeps ONE shared board in memory and has no reset endpoint, so
// these tests run in a fixed order against a freshly spawned process and each
// one leaves the game further along. Do not reorder them casually.
import { suite, test, knownBug, ok, notOk, equal } from "./harness";
import { PieceType } from "./helpers";
import { URL, freshBoard } from "./server_control";

interface Piece {
  coordinates: string;
  player: string;
  type: string;
  hasMoved?: boolean;
  enPasseIsPossible?: boolean;
}

interface BoardDTO {
  pieces: Piece[];
  activePlayer: string;
  gameIsOver: boolean;
  timeSincePieceTaken: number;
}

/** POST a request and return the unwrapped `response` object. */
async function call(body: unknown): Promise<Record<string, any>> {
  const raw = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const envelope = JSON.parse(await raw.text());
  if (!("response" in envelope))
    throw new Error(`no "response" field in envelope: ${JSON.stringify(envelope)}`);
  return envelope.response;
}

const getBoard = async (): Promise<BoardDTO> =>
  (await call({ type: "GET_BOARD", id: 1 })).board;

const WHITE = "5678";
const BLACK = "1234";

const doMove = (password: string, from: string, to: string) =>
  call({
    type: "MOVE",
    password,
    move: { type: "NORMAL_MOVE", from, to },
  });

const pieceAt = (board: BoardDTO, square: string) =>
  board.pieces.find((p) => p.coordinates === square) ?? null;

/**
 * Password of whoever is to move. Tests that must reach move *parsing* need
 * this, otherwise they stop at "Only the active player can do a move!" and
 * pass for the wrong reason.
 */
const activePassword = async (): Promise<string> =>
  (await getBoard()).activePlayer === "WHITE" ? WHITE : BLACK;

suite("server: GET_BOARD", () => {
  test("returns 32 pieces with white to move", async () => {
    const board = await getBoard();
    equal(board.pieces.length, 32, "piece count");
    equal(board.activePlayer, "WHITE", "active player");
    equal(board.gameIsOver, false, "gameIsOver");
    equal(board.timeSincePieceTaken, 0, "timeSincePieceTaken");
  });

  test("pieces use string coordinates and a `type` field", async () => {
    const board = await getBoard();
    const e1 = pieceAt(board, "E1");
    ok(e1 !== null, "a piece stands on E1");
    equal(typeof e1!.coordinates, "string", "coordinates is a string like \"E1\"");
    equal(e1!.type, "KING", "E1 is the king");
    equal(e1!.player, "WHITE", "E1 is white");
  });

  test("the starting back rank is RNBQKBNR", async () => {
    const board = await getBoard();
    const letters: Record<string, string> = {
      ROOK: "R", KNIGHT: "N", BISHOP: "B", QUEEN: "Q", KING: "K", PAWN: "P",
    };
    const backRank = "ABCDEFGH"
      .split("")
      .map((c) => letters[pieceAt(board, c + "1")!.type])
      .join("");
    equal(backRank, "RNBQKBNR", "white back rank over HTTP");
  });
});

suite("server: validation", () => {
  test("unparseable JSON is reported", async () => {
    const raw = await fetch(URL, { method: "POST", body: "{not json" });
    const envelope = JSON.parse(await raw.text());
    equal(envelope.response.error, "Could not parse the json!", "error message");
  });

  test("an unknown request type is rejected", async () => {
    const response = await call({ type: "FLY_TO_THE_MOON" });
    ok(typeof response.error === "string", `error present, got ${JSON.stringify(response)}`);
  });

  test("a MOVE without a password is rejected", async () => {
    const response = await call({
      type: "MOVE",
      move: { type: "NORMAL_MOVE", from: "E2", to: "E4" },
    });
    equal(response.error, "Password is undefined!", "error message");
  });

  test("a MOVE without a move is rejected", async () => {
    const response = await call({ type: "MOVE", password: WHITE });
    equal(response.error, "Move is undefined!", "error message");
  });

  test("a wrong password is rejected", async () => {
    const response = await call({
      type: "MOVE",
      password: "hunter2",
      move: { type: "NORMAL_MOVE", from: "E2", to: "E4" },
    });
    equal(response.error, "Wrong password!", "error message");
  });

  test("the inactive player cannot move", async () => {
    const response = await doMove(BLACK, "E7", "E5");
    equal(
      response.error,
      "Only the active player can do a move!",
      "black moving first",
    );
  });

  test("an off-board coordinate is reported, not crashed on", async () => {
    const response = await doMove(WHITE, "E2", "E9");
    ok(typeof response.error === "string", `error present, got ${JSON.stringify(response)}`);
    notOk(
      response.error.startsWith("Internal Server Error"),
      `should be a validation error, got: ${response.error}`,
    );
  });

  test("an illegal but well-formed move is rejected", async () => {
    const response = await doMove(WHITE, "E2", "E5");
    equal(response.error, "Cannot do the move!", "e2-e5");
  });
});

suite("server: POSSIBLE_MOVES", () => {
  test("a GET_BOARD board can be passed straight back in", async () => {
    const board = await getBoard();
    const response = await call({ type: "POSSIBLE_MOVES", board });
    ok(Array.isArray(response.possibleMoves), `got ${JSON.stringify(response).slice(0, 120)}`);
    equal(response.possibleMoves.length, 20, "20 opening moves");
  });

  test("a missing board is reported", async () => {
    equal(
      (await call({ type: "POSSIBLE_MOVES" })).error,
      "Board is undefined!",
      "error message",
    );
  });

  test("a board without timeSincePieceTaken is reported", async () => {
    const response = await call({
      type: "POSSIBLE_MOVES",
      board: { pieces: [], activePlayer: "WHITE" },
    });
    ok(
      response.error?.includes("timeSincePieceTaken"),
      `expected a timeSincePieceTaken error, got ${JSON.stringify(response)}`,
    );
  });

  // Board.getPossibleMoves() is legality-filtered, so this endpoint agrees
  // with what MOVE will accept.
  test("POSSIBLE_MOVES excludes moves that expose your own king", async () => {
    // Ke1 is shielded from Qe8 only by the rook on e2.
    const response = await call({
      type: "POSSIBLE_MOVES",
      board: {
        pieces: [
          { coordinates: "E1", player: "WHITE", type: "KING" },
          { coordinates: "E2", player: "WHITE", type: "ROOK" },
          { coordinates: "E8", player: "BLACK", type: "QUEEN" },
          { coordinates: "A8", player: "BLACK", type: "KING" },
        ],
        activePlayer: "WHITE",
        timeSincePieceTaken: 0,
      },
    });
    const offered: string[] = response.possibleMoves.map(
      (m: any) => `${m.from}${m.to}`,
    );
    notOk(
      offered.includes("E2A2"),
      `Re2-a2 abandons the king but was offered; got ${offered.join(" ")}`,
    );
  });

  test("returned moves carry from/to in algebraic notation", async () => {
    const board = await getBoard();
    const { possibleMoves } = await call({ type: "POSSIBLE_MOVES", board });
    const first = possibleMoves[0];
    equal(first.type, "NORMAL_MOVE", "move type");
    ok(/^[A-H][1-8]$/.test(first.from), `from looks like a square: ${first.from}`);
    ok(/^[A-H][1-8]$/.test(first.to), `to looks like a square: ${first.to}`);
  });
});

// From here on the shared board actually advances.
suite("server: playing a game", () => {
  test("white plays e2-e4", async () => {
    equal((await doMove(WHITE, "E2", "E4")).msg, "success", "1. e4");
    const board = await getBoard();
    ok(pieceAt(board, "E2") === null, "e2 is empty");
    equal(pieceAt(board, "E4")?.type, "PAWN", "pawn on e4");
    equal(board.activePlayer, "BLACK", "black to move");
  });

  test("black plays e7-e5", async () => {
    equal((await doMove(BLACK, "E7", "E5")).msg, "success", "1... e5");
    equal((await getBoard()).activePlayer, "WHITE", "white to move");
  });

  test("white develops the knight g1-f3", async () => {
    equal((await doMove(WHITE, "G1", "F3")).msg, "success", "2. Nf3");
    equal(pieceAt(await getBoard(), "F3")?.type, "KNIGHT", "knight on f3");
  });

  test("black develops the knight b8-c6", async () => {
    equal((await doMove(BLACK, "B8", "C6")).msg, "success", "2... Nc6");
  });

  test("white bishop f1-c4 travels the diagonal", async () => {
    equal((await doMove(WHITE, "F1", "C4")).msg, "success", "3. Bc4");
    const board = await getBoard();
    equal(pieceAt(board, "C4")?.type, "BISHOP", "bishop on c4");
    ok(pieceAt(board, "F1") === null, "f1 is empty");
  });

  test("a capture decrements the piece count", async () => {
    const before = (await getBoard()).pieces.length;
    equal((await doMove(BLACK, "C6", "D4")).msg, "success", "3... Nxd4");
    const after = await getBoard();
    equal(after.pieces.length, before, "knight moved to an empty square, no capture yet");
    equal((await doMove(WHITE, "F3", "D4")).msg, "success", "4. Nxd4 captures");
    equal((await getBoard()).pieces.length, before - 1, "one piece fewer");
  });

  test("hasMoved is tracked for castling eligibility", async () => {
    const board = await getBoard();
    equal(pieceAt(board, "A1")?.hasMoved, false, "a1 rook has not moved");
    equal(pieceAt(board, "E1")?.hasMoved, false, "e1 king has not moved");
  });
});

suite("server: robustness", () => {
  test("POSSIBLE_MOVES tolerates a board with no king", async () => {
    // getPossibleMoves() is pseudo-legal and never calls getKing(), so this is
    // answerable even though the position is not a legal chess position.
    const response = await call({
      type: "POSSIBLE_MOVES",
      board: {
        pieces: [{ coordinates: "A1", player: "WHITE", type: "ROOK" }],
        activePlayer: "WHITE",
        timeSincePieceTaken: 0,
      },
    });
    ok(Array.isArray(response.possibleMoves), `got: ${JSON.stringify(response)}`);
    equal(response.possibleMoves.length, 14, "a lone rook on a1 has 14 moves");
  });

  test("an unknown promotion piece is a clean validation error", async () => {
    const password = await activePassword();
    const response = await call({
      type: "MOVE",
      password,
      move: { type: "PAWN_REACHES_END_MOVE", from: "A7", to: "A8", newPiece: "BANANA" },
    });
    equal(response.error, "Wrong piece name BANANA!", "error message");
  });

  // moveFromJSON rejects PAWN and KING before constructing the move, so the
  // PawnReachesEndMove constructor's throw is never reached by a request.
  test("promoting to PAWN is a validation error, not an internal error", async () => {
    const password = await activePassword();
    const response = await call({
      type: "MOVE",
      password,
      move: { type: "PAWN_REACHES_END_MOVE", from: "A7", to: "A8", newPiece: "PAWN" },
    });
    notOk(
      String(response.error ?? "").startsWith("Internal Server Error"),
      `expected a clean validation error, got: ${response.error}`,
    );
    equal(
      response.error,
      "New Piece cannot be a pawn or a king!",
      "error message",
    );
    equal(response.type, "MOVE", "error responses should still carry `type`");
  });

  /** Returns the bodies that came back as an "Internal Server Error". */
  async function escapedAsThrow(bodies: unknown[]): Promise<string[]> {
    const offenders: string[] = [];
    for (const body of bodies) {
      const response = await call(body);
      if (String(response.error ?? "").startsWith("Internal Server Error"))
        offenders.push(`\n    ${JSON.stringify(body)}\n      -> ${response.error}`);
    }
    return offenders;
  }

  test("malformed requests are reported, not thrown", async () => {
    // A sweep of the inputs most likely to escape the handlers as an exception.
    const password = await activePassword();
    const offenders = await escapedAsThrow([
      { type: "MOVE", password, move: { type: "PAWN_REACHES_END_MOVE", from: "A7", to: "A8", newPiece: "PAWN" } },
      { type: "MOVE", password, move: { type: "PAWN_REACHES_END_MOVE", from: "A7", to: "A8", newPiece: "KING" } },
      { type: "MOVE", password, move: { type: "PAWN_REACHES_END_MOVE", from: "A7", to: "A8" } },
      { type: "MOVE", password, move: { type: "NORMAL_MOVE", from: "Z9", to: "A8" } },
      { type: "MOVE", password, move: { type: "NORMAL_MOVE", from: "A7" } },
      { type: "MOVE", password, move: { type: "NONSENSE" } },
      { type: "MOVE", password, move: {} },
      { type: "CASTLING_MOVE" },
      { type: "POSSIBLE_MOVES", board: { pieces: "nope", activePlayer: "WHITE", timeSincePieceTaken: 0 } },
      { type: "POSSIBLE_MOVES", board: { pieces: [{}], activePlayer: "WHITE", timeSincePieceTaken: 0 } },
      { type: "POSSIBLE_MOVES", board: { pieces: [], activePlayer: "PURPLE", timeSincePieceTaken: 0 } },
    ]);
    equal(offenders.length, 0, `requests that escaped as a throw:${offenders.join("")}`);
  });

  // handleMoveRequest checks that `move` is PRESENT but not that it is an
  // object, then casts it to Record<string, unknown>. moveFromJSON's first act
  // is `"type" in json`, and `in` throws on a primitive.
  // handlePossibleMovesRequest already guards its `board` this way; `move`
  // needs the same check.
  knownBug("a non-object `move` is reported, not thrown", async () => {
    const password = await activePassword();
    const offenders = await escapedAsThrow([
      { type: "MOVE", password, move: "not an object" },
      { type: "MOVE", password, move: 42 },
      { type: "MOVE", password, move: null },
    ]);
    equal(offenders.length, 0, `requests that escaped as a throw:${offenders.join("")}`);
  });
});

// ---------------------------------------------------------------------------
// End-to-end rule scenarios.
//
// These play real games over HTTP, so they exercise the JSON parsing and
// serialisation that the in-process tests bypass. Each suite calls
// freshBoard() first, because the server has a single board and no reset.
// ---------------------------------------------------------------------------

/** Play a list of [from, to] moves, alternating colours, asserting each works. */
async function playLine(line: [string, string][], startWith = WHITE) {
  let password = startWith;
  for (const [from, to] of line) {
    const response = await doMove(password, from, to);
    equal(response.msg, "success", `${from}-${to} should be accepted`);
    password = password === WHITE ? BLACK : WHITE;
  }
}

suite("server: en passant end to end", () => {
  test("a capture over HTTP removes the captured pawn", async () => {
    await freshBoard();
    // 1. e4 a6  2. e5 d5  3. exd6 e.p.
    await playLine([
      ["E2", "E4"],
      ["A7", "A6"],
      ["E4", "E5"],
      ["D7", "D5"],
    ]);

    const before = await getBoard();
    equal(pieceAt(before, "D5")?.type, "PAWN", "black pawn double-stepped to d5");
    equal(
      pieceAt(before, "D5")?.enPasseIsPossible,
      true,
      "GET_BOARD reports the pawn as capturable en passant",
    );

    equal((await doMove(WHITE, "E5", "D6")).msg, "success", "exd6 e.p.");

    const after = await getBoard();
    equal(pieceAt(after, "D6")?.player, "WHITE", "white pawn landed on d6");
    ok(pieceAt(after, "D5") === null, "the captured black pawn is gone from d5");
    equal(after.pieces.length, 31, "one piece fewer");
    equal(after.timeSincePieceTaken, 0, "counted as a capture");
  });

  test("the window closes after one reply", async () => {
    await freshBoard();
    // Same line, but white declines the capture for one move.
    await playLine([
      ["E2", "E4"],
      ["A7", "A6"],
      ["E4", "E5"],
      ["D7", "D5"],
      ["G1", "F3"], // white declines
      ["A6", "A5"], // black replies
    ]);

    const board = await getBoard();
    notOk(
      pieceAt(board, "D5")?.enPasseIsPossible === true,
      "d5 pawn is no longer flagged",
    );
    equal(
      (await doMove(WHITE, "E5", "D6")).error,
      "Cannot do the move!",
      "exd6 is now rejected",
    );
  });
});

suite("server: castling end to end", () => {
  test("kingside castling moves both pieces", async () => {
    await freshBoard();
    // 1. e4 e5  2. Nf3 Nc6  3. Bc4 Bc5  4. O-O
    await playLine([
      ["E2", "E4"],
      ["E7", "E5"],
      ["G1", "F3"],
      ["B8", "C6"],
      ["F1", "C4"],
      ["F8", "C5"],
    ]);

    const response = await call({
      type: "MOVE",
      password: WHITE,
      move: { type: "CASTLING_MOVE", king: "E1", rook: "H1" },
    });
    equal(response.msg, "success", "O-O accepted");

    const board = await getBoard();
    equal(pieceAt(board, "G1")?.type, "KING", "king on g1");
    equal(pieceAt(board, "F1")?.type, "ROOK", "rook on f1");
    ok(pieceAt(board, "E1") === null, "e1 empty");
    ok(pieceAt(board, "H1") === null, "h1 empty");
  });

  test("castling is rejected once the king has moved", async () => {
    await freshBoard();
    // White walks the king out and back; castling rights are gone.
    await playLine([
      ["E2", "E4"],
      ["E7", "E5"],
      ["G1", "F3"],
      ["B8", "C6"],
      ["F1", "C4"],
      ["F8", "C5"],
      ["E1", "F1"], // king moves
      ["A7", "A6"],
      ["F1", "E1"], // and back
      ["A6", "A5"],
    ]);

    const board = await getBoard();
    equal(pieceAt(board, "E1")?.hasMoved, true, "GET_BOARD reports hasMoved");
    equal(
      (
        await call({
          type: "MOVE",
          password: WHITE,
          move: { type: "CASTLING_MOVE", king: "E1", rook: "H1" },
        })
      ).error,
      "Cannot do the move!",
      "O-O rejected",
    );
  });
});

suite("server: checkmate end to end", () => {
  test("fool's mate sets gameIsOver and leaves no moves", async () => {
    await freshBoard();
    // 1. f3 e5  2. g4 Qh4#
    await playLine([
      ["F2", "F3"],
      ["E7", "E5"],
      ["G2", "G4"],
      ["D8", "H4"],
    ]);

    const board = await getBoard();
    equal(board.activePlayer, "WHITE", "white is to move and mated");
    equal(board.gameIsOver, true, "gameIsOver is set");

    const { possibleMoves } = await call({ type: "POSSIBLE_MOVES", board });
    equal(possibleMoves.length, 0, "white has no legal move");
  });

  test("no further move is accepted after mate", async () => {
    // Continues from the mated position above - no freshBoard() on purpose.
    equal(
      (await doMove(WHITE, "B1", "C3")).error,
      "Cannot do the move!",
      "moving after the game is over",
    );
  });
});

suite("server: promotion end to end", () => {
  const promote = (newPiece: string) =>
    call({
      type: "MOVE",
      password: WHITE,
      move: {
        type: "PAWN_REACHES_END_MOVE",
        from: "G7",
        to: "H8",
        newPiece,
      },
    });

  test("march a pawn to the seventh rank", async () => {
    await freshBoard();
    // 1. h4 a6  2. h5 a5  3. h6 a4  4. hxg7 b6   -- white pawn now on g7,
    // with the black rook still on h8 to capture on promotion.
    await playLine([
      ["H2", "H4"],
      ["A7", "A6"],
      ["H4", "H5"],
      ["A6", "A5"],
      ["H5", "H6"],
      ["A5", "A4"],
      ["H6", "G7"],
      ["B7", "B6"],
    ]);
    const board = await getBoard();
    equal(pieceAt(board, "G7")?.player, "WHITE", "white pawn reached g7");
    equal(pieceAt(board, "H8")?.type, "ROOK", "black rook still on h8");
  });

  test("promoting to KING is rejected from a real promotion position", async () => {
    // No freshBoard(): this runs from the g7 position above, so the request
    // actually reaches the promotion rules rather than failing earlier.
    const response = await promote("KING");
    equal(
      response.error,
      "New Piece cannot be a pawn or a king!",
      "KING promotion",
    );
    equal(response.type, "MOVE", "error response carries `type`");
  });

  test("an unknown piece name is rejected", async () => {
    equal((await promote("BANANA")).error, "Wrong piece name BANANA!", "BANANA");
  });

  test("promoting to QUEEN captures the rook and places a queen", async () => {
    equal((await promote("QUEEN")).msg, "success", "gxh8=Q accepted");

    const board = await getBoard();
    equal(pieceAt(board, "H8")?.type, "QUEEN", "a queen stands on h8");
    equal(pieceAt(board, "H8")?.player, "WHITE", "and it is white's");
    equal(board.timeSincePieceTaken, 0, "the rook capture reset the counter");
  });

  test("the promoted queen then moves like a queen", async () => {
    // Black replies, then the new queen slides along the eighth rank.
    equal((await doMove(BLACK, "B6", "B5")).msg, "success", "black replies");
    const { possibleMoves } = await call({
      type: "POSSIBLE_MOVES",
      board: await getBoard(),
    });
    const destinations = possibleMoves
      .filter((m: any) => m.from === "H8")
      .map((m: any) => m.to);
    const shown = destinations.join(" ");
    // Black still has a pawn on h7 and a knight on g8's diagonal, so the queen
    // is boxed in; what matters is that it moves both ways, unlike a pawn.
    ok(destinations.includes("H7"), `moves along the file: ${shown}`);
    ok(destinations.includes("G8"), `moves along the rank: ${shown}`);
    ok(destinations.includes("E5"), `moves along the diagonal: ${shown}`);
    notOk(destinations.includes("F7"), `not a knight move: ${shown}`);
  });
});

// ---------------------------------------------------------------------------
// The documented round-trip: feed a GET_BOARD board straight into
// POSSIBLE_MOVES and get the same legal moves back. Both piece flags have to
// survive the JSON hop, which is why these are HTTP tests rather than unit
// ones - the names and types only exist on the wire.
// ---------------------------------------------------------------------------
suite("server: POSSIBLE_MOVES flag round-trip", () => {
  const movedKingBoard = {
    pieces: [
      { coordinates: "E1", player: "WHITE", type: "KING", hasMoved: true },
      { coordinates: "H1", player: "WHITE", type: "ROOK", hasMoved: true },
      { coordinates: "E8", player: "BLACK", type: "KING", hasMoved: true },
    ],
    activePlayer: "WHITE",
    timeSincePieceTaken: 0,
  };

  const castlingOffers = async (board: unknown) =>
    (await call({ type: "POSSIBLE_MOVES", board })).possibleMoves.filter(
      (m: any) => m.type === "CASTLING_MOVE",
    );

  test("hasMoved survives a GET_BOARD -> POSSIBLE_MOVES round-trip", async () => {
    const castling = await castlingOffers(movedKingBoard);
    equal(
      castling.length,
      0,
      `king and rook both have hasMoved:true, so no castling should be offered; got ${JSON.stringify(castling)}`,
    );
  });

  test('hasMoved is also accepted as the string "TRUE"', async () => {
    // getBoolean() understands both the JSON boolean GET_BOARD emits and the
    // string form, so older clients keep working.
    const board = JSON.parse(JSON.stringify(movedKingBoard));
    board.pieces.forEach((p: any) => (p.hasMoved = "TRUE"));
    equal((await castlingOffers(board)).length, 0, "no castling offered");
  });

  test("hasMoved:false still permits castling", async () => {
    // Guards against the flag being read as "present means true".
    const board = JSON.parse(JSON.stringify(movedKingBoard));
    board.pieces.forEach((p: any) => (p.hasMoved = false));
    ok((await castlingOffers(board)).length > 0, "castling offered");
  });

  test("enPasseIsPossible survives a GET_BOARD -> POSSIBLE_MOVES round-trip", async () => {
    const { possibleMoves } = await call({
      type: "POSSIBLE_MOVES",
      board: {
        pieces: [
          { coordinates: "A5", player: "WHITE", type: "PAWN" },
          {
            coordinates: "B5",
            player: "BLACK",
            type: "PAWN",
            enPasseIsPossible: true,
          },
          { coordinates: "E1", player: "WHITE", type: "KING" },
          { coordinates: "E8", player: "BLACK", type: "KING" },
        ],
        activePlayer: "WHITE",
        timeSincePieceTaken: 0,
      },
    });
    ok(
      possibleMoves.some((m: any) => m.from === "A5" && m.to === "B6"),
      `a5xb6 en passant should be offered; got ${JSON.stringify(possibleMoves)}`,
    );
  });

  test("a full GET_BOARD board round-trips with en passant intact", async () => {
    // The end-to-end version: play into an en passant position, then feed the
    // real GET_BOARD payload straight back in as the docs advertise.
    await freshBoard();
    await playLine([
      ["E2", "E4"],
      ["A7", "A6"],
      ["E4", "E5"],
      ["D7", "D5"],
    ]);
    const { possibleMoves } = await call({
      type: "POSSIBLE_MOVES",
      board: await getBoard(),
    });
    ok(
      possibleMoves.some((m: any) => m.from === "E5" && m.to === "D6"),
      "exd6 e.p. offered from a round-tripped board",
    );
  });
});

export { PieceType };
