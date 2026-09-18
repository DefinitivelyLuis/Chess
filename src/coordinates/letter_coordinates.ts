import { Coordinates } from "./coordinates_interface";
import { NormalCoordinates } from "./normal_coordinates";

export class LetterCoordinates extends Coordinates {
  private row: number;
  private column: string;
  private static COLUMNS: string = "ABCDEFGH";

  constructor(row: number, column: string) {
    super();
    this.row = row;
    this.column = column;

    if (
      row < 1 ||
      8 < row ||
      !LetterCoordinates.COLUMNS.includes(column) ||
      column.length != 1
    )
      throw Error("Error: (" + row + "," + column + ") is out of bounds!");
  }

  public toNormal(): NormalCoordinates {
    return new NormalCoordinates(
      this.row,
      LetterCoordinates.COLUMNS.indexOf(this.column) + 1,
    );
  }

  public static fromString(coordinates: string): LetterCoordinates {
    if (coordinates.length != 2)
      throw Error('Coordinates "' + coordinates + '" are not valid!');
    const column: string = coordinates.charAt(0);
    const row: number = +coordinates.charAt(1);
    return new LetterCoordinates(row, column);
  }

  public toString(): string {
    return this.column + this.row;
  }

  public static fromCoordinates(coordinates: Coordinates): LetterCoordinates {
    const normal = coordinates.toNormal();
    return new LetterCoordinates(
      normal.getRow(),
      LetterCoordinates.COLUMNS.charAt(normal.getColumn() - 1),
    );
  }
}
