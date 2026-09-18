// Board-level rules: setup, turn order, check, checkmate, stalemate, draws.
import {
  suite,
  test,
  knownBug,
  ok,
  notOk,
  equal,
  throws,
  doesNotThrow,
} from "./harness";
import {
  Board,
  position,
  move,
  at,
  sq,
  rank,
  ascii,
  kingIsAttacked,
  legalMoves,
  PieceType,
  W,
  B,
  Spec,
} from "./helpers";
import { NormalMove } from "../src/moves/move";
import { LetterCoordinates, equals } from "../src/coordinates/coordinates";

suite("starting position", () => {
  test("both back ranks are RNBQKBNR", () => {
    const board = Board.create_std();
    equal(rank(board, 1), "RNBQKBNR", `white back rank\n${ascii(board)}`);
    equal(rank(board, 8), "rnbqkbnr", `black back rank\n${ascii(board)}`);
  });

  test("both pawn ranks are full", () => {
    const board = Board.create_std();
    equal(rank(board, 2), "PPPPPPPP", "white pawns");
    equal(rank(board, 7), "pppppppp", "black pawns");
  });

  test("ranks 3-6 are empty and there are 32 pieces", () => {
    const board = Board.create_std();
    for (const row of [3, 4, 5, 6])
      equal(rank(board, row), "........", `rank ${row}`);
    equal(board.getPieces().length, 32, "piece count");
  });

  test("kings and queens are on the e and d files", () => {
    const board = Board.create_std();
    equal(at(board, "E1")!.getPieceType(), PieceType.KING, "white king on e1");
    equal(at(board, "D1")!.getPieceType(), PieceType.QUEEN, "white queen on d1");
    equal(at(board, "E8")!.getPieceType(), PieceType.KING, "black king on e8");
    equal(at(board, "D8")!.getPieceType(), PieceType.QUEEN, "black queen on d8");
  });

  test("white has 20 opening moves", () => {
    equal(Board.create_std().getPossibleMoves().length, 20, "16 pawn + 4 knight");
  });

  test("white moves first", () => {
    equal(Board.create_std().getActivePLayer(), W, "active player");
  });
});

suite("turn order", () => {
  test("the inactive player cannot move", () => {
    const board = Board.create_std();
    notOk(board.canDoMove(move("E7", "E5")), "black cannot move while white is to move");
    ok(board.canDoMove(move("E2", "E4")), "white can move");
  });

  test("the active player alternates after a move", () => {
    const after = Board.create_std().doMove(move("E2", "E4"));
    equal(after.getActivePLayer(), B, "black to move after 1.e4");
  });

  test("doMove leaves the original board untouched", () => {
    const board = Board.create_std();
    board.doMove(move("E2", "E4"));
    equal(rank(board, 2), "PPPPPPPP", "original board still has a pawn on e2");
    ok(at(board, "E4") === null, "e4 is still empty on the original");
  });
});

