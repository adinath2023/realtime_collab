import { Router } from "express";
import { prisma } from "../prisma.js";
import { emitToBoard } from "../sockets/index.js";
import { logActivity } from "../services/activity.service.js";

const router = Router();

router.post("/list/:listId", async (req, res) => {
  const { listId } = req.params;
  const { title, description = "" } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ message: "Title required" });

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return res.status(404).json({ message: "List not found" });

  const board = await prisma.board.findFirst({
    where: { id: list.boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!board) return res.status(403).json({ message: "Forbidden" });

  const maxPos = await prisma.task.aggregate({ where: { listId }, _max: { position: true } });
  const position = (maxPos._max.position || 0) + 1;

  const task = await prisma.task.create({
    data: { listId, title: title.trim(), description, position }
  });

  await logActivity(prisma, {
    boardId: list.boardId,
    actorId: req.user.id,
    action: "TASK_CREATED",
    entityType: "TASK",
    entityId: task.id,
    metadata: { title: task.title, listId }
  });

  const io = req.app.locals.io;
  emitToBoard(io, list.boardId, "task:created", { boardId: list.boardId, task });

  res.status(201).json(task);
});

router.patch("/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, dueDate } = req.body || {};

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await prisma.board.findFirst({
    where: { id: task.list.boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!board) return res.status(403).json({ message: "Forbidden" });

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(typeof title === "string" ? { title: title.trim() } : {}),
      ...(typeof description === "string" ? { description } : {}),
      ...(typeof status === "string" ? { status } : {}),
      ...(dueDate === null ? { dueDate: null } : {}),
      ...(typeof dueDate === "string" ? { dueDate: new Date(dueDate) } : {})
    }
  });

  await logActivity(prisma, {
    boardId: task.list.boardId,
    actorId: req.user.id,
    action: "TASK_UPDATED",
    entityType: "TASK",
    entityId: taskId,
    metadata: { title: updated.title, status: updated.status }
  });

  const io = req.app.locals.io;
  emitToBoard(io, task.list.boardId, "task:updated", { boardId: task.list.boardId, task: updated });

  res.json(updated);
});

router.delete("/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await prisma.board.findFirst({
    where: { id: task.list.boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!board) return res.status(403).json({ message: "Forbidden" });

  await prisma.task.delete({ where: { id: taskId } });

  await logActivity(prisma, {
    boardId: task.list.boardId,
    actorId: req.user.id,
    action: "TASK_DELETED",
    entityType: "TASK",
    entityId: taskId,
    metadata: { title: task.title }
  });

  const io = req.app.locals.io;
  emitToBoard(io, task.list.boardId, "task:deleted", { boardId: task.list.boardId, taskId });

  res.json({ ok: true });
});

router.patch("/:taskId/move", async (req, res) => {
  const { taskId } = req.params;
  const { toListId, toPosition } = req.body || {};

  if (!toListId || !Number.isInteger(toPosition)) {
    return res.status(400).json({ message: "toListId and toPosition required" });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task) return res.status(404).json({ message: "Task not found" });

  const fromListId = task.listId;
  const boardId = task.list.boardId;

  const allowed = await prisma.board.findFirst({
    where: { id: boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  const result = await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { listId: fromListId, position: { gt: task.position } },
      data: { position: { decrement: 1 } }
    });

    await tx.task.updateMany({
      where: { listId: toListId, position: { gte: toPosition } },
      data: { position: { increment: 1 } }
    });

    return tx.task.update({
      where: { id: taskId },
      data: { listId: toListId, position: toPosition }
    });
  });

  await logActivity(prisma, {
    boardId,
    actorId: req.user.id,
    action: "TASK_MOVED",
    entityType: "TASK",
    entityId: taskId,
    metadata: { fromListId, toListId, toPosition }
  });

  const io = req.app.locals.io;
  emitToBoard(io, boardId, "task:moved", { boardId, task: result, fromListId });

  res.json(result);
});

router.post("/:taskId/assignees", async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ message: "userId required" });

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task) return res.status(404).json({ message: "Task not found" });

  const boardId = task.list.boardId;
  const allowed = await prisma.board.findFirst({
    where: { id: boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  const link = await prisma.taskAssignee.upsert({
    where: { taskId_userId: { taskId, userId } },
    update: {},
    create: { taskId, userId }
  });

  await logActivity(prisma, {
    boardId,
    actorId: req.user.id,
    action: "ASSIGNEE_ADDED",
    entityType: "TASK",
    entityId: taskId,
    metadata: { userId }
  });

  const io = req.app.locals.io;
  emitToBoard(io, boardId, "task:assignee_added", { boardId, taskId, userId });

  res.status(201).json(link);
});

router.delete("/:taskId/assignees/:userId", async (req, res) => {
  const { taskId, userId } = req.params;
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task) return res.status(404).json({ message: "Task not found" });

  const boardId = task.list.boardId;
  const allowed = await prisma.board.findFirst({
    where: { id: boardId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] }
  });
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  await prisma.taskAssignee.deleteMany({ where: { taskId, userId } });

  await logActivity(prisma, {
    boardId,
    actorId: req.user.id,
    action: "ASSIGNEE_REMOVED",
    entityType: "TASK",
    entityId: taskId,
    metadata: { userId }
  });

  const io = req.app.locals.io;
  emitToBoard(io, boardId, "task:assignee_removed", { boardId, taskId, userId });

  res.json({ ok: true });
});

export default router;
