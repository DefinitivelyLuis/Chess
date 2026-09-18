import {
  equals,
  getDistanceVector,
  NormalCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove } from "../moves/move";
import { PieceType } from "./definitions";
import { Piece } from "./piece_interface";

export class Bishop extends Piece {
  public canDoMove(move: Move): boolean {
    if (!(move instanceof NormalMove)) return false;
    if (!equals(move.getFrom(), this.getCoordinates())) {
      throw Error("Error: getFrom() and getCoordinates() should be equal!");
    }
    const distanceVector = getDistanceVector(move.getFrom(), move.getTo());
    if (
      Math.abs(distanceVector.deltaColumn) !== Math.abs(distanceVector.deltaRow)
    )
      return false;
    const moveLength = Math.abs(distanceVector.deltaColumn);

    if (moveLength == 0) return false;

    const normalDistanceVector = {
      deltaColumn: distanceVector.deltaColumn > 0 ? 1 : -1,
      deltaRow: distanceVector.deltaRow > 0 ? 1 : -1,
    };

    const ownCoordinates = NormalCoordinates.fromCoordinates(
      this.getCoordinates(),
    );

    for (let step = 1; step <= moveLength; step++) {
      const piece = this.getBoard().getPiece(
        new NormalCoordinates(
          ownCoordinates.getRow() + normalDistanceVector.deltaRow * step,
          ownCoordinates.getColumn() + normalDistanceVector.deltaColumn * step,
        ),
      );
      if (piece != null && piece.getPlayer() == this.getPlayer()) return false;
      if (piece != null && step != moveLength) return false;
    }

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
    return this.getPossibleMovesStd();
  }

  public getPieceType(): PieceType {
    return PieceType.BISHOP;
  }

  public clone(): Piece {
    return new Bishop(
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
