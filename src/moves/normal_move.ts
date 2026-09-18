import { Move } from "./move_interface";
import { Coordinates, LetterCoordinates } from "../coordinates/coordinates";

export class NormalMove extends Move {
  private from: Coordinates;
  private to: Coordinates;

  constructor(from: Coordinates, to: Coordinates) {
    super();
    this.from = from;
    this.to = to;
  }

  public getFrom(): Coordinates {
    return this.from;
  }

  public getTo(): Coordinates {
    return this.to;
  }

  public getActingPiece(): Coordinates {
    return this.from;
  }

  public toJson(): any {
    return {
      type: "NORMAL_MOVE",
      from: LetterCoordinates.fromCoordinates(this.from).toString(),
      to: LetterCoordinates.fromCoordinates(this.to).toString(),
    };
  }
}
