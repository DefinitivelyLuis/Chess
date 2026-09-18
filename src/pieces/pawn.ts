import { Board } from "../board/board";
import {
  Coordinates,
  NormalCoordinates,
  RelativeCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove, PawnReachesEndMove } from "../moves/move";
import { PieceType, PlayerType } from "./definitions";
import { Piece } from "./piece_interface";
import { createPiece } from "./utils";

export class PseudoPawn extends Piece {
  private piece: Piece;

  private constructor(
    coordinates: Coordinates,
    player: PlayerType,
    board: Board,
    piece: Piece,
  ) {
    super(coordinates, player, board);
    this.piece = piece;
  }

  public static create(
    coordinates: Coordinates,
    player: PlayerType,
    board: Board,
    enPasseIsPossible: boolean,
  ): PseudoPawn {
    return new PseudoPawn(
      coordinates,
      player,
      board,
      Pawn.create(coordinates, player, board, enPasseIsPossible),
    );
  }

  public canDoMove(move: Move): boolean {
    return this.piece.canDoMove(move);
  }

  public doMove(move: Move): void {
    this.piece.doMove(move);
    this.coordinates = NormalCoordinates.fromCoordinates(
      this.piece.getCoordinates(),
    ).clone();
    if (move instanceof PawnReachesEndMove) {
      this.piece = createPiece(
        this.coordinates,
        this.getPlayer(),
        this.getBoard(),
        move.getNewPiece(),
        true,
      );
    }
  }

  public getPossibleMoves(): Move[] {
    return this.piece.getPossibleMoves();
  }

  public getPieceType(): PieceType {
    return this.piece.getPieceType();
  }

  public clone(): Piece {
    return new PseudoPawn(
      this.coordinates.clone(),
      this.getPlayer(),
      this.getBoard(),
      this.piece.clone(),
    );
  }

  public setBoard(board: Board): void {
    super.setBoard(board);
    this.piece.setBoard(board);
  }

  _toJSON(): {
    hasMoved?: boolean;
    enPassePossible?: boolean;
  } {
    return this.piece._toJSON();
  }
}

class Pawn extends Piece {
  private enPassePossible: boolean;

  private constructor(
    coordinates: Coordinates,
    player: PlayerType,
    board: Board,
    enPassePossible: boolean,
  ) {
    super(coordinates, player, board);
    this.enPassePossible = enPassePossible;
  }

  public static create(
    coordinates: Coordinates,
    player: PlayerType,
    board: Board,
    enPassePossible: boolean,
  ): Pawn {
    return new Pawn(coordinates, player, board, enPassePossible);
  }

  public canDoMove(move: Move): boolean {
    if (!(move instanceof NormalMove || move instanceof PawnReachesEndMove))
      return false;

    const relativeFrom = RelativeCoordinates.fromCoordinates(
      move.getFrom(),
      this.getPlayer(),
    );

    const relativeTo = RelativeCoordinates.fromCoordinates(
      move.getTo(),
      this.getPlayer(),
    );

    const deltaDistance = {
      deltaRow: relativeTo.getRow() - relativeFrom.getRow(),
      deltaColumn: relativeTo.getColumn() - relativeFrom.getColumn(),
    };

    if (
      deltaDistance.deltaRow != 1 &&
      (deltaDistance.deltaRow != 2 ||
        relativeFrom.getRow() != 2 ||
        this.getBoard().getPiece(
          new RelativeCoordinates(
            3,
            relativeFrom.getColumn(),
            this.getPlayer(),
          ),
        ) != null)
    )
      return false;
    if (Math.abs(deltaDistance.deltaColumn) > 1) return false;
    const pieceTaken = this.getBoard().getPiece(move.getTo());
    const pieceTakenByEnPasse = this.getBoard().getPiece(
      new NormalCoordinates(
        NormalCoordinates.fromCoordinates(move.getFrom()).getRow(),
        NormalCoordinates.fromCoordinates(move.getTo()).getColumn(),
      ),
    );
    if (deltaDistance.deltaColumn == 0 && pieceTaken != null) return false;
    if (
      Math.abs(deltaDistance.deltaColumn) == 1 &&
      pieceTaken == null &&
      (!(pieceTakenByEnPasse instanceof Pawn) ||
        !pieceTakenByEnPasse.enPasseIsPossible())
    )
      return false;

    if (
      move instanceof PawnReachesEndMove &&
      move.getNewPiece() in [PieceType.PAWN, PieceType.KING]
    )
      return false;
    if (move instanceof PawnReachesEndMove && relativeFrom.getRow() != 7)
      return false;
    return true;
  }

  public enPasseIsPossible(): boolean {
    return this.enPassePossible;
  }

  public doMove(move: Move): void {
    if (!this.canDoMove(move)) throw Error("Cannot do the move!");
    if (move instanceof NormalMove || move instanceof PawnReachesEndMove) {
      this.getBoard().removePiece(move.getTo());
      this.coordinates = move.getTo().clone();
      if (
        RelativeCoordinates.fromCoordinates(
          move.getFrom(),
          this.getPlayer(),
        ).getRow() == 2
      )
        this.enPassePossible = true;
    }
  }

  public getPossibleMoves(): Move[] {
    let moves: Move[] = [];
    const ownCoordinates = RelativeCoordinates.fromCoordinates(
      this.coordinates,
      this.getPlayer(),
    );
    for (const [x, y] of [
      [-1, 1],
      [0, 1],
      [1, 1],
      [0, 2],
    ]) {
      try {
        const coordinates = new RelativeCoordinates(
          ownCoordinates.getRow() + y,
          ownCoordinates.getColumn() + x,
          this.getPlayer(),
        );
        const newMoves = [
          new NormalMove(this.getCoordinates().clone(), coordinates),
          ...[
            PieceType.BISHOP,
            PieceType.KNIGHT,
            PieceType.QUEEN,
            PieceType.ROOK,
          ].map(
            (piece) =>
              new PawnReachesEndMove(
                this.getCoordinates().clone(),
                coordinates,
                piece,
              ),
          ),
        ];
        moves = moves.concat(newMoves.filter((move) => this.canDoMove(move)));
      } catch (error) {
        continue;
      }
    }
    return moves;
  }

  public getPieceType(): PieceType {
    return PieceType.PAWN;
  }

  public clone(): Piece {
    return new Pawn(
      this.coordinates.clone(),
      this.getPlayer(),
      this.getBoard(),
      this.enPasseIsPossible(),
    );
  }

  _toJSON(): {
    hasMoved?: boolean;
    enPassePossible?: boolean;
  } {
    return { enPassePossible: this.enPasseIsPossible() };
  }
}
