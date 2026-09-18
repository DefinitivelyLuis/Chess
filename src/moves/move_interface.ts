import { Coordinates } from "../coordinates/coordinates";

export abstract class Move {
  public abstract getActingPiece(): Coordinates;
  public abstract toJson(): any;
}
