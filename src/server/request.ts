import * as http from "http";
import { text } from "node:stream/consumers";
import { Board } from "../board/board";
import {
  getPieceTypeFromName,
  PlayerType,
  createPiece,
  Piece,
} from "../pieces/piece";
import { Move, moveFromJSON } from "../moves/move";
import { getCoordinates } from "../moves/from_json";

function getPlayerType(
  json: Record<string, unknown>,
  name: string,
): PlayerType | string {
  if (!(name in json)) return `${name} is undefined!`;
  const entry = json[name];
  if (typeof entry !== "string")
    return `${name} has the wrong data type! A String was expected.`;
  if (entry == "WHITE") return PlayerType.WHITE;
  if (entry == "BLACK") return PlayerType.BLACK;
  return `${name} needs to be either BLACK or WHITE!`;
}

function getBoolean(
  json: Record<string, unknown>,
  name: string,
): boolean | undefined {
  if (!(name in json)) return undefined;
  switch (json[name]) {
    case "TRUE":
      return true;
    case "FALSE":
      return false;
    default:
      return undefined;
  }
}

function getRequestJSON(
  request: string,
): [Record<string, unknown>, string] | null {
  try {
    const json = JSON.parse(request);
    if (json["type"] === undefined) return null;
    return [json, json.type];
  } catch (error) {
    return null;
  }
}

function handleMoveRequest(
  json: Record<string, unknown>,
  board: Board,
  setBoard: (arg0: Board) => void,
  password: { passwordWhite: string; passwordBlack: string },
): { error?: string; msg?: string } {
  let player: PlayerType = PlayerType.BLACK;

  if (!("password" in json)) return { error: "Password is undefined!" };
  if (!("move" in json)) return { error: "Move is undefined!" };

  if (json.password === password.passwordWhite) {
    player = PlayerType.WHITE;
  } else if (json.password !== password.passwordBlack) {
    return { error: "Wrong password!" };
  }

  if (player !== board.getActivePLayer())
    return { error: "Only the active player can do a move!" };

  const move = moveFromJSON(json.move as Record<string, unknown>);
  if (!(move instanceof Move)) return move;

  if (!board.canDoMove(move)) return { error: "Cannot do the move!" };

  setBoard(board.doMove(move));

  return { msg: "success" };
}

function handlePossibleMovesRequest(json: Record<string, unknown>): {
  error?: string;
  possibleMoves?: any[];
} {
  if (!("board" in json)) return { error: "Board is undefined!" };
  const board = json["board"];
  if (typeof board !== "object" || board === null)
    return { error: "board is of wrong type!" };
  if (
    !("timeSincePieceTaken" in board) ||
    typeof board.timeSincePieceTaken !== "number"
  )
    return { error: "timeSincePieceTaken is undefined or of wrong type!" };
  if (!("pieces" in board) || !Array.isArray(board.pieces))
    return { error: "Pieces is undefined or of wrong type!" };

  const pieces: Piece[] = [];

  for (const _piece of board.pieces) {
    if (typeof _piece !== "object")
      return { error: `Piece ${_piece} is of wrong type!` };

    const coordinates = getCoordinates(_piece, "coordinates");
    const player = getPlayerType(_piece, "player");

    if (typeof coordinates === "string") return { error: coordinates };
    if (typeof player === "string" && !Object.values(PlayerType).includes(player as PlayerType)) {
      return { error: player };
    }

    if (!("type" in _piece) || typeof _piece.type !== "string")
      return { error: 'Piece must have the entry "type" with type string!' };
    const piece = getPieceTypeFromName(_piece.type);
    if (piece == null) return { error: `${piece} is an invalid piece type.` };

    pieces.push(
      createPiece(
        coordinates,
        player as PlayerType,
        null as unknown as Board,
        piece,
        getBoolean(_piece, "hasMoved"),
        getBoolean(_piece, "enPasseIsPossible"),
      ),
    );
  }

  const activePlayer = getPlayerType(board, "activePlayer");
  if (typeof activePlayer === "string" && !Object.values(PlayerType).includes(activePlayer as PlayerType)) {
    return { error: activePlayer };
  }

  return {
    possibleMoves: new Board(pieces, activePlayer as PlayerType, board.timeSincePieceTaken)
      .getPossibleMoves()
      .map((move) => move.toJson()),
  };
}

function handleGetBoardRequest(board: Board): {
  board: {
    pieces: any[];
    activePlayer: PlayerType;
    gameIsOver: boolean;
    timeSincePieceTaken: number;
  };
} {
  return {
    board: {
      pieces: board.getPieces().map((piece) => piece.toJSON()),
      activePlayer: board.getActivePLayer(),
      gameIsOver: board.gameIsOver(),
      timeSincePieceTaken: board.getTimeSincePieceTaken(),
    },
  };
}

export async function handleRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  board: Board,
  setBoard: (arg0: Board) => void,
  password: { passwordWhite: string; passwordBlack: string },
) {
  let _response: any = {};
  const _request: string = await text(request);

  try {
    _response = _handleRequest(_request, board, setBoard, password);
  } catch (error) {
    _response = { error: `Internal Server Error ${error}` };
  }

  response.write(JSON.stringify({ request: _request, response: _response }));
  response.end();
}

function _handleRequest(
  request: string,
  board: Board,
  setBoard: (arg0: Board) => void,
  password: { passwordWhite: string; passwordBlack: string },
): any {
  const _json = getRequestJSON(request);
  if (_json === null) {
    return { error: "Could not parse the json!" };
  }
  const [json, type] = _json;

  let response: any = {};

  if (type == "MOVE") {
    response = handleMoveRequest(json, board, setBoard, password);
  } else if (type == "POSSIBLE_MOVES") {
    response = handlePossibleMovesRequest(json);
  } else if (type == "GET_BOARD") {
    response = handleGetBoardRequest(board);
    console.log("DEBUG GET_BOARD response keys:", Object.keys(response));
  } else {
    return {
      error:
        'The json must contain the type field with one of ["MOVE", "POSSIBLE_MOVES", "GET_BOARD"].',
    };
  }

  return { type: type, ...response };
}
