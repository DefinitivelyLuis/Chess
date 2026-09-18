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
  PseudoPawn,
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
          PieceType.KNIGHT,
          PieceType.BISHOP,
          PieceType.QUEEN,
          PieceType.KING,
          PieceType.BISHOP,
          PieceType.KNIGHT,
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

  /** Partially written by Claude! */
  public removePiece(coordinates: Coordinates): void {
    const countBefore = this.pieces.length;
    this.pieces = this.pieces.filter(
      (piece) => !equals(piece.getCoordinates(), coordinates),
    );
    // Only reset on an actual capture. Every piece's doMove() calls this for
    // its destination square whether or not anything stands there, so without
    // this guard no move would ever count towards the draw rule.
    // -1 because doMoveNoKingChecks() adds 1 immediately afterwards.
    if (this.pieces.length != countBefore) this.timeSincePieceTaken = -1;
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

  /**
   * Written by Claude!
   *
   * Pseudo-legal moves for `player`: every move that player's pieces consider
   * valid, without asking whether the move leaves their own king attacked.
   *
   * This is the non-recursive base that isInCheck() and getPossibleMoves()
   * both build on. It only calls Piece.getPossibleMoves(), which consults
   * Piece.canDoMove() and never re-enters Board.canDoMove(),
   * Board.getPossibleMoves() or Board.gameIsOver().
   */
  private getPseudoLegalMoves(player: PlayerType): Move[] {
    let moves: Move[] = [];
    this.pieces.forEach((piece) => {
      if (piece.getPlayer() == player)
        moves = moves.concat(piece.getPossibleMoves());
    });
    return moves;
  }

  /**
   * Written by Claude!
   *
   * The player's king, or null when the position does not contain exactly one.
   * Unlike getKing() this does not throw, so check tests stay usable on the
   * arbitrary positions the POSSIBLE_MOVES endpoint accepts.
   */
  private findKing(player: PlayerType): King | null {
    const kings = this.pieces.filter(
      (piece) => piece instanceof King && piece.getPlayer() == player,
    );
    if (kings.length != 1) return null;
    return kings[0] as King;
  }

  /**
   * Written by Claude!
   *
   * Whether `player`'s king stands on a square the opponent could move onto.
   *
   * Works for either player, including the one to move, because it generates
   * the opponent's moves explicitly rather than reusing getPossibleMoves(),
   * which only ever covers the active player.
   *
   * Non-recursive: the only move generation it triggers is
   * getPseudoLegalMoves().
   */
  public isInCheck(player: PlayerType): boolean {
    const king = this.findKing(player);
    if (king == null) return false;
    const kingSquare = king.getCoordinates();
    return this.getPseudoLegalMoves(getOtherPlayer(player)).some(
      (move) =>
        (move instanceof NormalMove || move instanceof PawnReachesEndMove) &&
        equals(move.getTo(), kingSquare),
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

  /** Partially written by Claude! */
  public doMoveNoKingChecks(move: Move): Board {
    const board = this.clone();
    board._doMove(move);
    board.closeEnPasseWindow(getOtherPlayer(this.activePlayer));
    board.activePlayer = getOtherPlayer(this.activePlayer);
    board.timeSincePieceTaken += 1;
    return board;
  }

  /**
   * Written by Claude!
   *
   * Expires the en passant window for `player`'s pawns.
   *
   * A pawn that double-steps may only be captured en passant by the very next
   * move. The pawn itself cannot tell how many turns have passed, so the board
   * clears the flag: once a player has moved, their opponent's double-step
   * from the previous ply has had its one chance and is now out of date.
   *
   * Must run AFTER the move is applied. The capture itself reads the flag, so
   * clearing first would make the en passant move illegal at the moment it is
   * played. Running afterwards also leaves a double-step made by this very
   * move flagged, since that pawn belongs to the mover, not to `player`.
   */
  private closeEnPasseWindow(player: PlayerType): void {
    this.pieces.forEach((piece) => {
      if (piece instanceof PseudoPawn && piece.getPlayer() == player)
        piece.clearEnPassePossible();
    });
  }

  public doMove(move: Move): Board {
    if (!this.canDoMove(move)) throw Error("Cannot execute the move!");
    return this.doMoveNoKingChecks(move);
  }

  /**
   * Written by Claude!
   *
   * The active player's legal moves: their pseudo-legal moves minus any that
   * would leave their own king attacked.
   *
   * Non-recursive. Each candidate is played on a clone through
   * doMoveNoKingChecks() and judged with isInCheck(), which bottoms out in
   * getPseudoLegalMoves(). It deliberately does NOT use canDoMove(): that
   * would re-enter gameIsOver() -> hasLost() -> getPossibleMoves() and never
   * terminate.
   */
  public getPossibleMoves(): Move[] {
    return this.getPseudoLegalMoves(this.activePlayer).filter((move) =>
      this.keepsOwnKingSafe(move),
    );
  }

  /**
   * Written by Claude!
   *
   * Plays `move` on a clone and reports whether the mover's king survives it.
   * A move the piece rejects on the clone counts as unsafe rather than
   * propagating the error.
   */
  private keepsOwnKingSafe(move: Move): boolean {
    let afterwards: Board;
    try {
      afterwards = this.doMoveNoKingChecks(move);
    } catch (error) {
      return false;
    }
    return !afterwards.isInCheck(this.activePlayer);
  }

  /** Partially written by Claude! */
  public hasLost(player: PlayerType): boolean {
    if (player != this.activePlayer) return false;
    if (this.getPossibleMoves().length > 0) return false;
    // No legal move while not in check is stalemate, which is a draw and not a
    // loss. Only a player who is also in check has been checkmated.
    return this.isInCheck(player);
  }

  /** Partially written by Claude! */
  public isADraw(): boolean {
    if (this.getPieces().length == 2) return true;
    if (this.timeSincePieceTaken >= 100) return true;
    // Stalemate: the side to move has no legal move but is not in check.
    if (
      !this.isInCheck(this.activePlayer) &&
      this.getPossibleMoves().length == 0
    )
      return true;
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
