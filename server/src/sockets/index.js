import jwt from "jsonwebtoken";

export function setupSockets(io, prisma) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing token"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("board:join", async ({ boardId }) => {
      const member = await prisma.boardMember.findFirst({
        where: { boardId, userId: socket.user.id }
      });
      const isOwner = await prisma.board.findFirst({
        where: { id: boardId, ownerId: socket.user.id }
      });
      if (!member && !isOwner) return;

      socket.join(`board:${boardId}`);
      socket.emit("board:joined", { boardId });
    });

    socket.on("board:leave", ({ boardId }) => {
      socket.leave(`board:${boardId}`);
    });
  });
}

export function emitToBoard(io, boardId, event, payload) {
  io.to(`board:${boardId}`).emit(event, payload);
}
