import { Coordinates, LetterCoordinates } from "../coordinates/coordinates";
import { Move } from "./move_interface";

export class CastlingMove extends Move {
  private king: Coordinates;
  private rook: Coordinates;

  constructor(king: Coordinates, rook: Coordinates) {
    super();
    this.king = king;
    this.rook = rook;
  }

  public getKing(): Coordinates {
    return this.king;
  }

  public getRook(): Coordinates {
    return this.rook;
  }

  public getActingPiece(): Coordinates {
    return this.king;
  }

  public toJson(): any {
    return {
      type: "CASTLING_MOVE",
      king: LetterCoordinates.fromCoordinates(this.king).toString(),
      rook: LetterCoordinates.fromCoordinates(this.rook).toString(),
    };
  }
}
