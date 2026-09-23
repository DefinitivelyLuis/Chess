// Movement geometry for each piece type, at the Piece.canDoMove level.
import { suite, test, ok, notOk, equal, deepEqual } from "./harness";
import {
  position,
  move,
  at,
  destinations,
  sq,
  Spec,
  PieceType,
  W,
  B,
} from "./helpers";

// Kings live on H1/A8 in these fixtures: off every rank, file and diagonal
// used by the D4 cases below, so they never block or get captured by accident.
const KINGS: Spec[] = [
  ["H1", PieceType.KING, W],
  ["A8", PieceType.KING, B],
];

function can(
  type: PieceType,
  from: string,
  to: string,
  extra: Spec[] = [],
): boolean {
  const board = position(
    [[from, type, W], ...KINGS, ...extra],
    W,
  );
  return at(board, from)!.canDoMove(move(from, to));
}

suite("bishop", () => {
  test("moves along all four diagonals", () => {
    ok(can(PieceType.BISHOP, "D4", "G7"), "d4-g7 (up-right)");
    ok(can(PieceType.BISHOP, "D4", "A7"), "d4-a7 (up-left)");
    ok(can(PieceType.BISHOP, "D4", "A1"), "d4-a1 (down-left)");
    ok(can(PieceType.BISHOP, "D4", "F2"), "d4-f2 (down-right)");
  });

  test("rejects non-diagonal moves", () => {
    notOk(can(PieceType.BISHOP, "D4", "D7"), "d4-d7 (file)");
    notOk(can(PieceType.BISHOP, "D4", "H4"), "d4-h4 (rank)");
    notOk(can(PieceType.BISHOP, "D4", "F5"), "d4-f5 (knight shape)");
    notOk(can(PieceType.BISHOP, "D4", "D4"), "d4-d4 (null move)");
  });

  test("cannot jump over pieces of either colour", () => {
    notOk(
      can(PieceType.BISHOP, "D4", "G7", [["F6", PieceType.PAWN, W]]),
      "blocked by own pawn on f6",
    );
    notOk(
      can(PieceType.BISHOP, "D4", "G7", [["F6", PieceType.PAWN, B]]),
      "blocked by enemy pawn on f6",
    );
  });

  test("captures an enemy piece but not its own", () => {
    ok(
      can(PieceType.BISHOP, "D4", "G7", [["G7", PieceType.PAWN, B]]),
      "captures enemy on g7",
    );
    notOk(
      can(PieceType.BISHOP, "D4", "G7", [["G7", PieceType.PAWN, W]]),
      "blocked by own piece on g7",
    );
  });

  test("on an open board from d4 reaches 13 squares", () => {
    const board = position([["D4", PieceType.BISHOP, W], ...KINGS], W);
    deepEqual(
      destinations(at(board, "D4")!),
      ["A1", "A7", "B2", "B6", "C3", "C5", "E3", "E5", "F2", "F6", "G1", "G7", "H8"],
      "bishop d4 destinations",
    );
  });
});

suite("knight", () => {
  test("makes all eight L-shaped moves", () => {
    const board = position([["D4", PieceType.KNIGHT, W], ...KINGS], W);
    deepEqual(
      destinations(at(board, "D4")!),
      ["B3", "B5", "C2", "C6", "E2", "E6", "F3", "F5"],
      "knight d4 destinations",
    );
  });

  test("rejects non-knight moves", () => {
    notOk(can(PieceType.KNIGHT, "D4", "E5"), "d4-e5 (one diagonal)");
    notOk(can(PieceType.KNIGHT, "D4", "D6"), "d4-d6 (file)");
    notOk(can(PieceType.KNIGHT, "D4", "F6"), "d4-f6 (two diagonal)");
    notOk(can(PieceType.KNIGHT, "D4", "D4"), "d4-d4 (null move)");
  });

  test("jumps over blocking pieces", () => {
    ok(
      can(PieceType.KNIGHT, "D4", "E6", [
        ["D5", PieceType.PAWN, W],
        ["E5", PieceType.PAWN, W],
      ]),
      "d4-e6 over two own pawns",
    );
  });

  test("captures an enemy piece but not its own", () => {
    ok(can(PieceType.KNIGHT, "D4", "E6", [["E6", PieceType.PAWN, B]]), "captures enemy");
    notOk(can(PieceType.KNIGHT, "D4", "E6", [["E6", PieceType.PAWN, W]]), "own piece");
  });

  test("is confined to the board from a corner", () => {
    const board = position([["B1", PieceType.KNIGHT, W], ...KINGS], W);
    deepEqual(destinations(at(board, "B1")!), ["A3", "C3", "D2"], "knight b1");
  });
});

suite("rook", () => {
  test("moves along rank and file", () => {
    ok(can(PieceType.ROOK, "D4", "D8"), "d4-d8");
    ok(can(PieceType.ROOK, "D4", "D1"), "d4-d1");
    ok(can(PieceType.ROOK, "D4", "A4"), "d4-a4");
    ok(can(PieceType.ROOK, "D4", "G4"), "d4-g4");
  });

  test("rejects diagonal and null moves", () => {
    notOk(can(PieceType.ROOK, "D4", "F6"), "d4-f6 (diagonal)");
    notOk(can(PieceType.ROOK, "D4", "D4"), "d4-d4 (null move)");
  });

  test("cannot jump over pieces", () => {
    notOk(
      can(PieceType.ROOK, "D4", "D8", [["D6", PieceType.PAWN, B]]),
      "blocked on d6",
    );
    ok(
      can(PieceType.ROOK, "D4", "D6", [["D6", PieceType.PAWN, B]]),
      "captures on d6",
    );
  });

  test("on an open board from d4 reaches 14 squares", () => {
    const board = position([["D4", PieceType.ROOK, W], ...KINGS], W);
    equal(destinations(at(board, "D4")!).length, 14, "rook d4 destination count");
  });
});

