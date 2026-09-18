import {
  Coordinates,
  equals,
  RelativeCoordinates,
} from "../coordinates/coordinates";
import { Move, NormalMove, PawnReachesEndMove } from "../moves/move";
import {
  createPiece,
  Piece,
  PieceType,
  PlayerType,
  King,
  getOtherPlayer,
} from "../pieces/piece";

export class Board {
  private pieces: Piece[];
  private activePlayer: PlayerType;
  private timeSincePieceTaken: number;

  constructor(
    pieces: Piece[],
    activePlayer: PlayerType,
    timeSincePieceTaken: number,
  ) {
    this.pieces = pieces.map((piece) => piece.clone());
    this.pieces.forEach((piece) => piece.setBoard(this));
    this.activePlayer = activePlayer;
    this.timeSincePieceTaken = timeSincePieceTaken;
  }

  public getPiece(coordinates: Coordinates): Piece | null {
    const pieces = this.pieces.filter((piece) =>
      equals(piece.getCoordinates(), coordinates),
    );
    if (pieces.length == 0) return null;
    return pieces[0];
  }

  public static create_std(): Board {
    let pieces: Piece[] = [];
    [PlayerType.BLACK, PlayerType.WHITE].forEach((player) =>
      [
        [
          PieceType.ROOK,
          PieceType.BISHOP,
          PieceType.KNIGHT,
          PieceType.QUEEN,
          PieceType.KING,
          PieceType.KNIGHT,
          PieceType.BISHOP,
          PieceType.ROOK,
        ],
        [...Array(8).keys()].map(() => PieceType.PAWN),
      ].forEach((piece_types, rowNumber) =>
        piece_types.forEach((piece_type, columnNumber) => {
          const new_piece: Piece = createPiece(
            new RelativeCoordinates(rowNumber + 1, columnNumber + 1, player),
            player,
            null as unknown as Board,
            piece_type,
          );
          pieces = pieces.concat([new_piece]);
        }),
      ),
    );

    return new Board(pieces, PlayerType.WHITE, 0);
  }

  public getKing(player: PlayerType): King {
    const kings = this.pieces.filter(
      (piece) => piece instanceof King && piece.getPlayer() == player,
    );
    if (kings.length != 1)
      throw Error("There shall be exactly one king per player!");
    return kings[0] as King;
  }

  public getPieces(): Piece[] {
    return this.pieces;
  }

  public removePiece(coordinates: Coordinates): void {
    this.pieces = this.pieces.filter(
      (piece) => !equals(piece.getCoordinates(), coordinates),
    );
    this.timeSincePieceTaken = 0;
  }

  public canDoMove(move: Move): boolean {
    if (!this.canDoMoveNoCheckForKing(move)) return false;
    const newBoard = this.doMoveNoKingChecks(move);
    if (newBoard.isInCheck(this.activePlayer)) return false;
    return true;
  }

  private canDoMoveNoCheckForKing(move: Move): boolean {
    const piece = this.getPiece(move.getActingPiece());
    if (piece == null) return false;
    if (piece.getPlayer() != this.activePlayer) return false;
    if (!piece.canDoMove(move)) return false;
    if (this.gameIsOver()) return false;
    return true;
  }

  public isInCheck(player: PlayerType): boolean {
    return (
      this.getPossibleMoves()
        .filter(
          (move) =>
            move instanceof NormalMove || move instanceof PawnReachesEndMove,
        )
        .filter(
          (move) =>
            move.getTo() ==
            this.getKing(getOtherPlayer(player)).getCoordinates(),
        ).length != 0
    );
  }

  private _doMove(move: Move): void {
    const piece = this.getPiece(move.getActingPiece());
    if (piece == null) throw Error("Piece does not exist!");
    piece.doMove(move);
  }

  public clone(): Board {
    return new Board(
      this.pieces.map((piece) => piece.clone()),
      this.activePlayer,
      this.timeSincePieceTaken,
    );
  }

  public doMoveNoKingChecks(move: Move): Board {
    const board = this.clone();
    board._doMove(move);
    board.activePlayer = getOtherPlayer(this.activePlayer);
    board.timeSincePieceTaken += 1;
    return board;
  }

  public doMove(move: Move): Board {
    if (!this.canDoMove(move)) throw Error("Cannot execute the move!");
    return this.doMoveNoKingChecks(move);
  }

  public getPossibleMoves(): Move[] {
    let moves: Move[] = [];
    this.getPieces().forEach((piece) => {
      if (piece.getPlayer() == this.activePlayer)
        moves = moves.concat(piece.getPossibleMoves());
    });
    return moves;
  }

  public hasLost(player: PlayerType): boolean {
    if (player != this.activePlayer) return false;
    if (this.getPossibleMoves().length > 0) return false;
    return true;
  }

  public isADraw(): boolean {
    if (this.getPieces().length == 2) return true;
    if (this.timeSincePieceTaken == 20) return true;
    return false;
  }

  public gameIsOver(): boolean {
    return (
      this.isADraw() ||
      this.hasLost(PlayerType.BLACK) ||
      this.hasLost(PlayerType.WHITE)
    );
  }

  public getActivePLayer(): PlayerType {
    return this.activePlayer;
  }

  public getTimeSincePieceTaken(): number {
    return this.timeSincePieceTaken;
  }
}
