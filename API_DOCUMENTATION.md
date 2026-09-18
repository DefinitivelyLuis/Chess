# Chess Server API Documentation

**Base URL:** `http://localhost:12345`  
**Protocol:** HTTP POST  
**Content-Type:** `application/json`

---

## Overview

The Chess Server is a stateless HTTP API for managing chess games. All requests are POST requests with JSON bodies. The server maintains a single shared board state that persists across requests.

### Authentication

Two players are identified by passwords (The passwords will change):

- **White:** `"5678"`
- **Black:** `"1234"`

---

## Response Format

All HTTP responses follow a structure like this:

```json
{
  "request": "{original request as JSON string}",
  "response": {
    "type": "GET_BOARD",
    "board": {
      "pieces": [...],
      "activePlayer": "WHITE",
      "gameIsOver": false,
      "timeSincePieceTaken": 0
    }
  }
}
```

**To use the response:**

1. Parse the raw HTTP response body with `JSON.parse()`
2. Extract `envelope.response` — this is the actual API response object
3. Access response fields based on the request type

The `response` field contents depend on which endpoint was called:

- **GET_BOARD:** Contains `type`, `board` (with `pieces`, `activePlayer`, `gameIsOver`, `timeSincePieceTaken`)
- **MOVE:** Contains `type`, `msg` (on success) or `error` (on failure)
- **POSSIBLE_MOVES:** Contains `type`, `possibleMoves` (array) or `error` (on failure)

---

## Endpoints

### 1. GET_BOARD

**Get the current board state and game information.**

#### Request

```json
{
  "type": "GET_BOARD",
  "id": 1
}
```

#### Response (Inside Envelope)

After parsing the envelope, the `response` object contains:

```json
{
  "type": "GET_BOARD",
  "board": {
    "pieces": [
      {
        "coordinates": "A1",
        "player": "WHITE",
        "type": "ROOK",
        "hasMoved": false
      },
      {
        "coordinates": "E1",
        "player": "WHITE",
        "type": "KING",
        "hasMoved": false
      },
      ...
    ],
    "activePlayer": "WHITE",
    "gameIsOver": false,
    "timeSincePieceTaken": 0
  }
}
```

#### Response Structure

The response contains a `board` object with the following fields:

| Field                       | Type    | Description                                                       |
| --------------------------- | ------- | ----------------------------------------------------------------- |
| `board.pieces`              | Array   | Array of piece objects currently on the board                     |
| `board.activePlayer`        | String  | Current player's turn: `"WHITE"` or `"BLACK"`                     |
| `board.gameIsOver`          | Boolean | Whether the game has ended (checkmate/stalemate)                  |
| `board.timeSincePieceTaken` | Number  | Number of moves since last piece capture (resets to 0 on capture) |

#### Piece Object Fields

| Field             | Type    | Description                                                               |
| ----------------- | ------- | ------------------------------------------------------------------------- |
| `coordinates`     | String  | Algebraic notation (`"A1"` - `"H8"`)                                      |
| `player`          | String  | `"WHITE"` or `"BLACK"`                                                    |
| `type`            | String  | `"PAWN"`, `"KNIGHT"`, `"BISHOP"`, `"ROOK"`, `"QUEEN"`, `"KING"`           |
| `hasMoved`        | Boolean | Whether piece has moved from starting position (for castling eligibility) |
| `enPassePossible` | Boolean | Whether pawn can be captured en passant                                   |

---

### 2. MOVE

**Execute a move on the board.**

#### Request - Normal Move (Also used by En Passe)

```json
{
  "type": "MOVE",
  "password": "5678",
  "move": {
    "type": "NORMAL_MOVE",
    "from": "E2",
    "to": "E4"
  }
}
```

#### Request - Castling

```json
{
  "type": "MOVE",
  "password": "5678",
  "move": {
    "type": "CASTLING_MOVE",
    "king": "E1",
    "rook": "H1"
  }
}
```

#### Request - Pawn Promotion

```json
{
  "type": "MOVE",
  "password": "5678",
  "move": {
    "type": "PAWN_REACHES_END_MOVE",
    "from": "A7",
    "to": "A8",
    "newPiece": "QUEEN"
  }
}
```

#### Response - Success (Inside Envelope)

```json
{
  "type": "MOVE",
  "msg": "success"
}
```

#### Response - Error (Inside Envelope)

```json
{
  "type": "MOVE",
  "error": "Only the active player can do a move!"
}
```

**Note:** Check for the `error` field to distinguish between success and failure responses.

#### Move Types

| Type                    | Description                         | Required Fields          |
| ----------------------- | ----------------------------------- | ------------------------ |
| `NORMAL_MOVE`           | Standard piece move or pawn capture | `from`, `to`             |
| `CASTLING_MOVE`         | King-side or queen-side castle      | `king`, `rook`           |
| `PAWN_REACHES_END_MOVE` | Pawn promotion at end of board      | `from`, `to`, `newPiece` |

#### Coordinate System

Coordinates are in algebraic notation (e.g., `"E2"`, `"A8"`):

