// Castling, en passant and promotion.
import { suite, test, knownBug, ok, notOk, equal, throws } from "./harness";
import {
  position,
  move,
  promotion,
  at,
  ascii,
  PieceType,
  W,
  B,
  sq,
  Spec,
} from "./helpers";
import { CastlingMove } from "../src/moves/move";

suite("promotion", () => {
  const pawnOn7th: Spec[] = [
    ["A7", PieceType.PAWN, W],
    ["E1", PieceType.KING, W],
    ["E8", PieceType.KING, B],
  ];

  test("a pawn reaching the last rank may become queen, rook, bishop or knight", () => {
    const board = position(pawnOn7th, W);
    const pawn = at(board, "A7")!;
    for (const type of [
      PieceType.QUEEN,
      PieceType.ROOK,
      PieceType.BISHOP,
      PieceType.KNIGHT,
    ])
      ok(pawn.canDoMove(promotion("A7", "A8", type)), `promote to ${type}`);
  });

  test("promoting to a king is rejected", () => {
    const board = position(pawnOn7th, W);
    notOk(
      at(board, "A7")!.canDoMove(promotion("A7", "A8", PieceType.KING)),
      "promote to KING",
    );
  });

  test("promoting to a pawn is impossible to even express", () => {
    throws(
      () => promotion("A7", "A8", PieceType.PAWN),
      "PawnReachesEndMove with newPiece=PAWN",
    );
  });

  test("a pawn not on the 7th rank cannot promote", () => {
    const board = position(
      [["A5", PieceType.PAWN, W], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    );
    notOk(
      at(board, "A5")!.canDoMove(promotion("A5", "A6", PieceType.QUEEN)),
      "promotion from a5",
    );
  });

  test("promotion actually replaces the pawn on the board", () => {
    const board = position(pawnOn7th, W);
    const after = board.doMove(promotion("A7", "A8", PieceType.QUEEN));
    equal(
      at(after, "A8")!.getPieceType(),
      PieceType.QUEEN,
      `a8 after promotion\n${ascii(after)}`,
    );
    equal(after.getPieces().length, 3, "still three pieces");
  });

  test("a promoted queen then moves like a queen", () => {
    const after = position(pawnOn7th, W).doMove(
      promotion("A7", "A8", PieceType.QUEEN),
    );
    const queen = at(after, "A8")!;
    // Not A8-H8: the black king on e8 legitimately blocks that rank.
    ok(queen.canDoMove(move("A8", "A4")), "new queen slides down the a-file");
    ok(queen.canDoMove(move("A8", "D5")), "new queen slides diagonally");
    notOk(queen.canDoMove(move("A8", "B6")), "new queen is not a knight");
  });
});

suite("castling", () => {
  // Bare kingside castling setup: nothing between Ke1 and Rh1.
  const kingside: Spec[] = [
    ["E1", PieceType.KING, W],
    ["H1", PieceType.ROOK, W],
    ["E8", PieceType.KING, B],
  ];

  const castle = (king: string, rook: string) =>
    new CastlingMove(sq(king), sq(rook));

  test("kingside castling is legal with an empty path", () => {
    const board = position(kingside, W);
    ok(board.canDoMove(castle("E1", "H1")), `O-O\n${ascii(board)}`);
  });

  test("castling moves both king and rook", () => {
    const after = position(kingside, W).doMove(castle("E1", "H1"));
    equal(at(after, "G1")?.getPieceType(), PieceType.KING, `king on g1\n${ascii(after)}`);
    equal(at(after, "F1")?.getPieceType(), PieceType.ROOK, "rook on f1");
    ok(at(after, "E1") === null, "e1 is empty");
    ok(at(after, "H1") === null, "h1 is empty");
  });

  test("castling is blocked by a piece between king and rook", () => {
    const board = position(
      [...kingside, ["G1", PieceType.KNIGHT, W]],
      W,
    );
    notOk(board.canDoMove(castle("E1", "H1")), "O-O with a knight on g1");
  });

  test("castling is illegal when a traversed square is attacked", () => {
    const board = position(
      [...kingside, ["F8", PieceType.ROOK, B]],
      W,
    );
    notOk(board.canDoMove(castle("E1", "H1")), "O-O through an attacked f1");
  });

  test("castling is illegal once the rook has moved", () => {
    // Move the rook out and back, then try to castle.
    let board = position([...kingside, ["A7", PieceType.PAWN, B]], W);
    board = board.doMove(move("H1", "H5"));
    board = board.doMove(move("A7", "A6"));
    board = board.doMove(move("H5", "H1"));
    board = board.doMove(move("A6", "A5"));
    notOk(at(board, "H1")!.toJSON().hasMoved === false, "rook should be flagged as moved");
    notOk(board.canDoMove(castle("E1", "H1")), "O-O after Rh1-h5-h1");
  });

  test("queenside castling is legal with an empty path", () => {
    const board = position(
      [["E1", PieceType.KING, W], ["A1", PieceType.ROOK, W], ["E8", PieceType.KING, B]],
      W,
    );
    ok(board.canDoMove(castle("E1", "A1")), `O-O-O\n${ascii(board)}`);
  });

  test("queenside castling places king on c1 and rook on d1", () => {
    const after = position(
      [["E1", PieceType.KING, W], ["A1", PieceType.ROOK, W], ["E8", PieceType.KING, B]],
      W,
    ).doMove(castle("E1", "A1"));
    equal(at(after, "C1")?.getPieceType(), PieceType.KING, `king on c1\n${ascii(after)}`);
    equal(at(after, "D1")?.getPieceType(), PieceType.ROOK, "rook on d1");
  });

  test("castling is illegal once the king has moved", () => {
    let board = position([...kingside, ["A7", PieceType.PAWN, B]], W);
    board = board.doMove(move("E1", "E2"));
    board = board.doMove(move("A7", "A6"));
    board = board.doMove(move("E2", "E1"));
    board = board.doMove(move("A6", "A5"));
    notOk(at(board, "E1")!.toJSON().hasMoved === false, "king should be flagged as moved");
    notOk(board.canDoMove(castle("E1", "H1")), "O-O after Ke1-e2-e1");
  });

  test("a player cannot castle twice in one game", () => {
    let board = position(
      [...kingside, ["A7", PieceType.PAWN, B], ["A2", PieceType.PAWN, W]],
      W,
    );
    board = board.doMove(castle("E1", "H1")); // Kg1, Rf1
    board = board.doMove(move("A7", "A6"));
    board = board.doMove(move("A2", "A3"));
    board = board.doMove(move("A6", "A5"));
    notOk(
      board.canDoMove(castle("G1", "F1")),
      `castling a second time from ${"g1"}/f1\n${ascii(board)}`,
    );
  });
});

suite("en passant", () => {
  // White pawn on a5; black plays b7-b5 past it, so a5xb6 should be legal.
  function afterDoubleStep() {
    const board = position(
      [
        ["A5", PieceType.PAWN, W],
        ["B7", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      B,
    );
    return board.doMove(move("B7", "B5"));
  }

  test("a double step marks the pawn as capturable en passant", () => {
    const board = afterDoubleStep();
    equal(
      at(board, "B5")!.toJSON().enPasseIsPossible,
      true,
      "b5 pawn is flagged",
    );
  });

  test("en passant capture is legal", () => {
    const board = afterDoubleStep();
    ok(
      board.canDoMove(move("A5", "B6")),
      `a5xb6 en passant\n${ascii(board)}`,
    );
  });

  // The captured pawn stands beside the mover, not on the destination square,
  // so Pawn.doMove needs a second removal for the diagonal-onto-empty case.
  test("en passant removes the captured pawn", () => {
    const board = afterDoubleStep();
    const after = board.doMove(move("A5", "B6"));
    ok(at(after, "B5") === null, `b5 must be empty after a5xb6\n${ascii(after)}`);
    equal(at(after, "B6")?.getPlayer(), W, "the white pawn stands on b6");
    equal(after.getPieces().length, 3, "black pawn is gone");
  });

  test("en passant counts as a capture for the draw rule", () => {
    // removePiece() only resets the counter when something was really removed,
    // so the victim's removal has to be the one that does it.
    const after = afterDoubleStep().doMove(move("A5", "B6"));
    equal(after.getTimeSincePieceTaken(), 0, "counter reset by the capture");
  });

  test("a black pawn can capture en passant too", () => {
    // The mirror image: white double-steps past a black pawn on the 4th rank.
    let board = position(
      [
        ["H4", PieceType.PAWN, B],
        ["G2", PieceType.PAWN, W],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    board = board.doMove(move("G2", "G4"));
    ok(board.canDoMove(move("H4", "G3")), `h4xg3 en passant\n${ascii(board)}`);
    const after = board.doMove(move("H4", "G3"));
    ok(at(after, "G4") === null, `g4 must be empty\n${ascii(after)}`);
    equal(after.getPieces().length, 3, "white pawn is gone");
  });

  test("a pawn cannot capture en passant onto an empty square with no victim", () => {
    // Nothing has double-stepped, so the diagonal move has no target at all.
    const board = position(
      [
        ["A5", PieceType.PAWN, W],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    notOk(board.canDoMove(move("A5", "B6")), "a5-b6 with nothing to capture");
  });

  test("an ordinary diagonal capture still removes the piece it lands on", () => {
    const board = position(
      [
        ["D4", PieceType.PAWN, W],
        ["E5", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    const after = board.doMove(move("D4", "E5"));
    equal(after.getPieces().length, 3, "black pawn captured");
    equal(at(after, "E5")?.getPlayer(), W, "white pawn on e5");
    equal(after.getTimeSincePieceTaken(), 0, "counter reset");
  });

  test("a pawn that captures diagonally is not flagged en passant", () => {
    // A diagonal capture moves one rank, not two, so it must not set the flag.
    const board = position(
      [
        ["D4", PieceType.PAWN, W],
        ["E5", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    ).doMove(move("D4", "E5"));
    notOk(
      at(board, "E5")!.toJSON().enPasseIsPossible === true,
      "the capturing pawn must not be en-passant-capturable",
    );
  });

  test("a single-square advance does not enable en passant", () => {
    const board = position(
      [["D2", PieceType.PAWN, W], ["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    ).doMove(move("D2", "D3"));
    notOk(
      at(board, "D3")!.toJSON().enPasseIsPossible === true,
      "d3 pawn must not be en-passant-capturable",
    );
  });

  test("the en passant window closes after one move", () => {
    let board = afterDoubleStep();
    // White declines the capture. That single reply closes the window.
    board = board.doMove(move("E1", "D1"));
    notOk(
      at(board, "B5")!.toJSON().enPasseIsPossible === true,
      `b5 pawn should no longer be flagged\n${ascii(board)}`,
    );
    board = board.doMove(move("E8", "D8"));
    notOk(board.canDoMove(move("A5", "B6")), "a5xb6 is now illegal");
  });

  test("the window closes even after a long shuffle", () => {
    let board = afterDoubleStep();
    const shuffle: [string, string][] = [
      ["E1", "D1"], ["E8", "D8"], ["D1", "E1"], ["D8", "E8"],
      ["E1", "D1"], ["E8", "D8"], ["D1", "E1"], ["D8", "E8"],
    ];
    for (const [from, to] of shuffle) board = board.doMove(move(from, to));
    notOk(
      board.canDoMove(move("A5", "B6")),
      `a5xb6 eight plies later must be illegal\n${ascii(board)}`,
    );
  });

  test("the window survives long enough for the opponent to use it", () => {
    // The flag must still be set when the very next move is the capture.
    const board = afterDoubleStep();
    ok(board.canDoMove(move("A5", "B6")), "capture on the immediately next move");
  });

  test("a double step does not close the mover's own window", () => {
    // Clearing runs after the move and targets the opponent, so a pawn that
    // double-steps on this very move stays flagged.
    const board = afterDoubleStep();
    equal(
      at(board, "B5")!.toJSON().enPasseIsPossible,
      true,
      "the pawn that just double-stepped is flagged",
    );
  });

  test("only the opponent's flags are cleared, not your own", () => {
    // Both sides double-step in turn; after black's reply white's older pawn
    // is expired while black's fresh one is live.
    let board = position(
      [
        ["D2", PieceType.PAWN, W],
        ["E7", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    board = board.doMove(move("D2", "D4")); // white double-steps
    equal(at(board, "D4")!.toJSON().enPasseIsPossible, true, "white pawn flagged");
    board = board.doMove(move("E7", "E5")); // black double-steps
    equal(at(board, "E5")!.toJSON().enPasseIsPossible, true, "black pawn flagged");
    notOk(
      at(board, "D4")!.toJSON().enPasseIsPossible === true,
      `white's older double-step has expired\n${ascii(board)}`,
    );
  });
});
