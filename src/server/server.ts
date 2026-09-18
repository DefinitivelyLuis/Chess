import * as http from "http";
import { handleRequest } from "./request";
import { Board } from "../board/board";

export class ChessServer {
  public static PORT: number = 12345;
  private server: http.Server;
  private board: Board;

  constructor() {
    this.board = Board.create_std();

    this.server = http.createServer(
      (request: http.IncomingMessage, response: http.ServerResponse) => {
        handleRequest(
          request,
          response,
          this.getBoard(),
          (board) => this.setBoard(board),
          { passwordBlack: "1234", passwordWhite: "5678" },
        );
      },
    );

    this.server.listen(ChessServer.PORT, () => {
      console.log(`Server is running on http://localhost:${ChessServer.PORT}.`);
    });
  }

  private getBoard() {
    return this.board;
  }

  private setBoard(board: Board) {
    this.board = board;
  }
}
