import { Coordinates, LetterCoordinates } from "../coordinates/coordinates";
import { getPieceTypeFromName } from "../pieces/piece";
import { CastlingMove } from "./castling_move";
import { NormalMove } from "./normal_move";
import { PawnReachesEndMove } from "./pawn_reaches_end_move";
import { Move } from "./move_interface";

export function getCoordinates(
  json: Record<string, unknown>,
  name: string,
): Coordinates | string {
  if (!(name in json)) return `${name} is undefined!`;
  const entry = json[name];
  if (!(typeof entry === "string"))
    return `${name} has the wrong data type! A String was expected.`;
  try {
    const coordinates = LetterCoordinates.fromString(entry);
    return coordinates;
  } catch (error) {
    return `Could not convert the string ${entry} into coordinates. Error happened while parsing ${name}.`;
  }
}

export function moveFromJSON(
  json: Record<string, unknown>,
): Move | { error: string } {
  if (!("type" in json) || typeof json.type !== "string")
    return { error: "Move is undefined!" };

  switch (json.type) {
    case "NORMAL_MOVE": {
      const from = getCoordinates(json, "from");
      const to = getCoordinates(json, "to");
      if (!(from instanceof Coordinates)) return { error: from };
      if (!(to instanceof Coordinates)) return { error: to };
      return new NormalMove(from, to);
    }

    case "PAWN_REACHES_END_MOVE": {
      const from = getCoordinates(json, "from");
      const to = getCoordinates(json, "to");
      const _newPiece = json["newPiece"];
      if (typeof _newPiece !== "string")
        return {
          error: `${_newPiece} has the wrong data type! A String was expected.`,
        };
      const newPiece = getPieceTypeFromName(_newPiece);
      if (newPiece === null) return { error: `Wrong piece name ${_newPiece}!` };
      if (!(from instanceof Coordinates)) return { error: from };
      if (!(to instanceof Coordinates)) return { error: to };
      return new PawnReachesEndMove(from, to, newPiece);
    }

    case "CASTLING_MOVE": {
      const king = getCoordinates(json, "king");
      const rook = getCoordinates(json, "rook");
      if (!(king instanceof Coordinates)) return { error: king };
      if (!(rook instanceof Coordinates)) return { error: rook };
      return new CastlingMove(king, rook);
    }

    default:
      return { error: `Unknown type: ${json.type}!` };
  }
}