suite("check detection", () => {
  // Kh8 with a white queen down the h-file.
  const attackedPosition: Spec[] = [
    ["H1", PieceType.QUEEN, W],
    ["A1", PieceType.KING, W],
    ["H8", PieceType.KING, B],
  ];

  test("reports check against the player who is not to move", () => {
    const board = position(attackedPosition, W);
    ok(kingIsAttacked(board, B), "ground truth: black king is attacked");
    ok(board.isInCheck(B), "Board.isInCheck(BLACK)");
  });

  test("reports no check when the king is safe", () => {
    const board = position(
      [
        ["A1", PieceType.ROOK, W],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    notOk(kingIsAttacked(board, B), "ground truth: black king is safe");
    notOk(board.isInCheck(B), "Board.isInCheck(BLACK)");
  });

  test("a move that leaves your own king in check is rejected", () => {
    // Ke1 is shielded from Qe8 by the rook on e2; moving it away is illegal.
    const board = position(
      [
        ["E1", PieceType.KING, W],
        ["E2", PieceType.ROOK, W],
        ["E8", PieceType.QUEEN, B],
        ["A8", PieceType.KING, B],
      ],
      W,
    );
    notOk(board.canDoMove(move("E2", "A2")), "Re2-a2 abandons the king");
    ok(board.canDoMove(move("E2", "E5")), "Re2-e5 keeps the shield and is legal");
  });

  test("a king may not walk into an attacked square", () => {
    const board = position(
      [
        ["E1", PieceType.KING, W],
        ["A2", PieceType.ROOK, B],
        ["H8", PieceType.KING, B],
      ],
      W,
    );
    notOk(board.canDoMove(move("E1", "E2")), "Ke1-e2 steps onto the rook's rank");
    ok(board.canDoMove(move("E1", "D1")), "Ke1-d1 stays on rank 1");
  });

  test("when in check, only moves that address it are legal", () => {
    // Black Ka8 is checked by Ra1; the only tries are blocking or stepping off the file.
    const board = position(
      [
        ["A8", PieceType.KING, B],
        ["H7", PieceType.ROOK, B],
        ["A1", PieceType.ROOK, W],
        ["E1", PieceType.KING, W],
      ],
      B,
    );
    ok(kingIsAttacked(board, B), "black is in check");
    ok(board.canDoMove(move("A8", "B8")), "Ka8-b8 escapes the file");
    ok(board.canDoMove(move("H7", "A7")), "Rh7-a7 blocks the check");
    notOk(board.canDoMove(move("H7", "H6")), "Rh7-h6 ignores the check");
  });

  test("isInCheck() also works for the side to move", () => {
    const board = position(attackedPosition, B); // black is to move AND in check
    ok(kingIsAttacked(board, B), "ground truth: black king is attacked");
    ok(board.isInCheck(B), "Board.isInCheck(BLACK) while black is to move");
  });
});

suite("checkmate and stalemate", () => {
  // Kh8 boxed in by Ra8 (check along rank 8) and Rb7 (covers rank 7).
  const backRankMate: Spec[] = [
    ["H8", PieceType.KING, B],
    ["A8", PieceType.ROOK, W],
    ["B7", PieceType.ROOK, W],
    ["E1", PieceType.KING, W],
  ];

  // Ka8 is not in check but every square it could reach is covered by Qb6.
  const stalemate: Spec[] = [
    ["A8", PieceType.KING, B],
    ["B6", PieceType.QUEEN, W],
    ["C5", PieceType.KING, W],
  ];

  test("a mated player has no legal move (ground truth)", () => {
    const board = position(backRankMate, B);
    ok(kingIsAttacked(board, B), "black is in check");
    equal(legalMoves(board).length, 0, "no legal move escapes the mate");
    equal(
      board.getPossibleMoves().length,
      0,
      "getPossibleMoves() is legality-filtered and agrees",
    );
  });

  test("getPossibleMoves() excludes moves that expose your own king", () => {
    // Ke1 is shielded from Qe8 only by the rook on e2, so Re2 may only move
    // along the e-file.
    const board = position(
      [
        ["E1", PieceType.KING, W],
        ["E2", PieceType.ROOK, W],
        ["E8", PieceType.QUEEN, B],
        ["A8", PieceType.KING, B],
      ],
      W,
    );
    const rookDestinations = board
      .getPossibleMoves()
      .filter(
        (m): m is NormalMove =>
          m instanceof NormalMove && equals(m.getFrom(), sq("E2")),
      )
      .map((m) => LetterCoordinates.fromCoordinates(m.getTo()).toString());

    ok(rookDestinations.length > 0, "the rook still has moves along the file");
    ok(
      rookDestinations.every((square) => square.startsWith("E")),
      `every offered rook move must stay on the e-file, got ${rookDestinations.join(" ")}`,
    );
  });

  test("a stalemated player has no legal move and is not in check (ground truth)", () => {
    const board = position(stalemate, B);
    notOk(kingIsAttacked(board, B), "black is not in check");
    equal(legalMoves(board).length, 0, "but has no legal move");
  });

  test("hasLost() detects checkmate", () => {
    const board = position(backRankMate, B);
    ok(board.hasLost(B), `black is checkmated\n${ascii(board)}`);
    notOk(board.hasLost(W), "white has not lost");
  });

  test("gameIsOver() is true at checkmate", () => {
    ok(position(backRankMate, B).gameIsOver(), "game is over");
  });

  test("stalemate ends the game as a draw, not a loss", () => {
    const board = position(stalemate, B);
    ok(board.isADraw(), `stalemate is a draw\n${ascii(board)}`);
    ok(board.gameIsOver(), "game is over");
    notOk(board.hasLost(B), "stalemate is not a loss for black");
  });

  test("a normal position is neither lost nor drawn", () => {
    const board = Board.create_std();
    notOk(board.hasLost(W), "white has not lost at the start");
    notOk(board.hasLost(B), "black has not lost at the start");
    notOk(board.isADraw(), "the start is not a draw");
    notOk(board.gameIsOver(), "the game is not over");
  });

  test("being in check is not the same as having lost", () => {
    // Black Ka8 is checked by Ra1 but can simply step aside.
    const board = position(
      [
        ["A8", PieceType.KING, B],
        ["A1", PieceType.ROOK, W],
        ["E1", PieceType.KING, W],
      ],
      B,
    );
    ok(board.isInCheck(B), "black is in check");
    notOk(board.hasLost(B), "but black has escapes");
    notOk(board.gameIsOver(), "game continues");
  });
});

suite("draws", () => {
  test("king versus king is a draw", () => {
    const board = position(
      [["E1", PieceType.KING, W], ["E8", PieceType.KING, B]],
      W,
    );
    ok(board.isADraw(), "bare kings");
    ok(board.gameIsOver(), "game is over");
  });

  test("a position with material is not a draw", () => {
    notOk(
      position(
        [["E1", PieceType.KING, W], ["A1", PieceType.ROOK, W], ["E8", PieceType.KING, B]],
        W,
      ).isADraw(),
      "K+R vs K",
    );
  });

  // removePiece() sets the counter to -1 so that the unconditional +1 in
  // doMoveNoKingChecks() lands it on 0.
  test("timeSincePieceTaken is 0 immediately after a capture", () => {
    const board = position(
      [
        ["D4", PieceType.ROOK, W],
        ["D7", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    const after = board.doMove(move("D4", "D7"));
    equal(after.getTimeSincePieceTaken(), 0, "counter after Rxd7");
  });

  test("the draw counter accumulates over non-capturing moves", () => {
    // Every piece's doMove() calls removePiece() for its destination square
    // whether or not anything stands there, so the counter only advances if
    // removePiece() ignores no-op removals.
    let board = position(
      [
        ["A1", PieceType.ROOK, W],
        ["E1", PieceType.KING, W],
        ["H8", PieceType.ROOK, B],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    const shuffle: [string, string][] = [
      ["A1", "A2"], ["H8", "H7"], ["A2", "A3"], ["H7", "H6"],
    ];
    shuffle.forEach(([from, to], index) => {
      board = board.doMove(move(from, to));
      equal(
        board.getTimeSincePieceTaken(),
        index + 1,
        `after ${shuffle.length} quiet moves, move ${from}-${to}`,
      );
    });
  });

  test("the draw counter implements the 50-move rule (100 half-moves)", () => {
    const board = position(
      [["E1", PieceType.KING, W], ["A1", PieceType.ROOK, W], ["E8", PieceType.KING, B]],
      W,
    );
    const pieces = board.getPieces();
    notOk(new Board(pieces, W, 30).isADraw(), "30 half-moves is not a draw");
    notOk(new Board(pieces, W, 99).isADraw(), "99 half-moves is not a draw");
    ok(new Board(pieces, W, 100).isADraw(), "100 half-moves is a draw");
  });

  // DELIBERATE DEVIATION from the 50-move rule: only captures reset the
  // counter, pawn moves do not. This is documented in API_DOCUMENTATION.md
  // and is not a bug to fix - change the docs first if you change this.
  test("a pawn move does not reset the draw counter (accepted deviation)", () => {
    const board = new Board(
      position(
        [
          ["D2", PieceType.PAWN, W],
          ["E1", PieceType.KING, W],
          ["E8", PieceType.KING, B],
        ],
        W,
      ).getPieces(),
      W,
      40,
    );
    equal(
      board.doMove(move("D2", "D4")).getTimeSincePieceTaken(),
      41,
      "the counter keeps counting straight through a pawn move",
    );
  });
});

// isInCheck() and getPossibleMoves() bottom out in getPseudoLegalMoves(),
// which only reaches Piece.canDoMove(). If either is ever rewritten to call
// Board.canDoMove() or Board.gameIsOver(), the cycle
//   canDoMove -> gameIsOver -> hasLost -> getPossibleMoves -> canDoMove
// reappears and these blow the stack with a RangeError.
suite("termination", () => {
  test("canDoMove() terminates on the full opening position", () => {
    const board = Board.create_std();
    doesNotThrow(() => board.canDoMove(move("E2", "E4")), "1. e4");
  });

  test("gameIsOver() terminates on the full opening position", () => {
    doesNotThrow(() => Board.create_std().gameIsOver(), "gameIsOver with 32 pieces");
  });

  test("hasLost() terminates on the full opening position", () => {
    doesNotThrow(() => Board.create_std().hasLost(W), "hasLost with 32 pieces");
  });

  test("a full game of ten plies terminates", () => {
    let board = Board.create_std();
    const opening: [string, string][] = [
      ["E2", "E4"], ["E7", "E5"], ["G1", "F3"], ["B8", "C6"],
      ["F1", "C4"], ["G8", "F6"], ["E1", "G1"], ["F8", "C5"],
    ];
    doesNotThrow(() => {
      for (const [from, to] of opening)
        if (board.canDoMove(move(from, to))) board = board.doMove(move(from, to));
    }, "eight plies of the Italian game");
    ok(board.getPossibleMoves().length > 0, "the game is still going");
  });
});

suite("isInCheck is independent of whose turn it is", () => {
  // The old implementation derived its move list from getPossibleMoves(), so
  // the answer silently depended on activePlayer. It must not.
  const attacked: Spec[] = [
    ["H1", PieceType.QUEEN, W],
    ["A1", PieceType.KING, W],
    ["H8", PieceType.KING, B],
  ];

  test("black in check is reported with either side to move", () => {
    ok(position(attacked, W).isInCheck(B), "white to move");
    ok(position(attacked, B).isInCheck(B), "black to move");
  });

  test("white safe is reported with either side to move", () => {
    notOk(position(attacked, W).isInCheck(W), "white to move");
    notOk(position(attacked, B).isInCheck(W), "black to move");
  });

  test("a position with no king is not in check rather than an error", () => {
    // POSSIBLE_MOVES accepts arbitrary positions, so this must not throw.
    const board = position([["A1", PieceType.ROOK, W]], W);
    doesNotThrow(() => board.isInCheck(W), "isInCheck with no kings");
    notOk(board.isInCheck(W), "no king means no check");
    equal(board.getPossibleMoves().length, 14, "the rook still gets its moves");
  });
});

suite("board invariants", () => {
  test("getKing throws when a king is missing", () => {
    const board = position([["E1", PieceType.KING, W]], W);
    throws(() => board.getKing(B), "getKing(BLACK) with no black king");
  });

  test("an illegal move throws rather than silently doing nothing", () => {
    const board = Board.create_std();
    throws(() => board.doMove(move("E2", "E5")), "e2-e5 is not a pawn move");
  });

  test("captures remove the captured piece", () => {
    const board = position(
      [
        ["D4", PieceType.ROOK, W],
        ["D7", PieceType.PAWN, B],
        ["E1", PieceType.KING, W],
        ["E8", PieceType.KING, B],
      ],
      W,
    );
    const after = board.doMove(move("D4", "D7"));
    equal(after.getPieces().length, 3, "one piece fewer");
    equal(at(after, "D7")!.getPieceType(), PieceType.ROOK, "rook now stands on d7");
  });
});
