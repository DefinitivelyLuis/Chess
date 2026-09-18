// Shared fixtures for building positions without going through the HTTP server.
import { Board } from "../src/board/board";
import { NormalMove, PawnReachesEndMove, Move } from "../src/moves/move";
import { LetterCoordinates, equals } from "../src/coordinates/coordinates";
import { createPiece } from "../src/pieces/utils";
import {
  PieceType,
  PlayerType,
  getOtherPlayer,
} from "../src/pieces/definitions";
import { Piece } from "../src/pieces/piece_interface";

export const W = PlayerType.WHITE;
export const B = PlayerType.BLACK;

/** "E4" -> Coordinates */
export const sq = (s: string) => LetterCoordinates.fromString(s);

/** Board is injected by the Board constructor, so pieces may be built with null. */
const noBoard = null as unknown as Board;

export type Spec = [square: string, type: PieceType, player: PlayerType];

/**
 * Build an arbitrary position. Kings are NOT added automatically - several
 * Board methods require exactly one king per side, so every position that
 * exercises them must list both kings explicitly.
 */
export function position(spec: Spec[], active: PlayerType): Board {
  const pieces: Piece[] = spec.map(([at, type, player]) =>
    createPiece(sq(at), player, noBoard, type),
  );
  return new Board(pieces, active, 0);
}

export const move = (from: string, to: string) =>
  new NormalMove(sq(from), sq(to));

export const promotion = (from: string, to: string, to_piece: PieceType) =>
  new PawnReachesEndMove(sq(from), sq(to), to_piece);

/** The piece standing on a square, or null. */
export const at = (board: Board, square: string) => board.getPiece(sq(square));

/** Single-letter piece name, uppercase for white and lowercase for black. */
export function glyph(piece: Piece): string {
  const letters: Record<string, string> = {
    [PieceType.ROOK]: "R",
    [PieceType.KNIGHT]: "N",
    [PieceType.BISHOP]: "B",
    [PieceType.QUEEN]: "Q",
    [PieceType.KING]: "K",
    [PieceType.PAWN]: "P",
  };
  const letter = letters[piece.getPieceType()];
  return piece.getPlayer() === W ? letter : letter.toLowerCase();
}

/** One rank as a string, e.g. "RNBQKBNR". Empty squares are ".". */
export function rank(board: Board, row: number): string {
  return "ABCDEFGH"
    .split("")
    .map((column) => {
      const piece = at(board, column + row);
      return piece ? glyph(piece) : ".";
    })
    .join("");
}

/** Full board as 8 lines, rank 8 first. Handy in failure messages. */
export function ascii(board: Board): string {
  return [8, 7, 6, 5, 4, 3, 2, 1]
    .map((row) => `${row} ${rank(board, row)}`)
    .join("\n");
}

/** Destination squares of a piece's own move list, sorted. */
export function destinations(piece: Piece): string[] {
  return piece
    .getPossibleMoves()
    .filter(
      (m): m is NormalMove | PawnReachesEndMove =>
        m instanceof NormalMove || m instanceof PawnReachesEndMove,
    )
    .map((m) => LetterCoordinates.fromCoordinates(m.getTo()).toString())
    .filter((s, i, all) => all.indexOf(s) === i)
    .sort();
}

/**
 * Ground truth for "is `player`'s king attacked", computed independently of
 * Board.isInCheck so the tests do not validate that method against itself.
 */
export function kingIsAttacked(board: Board, player: PlayerType): boolean {
  const king = board.getKing(player).getCoordinates();
  return board
    .getPieces()
    .filter((p) => p.getPlayer() === getOtherPlayer(player))
    .some((p) =>
      p
        .getPossibleMoves()
        .some(
          (m) =>
            (m instanceof NormalMove || m instanceof PawnReachesEndMove) &&
            equals(m.getTo(), king),
        ),
    );
}

/**
 * Ground truth for the moves the side to move may legally play: pseudo-legal
 * moves that do not leave their own king attacked.
 */
export function legalMoves(board: Board): Move[] {
  return board.getPossibleMoves().filter((m) => {
    try {
      return !kingIsAttacked(
        board.doMoveNoKingChecks(m),
        board.getActivePLayer(),
      );
    } catch {
      return false;
    }
  });
}

export { PieceType, PlayerType, Board };
