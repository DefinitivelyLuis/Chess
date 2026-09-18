import { PlayerType } from "../pieces/piece";
import { Coordinates } from "./coordinates_interface";
import { NormalCoordinates } from "./normal_coordinates";

export class RelativeCoordinates extends Coordinates {
  private row: number;
  private column: number;
  private player: PlayerType;

  constructor(row: number, column: number, player: PlayerType) {
    super();
    this.row = row;
    this.column = column;
    this.player = player;

    if (row < 1 || 8 < row || column < 1 || 8 < column)
      throw Error("Error: (" + row + "," + column + ") is out of bounds!");
  }

  public toNormal(): NormalCoordinates {
    const row = this.player == PlayerType.WHITE ? this.row : 9 - this.row;
    return new NormalCoordinates(row, this.column);
  }

  public static fromCoordinates(
    coordinates: Coordinates,
    player: PlayerType,
  ): RelativeCoordinates {
    const normal = coordinates.toNormal();
    const row =
      player == PlayerType.WHITE ? normal.getRow() : 9 - normal.getRow();
    return new RelativeCoordinates(row, normal.getColumn(), player);
  }

  public getRow(): number {
    return this.row;
  }

  public getColumn(): number {
    return this.column;
  }
}
