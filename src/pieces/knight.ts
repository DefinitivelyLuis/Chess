import {
  getDistanceVector,
  NormalCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove } from "../moves/move";
import { PieceType } from "./definitions";
import { Piece } from "./piece_interface";

export class Knight extends Piece {
  public canDoMove(move: Move): boolean {
    if (!(move instanceof NormalMove)) return false;
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
    const moves = [];
    for (const directionRow of [1, -1]) {
      for (const directionColumn of [1, -1]) {
        for (let length = 1; length < 8; length++) {
          try {
            const ownCoordinates = NormalCoordinates.fromCoordinates(
              this.coordinates,
            );
            const to = new NormalCoordinates(
              ownCoordinates.getRow() + directionRow * length,
              ownCoordinates.getColumn() + directionColumn * length,
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
    enPassePossible?: boolean;
  } {
    return {};
  }
}
