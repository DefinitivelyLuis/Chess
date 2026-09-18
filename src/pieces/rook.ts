import { Board } from "../board/board";
import {
  Coordinates,
  getDistanceVector,
  NormalCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove } from "../moves/move";
import { getOtherPlayer, PieceType, PlayerType } from "./definitions";
import { Piece } from "./piece_interface";

export class Rook extends Piece {
  private hasMoved_: boolean;

  constructor(
    coordinates: Coordinates,
    player: PlayerType,
    board: Board,
    hasMoved: boolean,
  ) {
    super(coordinates, player, board);
    this.hasMoved_ = hasMoved;
  }

  public canDoMove(move: Move): boolean {
    if (!(move instanceof NormalMove)) return false;
    const deltaVector = getDistanceVector(move.getFrom(), move.getTo());
    if (deltaVector.deltaColumn != 0 && deltaVector.deltaRow != 0) return false;
    if (deltaVector.deltaColumn == 0 && deltaVector.deltaRow == 0) return false;

    const normalDeltaVector = {
      deltaColumn:
        deltaVector.deltaColumn > 0 ? 1 : deltaVector.deltaColumn < 0 ? -1 : 0,
      deltaRow:
        deltaVector.deltaRow > 0 ? 1 : deltaVector.deltaRow < 0 ? -1 : 0,
    };

    const deltaLength = Math.max(
      Math.abs(deltaVector.deltaColumn),
      Math.abs(deltaVector.deltaRow),
    );
    const ownCoordinates = NormalCoordinates.fromCoordinates(
      this.getCoordinates(),
    );

    for (let step = 1; step <= deltaLength; step++) {
      const piece = this.getBoard().getPiece(
        new NormalCoordinates(
          ownCoordinates.getRow() + normalDeltaVector.deltaRow * step,
          ownCoordinates.getColumn() + normalDeltaVector.deltaColumn * step,
        ),
      );
      if (piece?.getPlayer() == this.getPlayer()) return false;
      if (
        step != deltaLength &&
        piece?.getPlayer() == getOtherPlayer(this.getPlayer())
      )
        return false;
    }
    return true;
  }

  public hasMoved(): boolean {
    return this.hasMoved_;
  }

  public moveTo(coordinates: Coordinates): void {
    this.coordinates = coordinates.clone();
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
    return PieceType.ROOK;
  }

  public clone(): Piece {
    return new Rook(
      this.coordinates.clone(),
      this.getPlayer(),
      this.getBoard(),
      this.hasMoved_,
    );
  }

  _toJSON(): {
    hasMoved?: boolean;
    enPassePossible?: boolean;
  } {
    return { hasMoved: this.hasMoved() };
  }
}
