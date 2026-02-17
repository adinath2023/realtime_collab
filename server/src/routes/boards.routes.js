import { Router } from "express";
import { prisma } from "../prisma.js";
import { emitToBoard } from "../sockets/index.js";
import { logActivity } from "../services/activity.service.js";

const router = Router();

router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
  const q = (req.query.q || "").trim();

  const where = {
    OR: [
      { ownerId: req.user.id },
      { members: { some: { userId: req.user.id } } }
    ],
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {})
  };

  const [total, items] = await Promise.all([
    prisma.board.count({ where }),
    prisma.board.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({ page, limit, total, items });
});

router.post("/", async (req, res) => {
  const { title } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ message: "Title required" });

  const board = await prisma.board.create({
    data: { title: title.trim(), ownerId: req.user.id }
  });

  await prisma.list.createMany({
    data: [
      { boardId: board.id, title: "To Do", position: 1 },
      { boardId: board.id, title: "Doing", position: 2 },
      { boardId: board.id, title: "Done", position: 3 }
    ]
  });

  await logActivity(prisma, {
    boardId: board.id,
    actorId: req.user.id,
    action: "BOARD_CREATED",
    entityType: "BOARD",
    entityId: board.id,
    metadata: { title: board.title }
  });

  res.status(201).json(board);
});

router.get("/:boardId", async (req, res) => {
  const { boardId } = req.params;

  const allowed = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: req.user.id },
        { members: { some: { userId: req.user.id } } }
      ]
    }
  });
  if (!allowed) return res.status(404).json({ message: "Board not found" });

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
      lists: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              assignees: { include: { user: { select: { id: true, name: true, email: true } } } }
            }
          }
        }
      }
    }
  });

  res.json(board);
});

router.post("/:boardId/members", async (req, res) => {
  const { boardId } = req.params;
  const { email } = req.body || {};

  const board = await prisma.board.findFirst({ where: { id: boardId, ownerId: req.user.id } });
  if (!board) return res.status(403).json({ message: "Only owner can invite" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const member = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    update: {},
    create: { boardId, userId: user.id, role: "MEMBER" }
  });

  await logActivity(prisma, {
    boardId,
    actorId: req.user.id,
    action: "MEMBER_ADDED",
    entityType: "USER",
    entityId: user.id,
    metadata: { email: user.email }
  });

  const io = req.app.locals.io;
  emitToBoard(io, boardId, "board:member_added", { boardId, user: { id: user.id, email: user.email, name: user.name } });

  res.status(201).json(member);
});

router.get("/:boardId/activity", async (req, res) => {
  const { boardId } = req.params;
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));

  const allowed = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: req.user.id },
        { members: { some: { userId: req.user.id } } }
      ]
    }
  });
  if (!allowed) return res.status(404).json({ message: "Board not found" });

  const [total, items] = await Promise.all([
    prisma.activity.count({ where: { boardId } }),
    prisma.activity.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true } } }
    })
  ]);

  res.json({ page, limit, total, items });
});

export default router;
