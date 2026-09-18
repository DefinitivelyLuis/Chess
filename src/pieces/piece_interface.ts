import { Board } from "../board/board";
import {
  Coordinates,
  LetterCoordinates,
  NormalCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove } from "../moves/move";
import { PieceType, PlayerType } from "./definitions";

export abstract class Piece {
  protected coordinates: Coordinates;
  private player: PlayerType;
  private board: Board;

  constructor(coordinates: Coordinates, player: PlayerType, board: Board) {
    this.coordinates = coordinates;
    this.player = player;
    this.board = board;
  }

  public getPlayer(): PlayerType {
    return this.player;
  }

  public getCoordinates(): Coordinates {
    return this.coordinates;
  }

  public getBoard(): Board {
    return this.board;
  }

  public abstract canDoMove(move: Move): boolean;

  public abstract doMove(move: Move): void;

  public abstract getPossibleMoves(): Move[];

  public abstract getPieceType(): PieceType;

  protected getPossibleMovesStd(): Move[] {
    const moves = [];
    for (let x = 1; x <= 8; x++) {
      for (let y = 1; y <= 8; y++) {
        const to = new NormalCoordinates(x, y);
        const move = new NormalMove(this.getCoordinates().clone(), to);
        if (this.canDoMove(move)) moves.push(move);
      }
    }
    return moves;
  }

  public abstract clone(): Piece;

  public setBoard(board: Board) {
    this.board = board;
  }

  public toJSON(): {
    coordinates: string;
    player: PlayerType;
    type: PieceType;
    hasMoved?: boolean;
    enPassePossible?: boolean;
  } {
    return {
      ...this._toJSON(),
      coordinates: LetterCoordinates.fromCoordinates(
        this.getCoordinates(),
      ).toString(),
      player: this.getPlayer(),
      type: this.getPieceType(),
    };
  }

  abstract _toJSON(): {
    hasMoved?: boolean;
    enPassePossible?: boolean;
  };
}
