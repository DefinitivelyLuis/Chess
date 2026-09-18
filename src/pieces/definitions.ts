export enum PieceType {
  PAWN = "PAWN",
  KING = "KING",
  QUEEN = "QUEEN",
  ROOK = "ROOK",
  BISHOP = "BISHOP",
  KNIGHT = "KNIGHT",
}

export function getPieceTypeFromName(name: string): PieceType | null {
  return Object.values(PieceType).includes(name as PieceType)
    ? (name as PieceType)
    : null;
}

export enum PlayerType {
  WHITE = "WHITE",
  BLACK = "BLACK",
}

export function getOtherPlayer(player: PlayerType): PlayerType {
  if (player == PlayerType.BLACK) return PlayerType.WHITE;
  return PlayerType.BLACK;
}
