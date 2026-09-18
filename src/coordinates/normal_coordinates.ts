import { Coordinates } from "./coordinates_interface";

export class NormalCoordinates extends Coordinates {
  private row: number;
  private column: number;

  constructor(row: number, column: number) {
    super();
    this.row = row;
    this.column = column;

    if (row < 1 || 8 < row || column < 1 || 8 < column)
      throw Error("Error: (" + row + "," + column + ") is out of bounds!");
  }

  public toNormal(): NormalCoordinates {
    return new NormalCoordinates(this.row, this.column);
  }

  public static fromCoordinates(coordinates: Coordinates): NormalCoordinates {
    return coordinates.toNormal();
  }

  public getRow(): number {
    return this.row;
  }

  public getColumn(): number {
    return this.column;
  }
}