suite("queen", () => {
  test("combines rook and bishop movement", () => {
    ok(can(PieceType.QUEEN, "D4", "G7"), "d4-g7 (diagonal)");
    ok(can(PieceType.QUEEN, "D4", "D8"), "d4-d8 (file)");
    ok(can(PieceType.QUEEN, "D4", "H4"), "d4-h4 (rank)");
  });

  test("does NOT move like a knight", () => {
    notOk(can(PieceType.QUEEN, "D4", "F5"), "d4-f5");
    notOk(can(PieceType.QUEEN, "D4", "E6"), "d4-e6");
    notOk(can(PieceType.QUEEN, "D4", "C2"), "d4-c2");
  });

  test("cannot jump over pieces", () => {
    notOk(
      can(PieceType.QUEEN, "D4", "G7", [["F6", PieceType.PAWN, B]]),
      "blocked diagonally on f6",
    );
    notOk(
      can(PieceType.QUEEN, "D4", "D8", [["D6", PieceType.PAWN, B]]),
      "blocked on the file on d6",
    );
  });

  test("on an open board from d4 reaches 27 squares", () => {
    const board = position([["D4", PieceType.QUEEN, W], ...KINGS], W);
    equal(destinations(at(board, "D4")!).length, 27, "queen d4 = 13 diagonal + 14 straight");
  });
});

suite("king", () => {
  test("moves one square in any direction", () => {
    const board = position(
      [["D4", PieceType.KING, W], ["A8", PieceType.KING, B]],
      W,
    );
    deepEqual(
      destinations(at(board, "D4")!),
      ["C3", "C4", "C5", "D3", "D5", "E3", "E4", "E5"],
      "king d4 destinations",
    );
  });

  test("rejects moves of more than one square", () => {
    const board = position(
      [["D4", PieceType.KING, W], ["A8", PieceType.KING, B]],
      W,
    );
    const king = at(board, "D4")!;
    notOk(king.canDoMove(move("D4", "D6")), "d4-d6");
    notOk(king.canDoMove(move("D4", "F6")), "d4-f6");
    notOk(king.canDoMove(move("D4", "D4")), "d4-d4 (null move)");
  });

  test("may not step adjacent to the enemy king", () => {
    const board = position(
      [["D4", PieceType.KING, W], ["D6", PieceType.KING, B]],
      W,
    );
    const king = at(board, "D4")!;
    notOk(king.canDoMove(move("D4", "D5")), "d4-d5 touches the black king");
    notOk(king.canDoMove(move("D4", "C5")), "d4-c5 touches the black king");
    ok(king.canDoMove(move("D4", "D3")), "d4-d3 is fine");
  });
});

suite("pawn", () => {
  test("advances one or two squares from the starting rank", () => {
    const board = position(
      [["D2", PieceType.PAWN, W], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    );
    const pawn = at(board, "D2")!;
    ok(pawn.canDoMove(move("D2", "D3")), "d2-d3");
    ok(pawn.canDoMove(move("D2", "D4")), "d2-d4");
  });

  test("advances only one square thereafter", () => {
    const board = position(
      [["D3", PieceType.PAWN, W], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    );
    const pawn = at(board, "D3")!;
    ok(pawn.canDoMove(move("D3", "D4")), "d3-d4");
    notOk(pawn.canDoMove(move("D3", "D5")), "d3-d5 is not allowed");
  });

  test("cannot move backwards or sideways", () => {
    const board = position(
      [["D4", PieceType.PAWN, W], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    );
    const pawn = at(board, "D4")!;
    notOk(pawn.canDoMove(move("D4", "D3")), "d4-d3 backwards");
    notOk(pawn.canDoMove(move("D4", "E4")), "d4-e4 sideways");
  });

  test("black pawns advance down the board", () => {
    const board = position(
      [["D7", PieceType.PAWN, B], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      B,
    );
    const pawn = at(board, "D7")!;
    ok(pawn.canDoMove(move("D7", "D6")), "d7-d6");
    ok(pawn.canDoMove(move("D7", "D5")), "d7-d5");
    notOk(pawn.canDoMove(move("D7", "D8")), "d7-d8 backwards");
  });

  test("captures diagonally, never straight ahead", () => {
    const board = position(
      [
        ["D4", PieceType.PAWN, W],
        ["E5", PieceType.PAWN, B],
        ["D5", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    const pawn = at(board, "D4")!;
    ok(pawn.canDoMove(move("D4", "E5")), "d4xe5 diagonal capture");
    notOk(pawn.canDoMove(move("D4", "D5")), "d4-d5 blocked by enemy pawn");
  });

  test("cannot capture diagonally onto an empty square", () => {
    const board = position(
      [["D4", PieceType.PAWN, W], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    );
    notOk(at(board, "D4")!.canDoMove(move("D4", "E5")), "d4-e5 with nothing on e5");
  });

  test("two-square advance is blocked by a piece in the way", () => {
    const board = position(
      [
        ["D2", PieceType.PAWN, W],
        ["D3", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    notOk(at(board, "D2")!.canDoMove(move("D2", "D4")), "d2-d4 through d3");
  });
});
