import { Move, NormalMove } from "../moves/move";
import { Bishop } from "./bishop";
import { Rook } from "./rook";
import { Piece } from "./piece_interface";
import { PieceType } from "./definitions";

export class Queen extends Piece {
  public canDoMove(move: Move): boolean {
    if (
      new Bishop(
        this.getCoordinates(),
        this.getPlayer(),
        this.getBoard(),
      ).canDoMove(move)
    )
      return true;
    if (
      new Rook(
        this.getCoordinates(),
        this.getPlayer(),
        this.getBoard(),
        true,
      ).canDoMove(move)
    )
      return true;
    return false;
  }

  public doMove(move: Move): void {
    if (!this.canDoMove(move)) throw Error("Cannot do the move!");
    if (move instanceof NormalMove) {
      this.getBoard().removePiece(move.getTo());
      this.coordinates = move.getTo().clone();
    }
  }

  public getPossibleMoves(): Move[] {
    return this.getPossibleMovesStd();
  }

  public getPieceType(): PieceType {
    return PieceType.QUEEN;
  }

  public clone(): Piece {
    return new Queen(
      this.getCoordinates().clone(),
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
