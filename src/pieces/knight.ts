import {
  getDistanceSquared,
  NormalCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove } from "../moves/move";
import { PieceType } from "./definitions";
import { Piece } from "./piece_interface";

export class Knight extends Piece {
  public canDoMove(move: Move): boolean {
    if (!(move instanceof NormalMove)) return false;
    if (getDistanceSquared(move.getFrom(), move.getTo()) != 5) return false;
    if (this.getBoard().getPiece(move.getTo())?.getPlayer() == this.getPlayer())
      return false;
    return true;
  }

  public doMove(move: Move): void {
    if (!this.canDoMove(move)) throw Error("Cannot do the move!");
    if (move instanceof NormalMove) {
      this.getBoard().removePiece(move.getTo());
      this.coordinates = move.getTo().clone();
    }
  }

  public getPossibleMoves(): Move[] {
    const moves: Move[] = [];
    for (const [x, y] of [
      [1, 2],
      [2, 1],
    ]) {
      for (const mulX of [1, -1]) {
        for (const mulY of [1, -1]) {
          try {
            const ownCoordinates = NormalCoordinates.fromCoordinates(
              this.getCoordinates(),
            );
            const to = new NormalCoordinates(
              ownCoordinates.getRow() + y * mulY,
              ownCoordinates.getColumn() + x * mulX,
            );
            const move = new NormalMove(this.getCoordinates().clone(), to);
            if (this.canDoMove(move)) moves.push(move);
          } catch (error) {
            continue;
          }
        }
      }
    }
    return moves;
  }

  public getPieceType(): PieceType {
    return PieceType.KNIGHT;
  }

  public clone(): Piece {
    return new Knight(
      this.coordinates.clone(),
      this.getPlayer(),
      this.getBoard(),
    );
  }

  _toJSON(): {
    hasMoved?: boolean;
    enPasseIsPossible?: boolean;
  } {
    return {};
  }
}
