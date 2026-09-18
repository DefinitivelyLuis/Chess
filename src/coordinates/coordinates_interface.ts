import { NormalCoordinates } from "./normal_coordinates";

export abstract class Coordinates {
  public abstract toNormal(): NormalCoordinates;

  public clone(): Coordinates {
    return this.toNormal();
  }
}
