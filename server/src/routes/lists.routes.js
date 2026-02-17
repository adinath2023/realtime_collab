import { Router } from "express";
import { prisma } from "../prisma.js";
import { emitToBoard } from "../sockets/index.js";
import { logActivity } from "../services/activity.service.js";

const router = Router();

router.post("/board/:boardId", async (req, res) => {
  const { boardId } = req.params;
  const { title } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ message: "Title required" });

  const board = await prisma.board.findFirst({
    where: { id: boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!board) return res.status(404).json({ message: "Board not found" });

  const maxPos = await prisma.list.aggregate({ where: { boardId }, _max: { position: true } });
  const position = (maxPos._max.position || 0) + 1;

  const list = await prisma.list.create({ data: { boardId, title: title.trim(), position } });

  await logActivity(prisma, {
    boardId,
    actorId: req.user.id,
    action: "LIST_CREATED",
    entityType: "LIST",
    entityId: list.id,
    metadata: { title: list.title }
  });

  const io = req.app.locals.io;
  emitToBoard(io, boardId, "list:created", { boardId, list });

  res.status(201).json(list);
});

router.patch("/:listId", async (req, res) => {
  const { listId } = req.params;
  const { title, position } = req.body || {};

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return res.status(404).json({ message: "List not found" });

  const board = await prisma.board.findFirst({
    where: { id: list.boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!board) return res.status(403).json({ message: "Forbidden" });

  const updated = await prisma.list.update({
    where: { id: listId },
    data: {
      ...(typeof title === "string" ? { title: title.trim() } : {}),
      ...(Number.isInteger(position) ? { position } : {})
    }
  });

  await logActivity(prisma, {
    boardId: list.boardId,
    actorId: req.user.id,
    action: "LIST_UPDATED",
    entityType: "LIST",
    entityId: listId,
    metadata: { title: updated.title, position: updated.position }
  });

  const io = req.app.locals.io;
  emitToBoard(io, list.boardId, "list:updated", { boardId: list.boardId, list: updated });

  res.json(updated);
});

router.delete("/:listId", async (req, res) => {
  const { listId } = req.params;
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return res.status(404).json({ message: "List not found" });

  const board = await prisma.board.findFirst({
    where: { id: list.boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!board) return res.status(403).json({ message: "Forbidden" });

  await prisma.list.delete({ where: { id: listId } });

  await logActivity(prisma, {
    boardId: list.boardId,
    actorId: req.user.id,
    action: "LIST_DELETED",
    entityType: "LIST",
    entityId: listId,
    metadata: { title: list.title }
  });

  const io = req.app.locals.io;
  emitToBoard(io, list.boardId, "list:deleted", { boardId: list.boardId, listId });

  res.json({ ok: true });
});

export default router;
