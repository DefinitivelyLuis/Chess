import { Coordinates, LetterCoordinates } from "../coordinates/coordinates";
import { PieceType } from "../pieces/piece";
import { Move } from "./move_interface";

export class PawnReachesEndMove extends Move {
  private from: Coordinates;
  private to: Coordinates;
  private newPiece: PieceType;

  constructor(from: Coordinates, to: Coordinates, newPiece: PieceType) {
    super();
    this.from = from;
    this.to = to;
    this.newPiece = newPiece;
    if (newPiece == PieceType.PAWN)
      throw Error("You cannot replace a pawn by another pawn!");
  }

  public getFrom(): Coordinates {
    return this.from;
  }

  public getTo(): Coordinates {
    return this.to;
  }

  public getNewPiece(): PieceType {
    return this.newPiece;
  }

  public getActingPiece(): Coordinates {
    return this.from;
  }

  public toJson(): any {
    return {
      type: "PAWN_REACHES_END_MOVE",
      from: LetterCoordinates.fromCoordinates(this.from).toString(),
      to: LetterCoordinates.fromCoordinates(this.to).toString(),
      newPiece: this.newPiece,
    };
  }
}