- **Columns:** A-H (left to right from white's perspective)
- **Rows:** 1-8 (bottom to top from white's perspective)
- **Format:** Case-insensitive string `"[A-H][1-8]"`

#### Common Errors

| Error                                       | Meaning                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `"Only the active player can do a move!"`   | Wrong player's turn (check `activePlayer` in GET_BOARD)     |
| `"Wrong password!"`                         | Invalid password for this player                            |
| `"Password is undefined!"`                  | Missing `password` field                                    |
| `"Move is undefined!"`                      | Missing or malformed `move` object                          |
| `"Cannot do the move!"`                     | Move violates chess rules (illegal, moves into check, etc.) |
| `"Could not parse the json!"`               | Request JSON is malformed                                   |
| `"The json must contain the type field..."` | Missing or invalid `type` field in request                  |

---

### 3. POSSIBLE_MOVES

**Get all legal moves for a given board position (for analysis/AI).**

#### Request

```json
{
  "type": "POSSIBLE_MOVES",
  "board": {
    "pieces": [
      {
        "coordinates": "A1",
        "player": "WHITE",
        "type": "ROOK",
        "hasMoved": false
      },
      ...
    ],
    "timeSincePieceTaken": 0,
    "activePlayer": "WHITE"
  }
}
```

#### Response (Inside Envelope)

```json
{
  "type": "POSSIBLE_MOVES",
  "possibleMoves": [
    {"type": "NORMAL_MOVE", "from": "E2", "to": "E4"},
    {"type": "NORMAL_MOVE", "from": "E2", "to": "E3"},
    {"type": "CASTLING_MOVE", "king": "E1", "rook": "H1"},
    {"type": "PAWN_REACHES_END_MOVE", "from": "A7", "to": "A8", "newPiece": "QUEEN"},
    ...
  ]
}
```

**Note:** If `error` field is present, the move calculation failed.

#### Use Case

This endpoint is primarily for analysis, move validation, and AI engines. To play a game, use GET_BOARD and MOVE.

#### Board Format for POSSIBLE_MOVES

The `board` parameter is an object containing:

- `pieces` array: Piece array from GET_BOARD response (each piece has `coordinates`, `player`, `type`, optional `hasMoved`, optional `enPassePossible`)
- `timeSincePieceTaken` number: From GET_BOARD response
- `activePlayer` string: Player's turn ("WHITE" or "BLACK")

**Convenience:** You can pass the entire `board` object from a GET_BOARD response directly to POSSIBLE_MOVES—the extra `gameIsOver` field is automatically ignored:

```javascript
// Simple pass-through usage
const boardResp = await getBoard();
const possibleMoves = await getPossibleMoves(boardResp.board);

// Or with explicit activePlayer
const moves = await getPossibleMoves(boardResp.board, boardResp.board.activePlayer);
```

#### POSSIBLE_MOVES Errors

| Error                                     | Meaning                                        |
| ----------------------------------------- | ---------------------------------------------- |
| `"Board is undefined!"`                   | Missing `board` parameter                      |
| `"board is of wrong type!"`               | `board` is not an object                       |
| `"timeSincePieceTaken is undefined..."`   | Missing or invalid `timeSincePieceTaken` field |
| `"Pieces is undefined or of wrong type!"` | Missing `pieces` array in board object         |
| `"player is undefined..."`                | Piece missing valid `player` field             |
| `"Piece must have the entry "type"..."`   | Piece missing `type` field                     |
| `"activePlayer is undefined..."`          | Missing or invalid `activePlayer` parameter    |

---

## Example Game Flow

```
1. GET_BOARD
   Request:  { type: "GET_BOARD", id: 1 }
   Response: {
     request: "{\"type\":\"GET_BOARD\",\"id\":1}",
     response: {
       type: "GET_BOARD",
       board: {
         pieces: [...16 white + 16 black pieces...],
         activePlayer: "WHITE",
         gameIsOver: false,
         timeSincePieceTaken: 0
       }
     }
   }

2. MOVE (white pawn e2→e4)
   Request:  {
     type: "MOVE",
     password: "5678",
     move: { type: "NORMAL_MOVE", from: "E2", to: "E4" }
   }
   Response: {
     request: "{...}",
     response: { type: "MOVE", msg: "success" }
   }

3. GET_BOARD
   → Board updated, activePlayer changed to "BLACK"

4. MOVE (black pawn e7→e5)
   Request:  {
     type: "MOVE",
     password: "1234",
     move: { type: "NORMAL_MOVE", from: "E7", to: "E5" }
   }
   Response: {
     request: "{...}",
     response: { type: "MOVE", msg: "success" }
   }

5. Repeat GET_BOARD and MOVE until gameIsOver = true
```

---

## Chess Rules Implemented

✅ **Piece Movements**

- Pawn: Forward 1 or 2 squares (from start), captures diagonally
- Knight: L-shaped (2+1 squares)
- Bishop: Diagonal any distance
- Rook: Horizontal/vertical any distance
- Queen: Combination of bishop and rook
- King: One square in any direction

✅ **Special Moves**

- Castling: King and rook move simultaneously (kingside/queenside)
- En Passant: Capture opponent's pawn that advanced 2 squares
- Pawn Promotion: Pawn becomes queen/rook/bishop/knight at end of board

✅ **Game Rules**

- Turn alternation enforced by password
- Move validation (can't move into check, etc.)
- Check/checkmate/stalemate detection
- Piece capture tracking (`timeSincePieceTaken`)

---

## Error Handling

Errors are returned in the `response` object (inside the envelope) with an `"error"` field. The response will NOT have `msg`, `possibleMoves`, or expected fields when an error occurs.

**Example error response (after extracting envelope.response):**

```json
{
  "type": "MOVE",
  "error": "Only the active player can do a move!"
}
```

**Recommended error handling pattern:**

```javascript
async function executeRequest(request) {
  const response = await fetch("http://localhost:12345", {
    method: "POST",
    body: JSON.stringify(request),
  });

  const envelope = JSON.parse(await response.text());
  const result = envelope.response;

  // Check for errors first
  if (result.error) {
    throw new Error(`[${result.type}] ${result.error}`);
  }

  // Process successful response
  return result;
}
```

---

## Implementation Notes

1. **Stateless Client Design:** The server maintains state; clients are stateless. Always call GET_BOARD before making decisions.

2. **Single Game Board:** All requests modify the same shared board

3. **Response Parsing:** Parse the response envelope once:

   ```javascript
   const envelope = JSON.parse(rawResponse);
   const response = envelope.response; // Already an object, no double-parse needed
   ```

4. **Coordinate Format:** Coordinates use algebraic notation (A1-H8). Piece positions in responses are strings like `"E2"` or `"H1"`.

5. **Optional Request Tracking:** Fields like the `id` field in requests is optional and ignored by the server—clients can use it for request/response correlation. You can also always send the `password` field, it is simply ignored if it is not required.

---

## Testing the API

### Using cURL

```bash
# Get board state
curl -X POST http://localhost:12345 \
  -H "Content-Type: application/json" \
  -d '{"type":"GET_BOARD","id":1}' | jq '.response.board'

# Make a move (extract and check response)
curl -X POST http://localhost:12345 \
  -H "Content-Type: application/json" \
  -d '{
    "type":"MOVE",
    "password":"5678",
    "move":{"type":"NORMAL_MOVE","from":"E2","to":"E4"}
  }' | jq '.response'

# Get possible moves for analysis
curl -X POST http://localhost:12345 \
  -H "Content-Type: application/json" \
  -d '{
    "type":"POSSIBLE_MOVES",
    "board":{"pieces":[{"coordinates":"E1","player":"WHITE","type":"KING"}],"timeSincePieceTaken":0,"activePlayer":"WHITE"}
  }' | jq '.response.possibleMoves'
```

**Note:** Use `jq` to parse and pretty-print JSON responses.

### Using JavaScript/TypeScript

```typescript
async function getBoard() {
  const response = await fetch("http://localhost:12345", {
    method: "POST",
    body: JSON.stringify({ type: "GET_BOARD", id: 1 }),
  });

  const envelope = JSON.parse(await response.text());
  const boardResponse = envelope.response;

  // Access pieces array
  const pieces = boardResponse.board.pieces;
  const activePlayer = boardResponse.board.activePlayer;
  const gameIsOver = boardResponse.board.gameIsOver;

  return { pieces, activePlayer, gameIsOver };
}

async function makeMove(from, to, password) {
  const response = await fetch("http://localhost:12345", {
    method: "POST",
    body: JSON.stringify({
      type: "MOVE",
      password,
      move: { type: "NORMAL_MOVE", from, to },
    }),
  });

  const envelope = JSON.parse(await response.text());
  const moveResponse = envelope.response;

  if (moveResponse.error) {
    throw new Error(moveResponse.error);
  }

  return moveResponse.msg; // "success"
}

async function getPossibleMoves(boardState, activePlayer) {
  const response = await fetch("http://localhost:12345", {
    method: "POST",
    body: JSON.stringify({
      type: "POSSIBLE_MOVES",
      board: {
        pieces: boardState.pieces,
        timeSincePieceTaken: boardState.timeSincePieceTaken,
        activePlayer,
      },
    }),
  });

  const envelope = JSON.parse(await response.text());
  const movesResponse = envelope.response;

  if (movesResponse.error) {
    throw new Error(movesResponse.error);
  }

  return movesResponse.possibleMoves; // Array of move objects
}
```

---

## API Contract

The server guarantees:

- ✅ Consistent board state across all clients
- ✅ Move validation against all chess rules
- ✅ Proper turn enforcement via password
- ✅ Accurate piece tracking
- ✅ Game state detection (checkmate/stalemate)

The server does NOT guarantee:

- ❌ HTTPS encryption
- ❌ Authentication beyond password
- ❌ Persistence across server restarts
- ❌ Multi-game isolation (single shared board)
- ❌ Real-time push notifications

---

**Last Updated:** September 8, 2026  
**API Version:** 1.0  
**Status:** Stable
