import { Board } from "../board/board";
import { Coordinates } from "../coordinates/coordinates";
import { Bishop } from "./bishop";
import { PieceType, PlayerType } from "./definitions";
import { King } from "./king";
import { Knight } from "./knight";
import { PseudoPawn } from "./pawn";
import { Piece } from "./piece_interface";
import { Queen } from "./queen";
import { Rook } from "./rook";

export function createPiece(
  coordinates_: Coordinates,
  player: PlayerType,
  board: Board,
  piece_type: PieceType,
  hasMoved?: boolean,
  enPassePossible?: boolean,
): Piece {
  if (hasMoved == undefined) hasMoved = false;
  if (enPassePossible == undefined) enPassePossible = false;

  const coordinates = coordinates_.clone();

  switch (piece_type) {
    case PieceType.BISHOP:
      return new Bishop(coordinates, player, board);
    case PieceType.KING:
      return new King(coordinates, player, board, hasMoved);
    case PieceType.KNIGHT:
      return new Knight(coordinates, player, board);
    case PieceType.PAWN:
      return PseudoPawn.create(coordinates, player, board, enPassePossible);
    case PieceType.QUEEN:
      return new Queen(coordinates, player, board);
    case PieceType.ROOK:
      return new Rook(coordinates, player, board, hasMoved);
  }
}
