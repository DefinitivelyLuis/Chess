import {
  Coordinates,
  equals,
  getDistanceSquared,
  getDistanceVector,
  NormalCoordinates,
} from "../coordinates/coordinates";
import {
  Move,
  NormalMove,
  CastlingMove,
  PawnReachesEndMove,
} from "../moves/move";
import { Rook } from "./rook";
import { Board } from "../board/board";
import { Piece } from "./piece_interface";
import { getOtherPlayer, PieceType, PlayerType } from "./definitions";

export class King extends Piece {
  private hasMoved: boolean;

  constructor(
    coordinates: Coordinates,
    player: PlayerType,
    board: Board,
    hasMoved: boolean,
  ) {
    super(coordinates, player, board);
    this.hasMoved = hasMoved;
  }

  private canDoNormalMove(move: Move) {
    if (!(move instanceof NormalMove)) return false;
    if (getDistanceSquared(move.getTo(), this.coordinates) > 2) return false;
    if (equals(move.getTo(), move.getFrom())) return false;
    if (
      getDistanceSquared(
        move.getTo(),
        this.getBoard()
          .getKing(getOtherPlayer(this.getPlayer()))
          .getCoordinates(),
      ) <= 2
    )
      return false;

    const toPiece = this.getBoard().getPiece(move.getTo());

    if (toPiece != null && toPiece.getPlayer() == this.getPlayer())
      return false;

    return true;
  }

  private canDoCastlingMove(move: Move) {
    if (!(move instanceof CastlingMove)) return false;
    if (this.hasMoved) return false;
    const rook = this.getBoard().getPiece(move.getRook());
    if (!(rook instanceof Rook)) return false;
    if (rook.getPlayer() != this.getPlayer()) return false;
    if (rook.hasMoved()) return false;

    const rookCoordinates = NormalCoordinates.fromCoordinates(move.getRook());
    const kingCoordinates = NormalCoordinates.fromCoordinates(move.getKing());

    for (
      let column = Math.min(
        rookCoordinates.getColumn(),
        kingCoordinates.getColumn(),
      );
      column <=
      Math.max(rookCoordinates.getColumn(), kingCoordinates.getColumn());
      column++
    ) {
      const coordinates = new NormalCoordinates(
        rookCoordinates.getRow(),
        column,
      );
      if (equals(coordinates, rookCoordinates)) continue;
      if (
        !equals(coordinates, kingCoordinates) &&
        this.getBoard().getPiece(coordinates) != null
      )
        return false;
      if (getDistanceSquared(coordinates, move.getKing()) <= 4) {
        for (const piece of this.getBoard()
          .getPieces()
          .filter(
            (piece) => piece.getPlayer() == getOtherPlayer(this.getPlayer()),
          )) {
          if (
            piece.canDoMove(new NormalMove(piece.getCoordinates(), coordinates))
          )
            return false;
          if (
            piece.canDoMove(
              new PawnReachesEndMove(
                piece.getCoordinates(),
                coordinates,
                PieceType.QUEEN,
              ),
            )
          )
            return false;
        }
      }
    }

    return true;
  }

  public canDoMove(move: Move): boolean {
    if (this.canDoNormalMove(move)) return true;
    if (this.canDoCastlingMove(move)) return true;
    return false;
  }

  public doMove(move: Move): void {
    if (!this.canDoMove(move)) throw Error("Cannot do this move!");
    if (move instanceof NormalMove) {
      this.getBoard().removePiece(move.getTo());
      this.coordinates = move.getTo().clone();
      this.hasMoved = true;
    }
    if (move instanceof CastlingMove) {
      const kingCoordinates = NormalCoordinates.fromCoordinates(move.getKing());
      const delta = getDistanceVector(kingCoordinates, move.getRook());
      const rook = this.getBoard().getPiece(move.getRook()) as Rook;

      let newRookCoordinates: Coordinates;
      let newKingCoordinates: Coordinates;

      if (delta.deltaColumn > 0) {
        newKingCoordinates = new NormalCoordinates(kingCoordinates.getRow(), 7);
        newRookCoordinates = new NormalCoordinates(kingCoordinates.getRow(), 6);
      } else {
        newKingCoordinates = new NormalCoordinates(kingCoordinates.getRow(), 3);
        newRookCoordinates = new NormalCoordinates(kingCoordinates.getRow(), 4);
      }

      rook.moveTo(newRookCoordinates);
      this.coordinates = newKingCoordinates;
      this.hasMoved = true;
    }
  }

  public getPossibleMoves(): Move[] {
    const moves = [];
    for (const x of [-1, 0, 1]) {
      for (const y of [-1, 0, 1]) {
        try {
          const ownCoordinates = NormalCoordinates.fromCoordinates(
            this.getCoordinates(),
          );
          const coordinates = new NormalCoordinates(
            ownCoordinates.getRow() + y,
            ownCoordinates.getColumn() + x,
          );
          const move = new NormalMove(this.getCoordinates(), coordinates);
          if (this.canDoMove(move)) moves.push(move);
        } catch (error) {
          continue;
        }
      }
    }
    for (const rook of this.getBoard()
      .getPieces()
      .filter(
        (piece) =>
          piece.getPlayer() == this.getPlayer() && piece instanceof Rook,
      )) {
      const move = new CastlingMove(
        this.getCoordinates(),
        rook.getCoordinates(),
      );
      if (this.canDoMove(move)) moves.push(move);
    }
    return moves;
  }

  public getPieceType(): PieceType {
    return PieceType.KING;
  }

  public clone(): Piece {
    return new King(
      this.coordinates,
      this.getPlayer(),
      this.getBoard(),
      this.hasMoved,
    );
  }

  _toJSON(): {
    hasMoved?: boolean;
    enPasseIsPossible?: boolean;
  } {
    return { hasMoved: this.hasMoved };
  }
}
