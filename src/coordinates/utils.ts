import { Coordinates } from "./coordinates";
import { NormalCoordinates } from "./normal_coordinates";

export function getDistanceVector(
  from: Coordinates,
  to: Coordinates,
): { deltaRow: number; deltaColumn: number } {
  const from_n = NormalCoordinates.fromCoordinates(from);
  const to_n = NormalCoordinates.fromCoordinates(to);
  return {
    deltaColumn: to_n.getColumn() - from_n.getColumn(),
    deltaRow: to_n.getRow() - from_n.getRow(),
  };
}

export function equals(a: Coordinates, b: Coordinates): boolean {
  const a_n = NormalCoordinates.fromCoordinates(a);
  const b_n = NormalCoordinates.fromCoordinates(b);
  return a_n.getRow() == b_n.getRow() && a_n.getColumn() == b_n.getColumn();
}

export function getDistanceSquared(a: Coordinates, b: Coordinates): number {
  const a_n = NormalCoordinates.fromCoordinates(a);
  const b_n = NormalCoordinates.fromCoordinates(b);
  return (
    Math.pow(a_n.getColumn() - b_n.getColumn(), 2) +
    Math.pow(a_n.getRow() - b_n.getRow(), 2)
  );
}
