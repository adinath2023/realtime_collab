import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password@123", 10);

  const a = await prisma.user.upsert({
    where: { email: "demo1@app.com" },
    update: {},
    create: { email: "demo1@app.com", name: "Demo One", passwordHash }
  });

  const b = await prisma.user.upsert({
    where: { email: "demo2@app.com" },
    update: {},
    create: { email: "demo2@app.com", name: "Demo Two", passwordHash }
  });

  const board = await prisma.board.create({
    data: { title: "Demo Board", ownerId: a.id }
  });

  await prisma.boardMember.create({ data: { boardId: board.id, userId: b.id, role: "MEMBER" } });

  const todo = await prisma.list.create({ data: { boardId: board.id, title: "To Do", position: 1 } });
  const doing = await prisma.list.create({ data: { boardId: board.id, title: "Doing", position: 2 } });
  const done = await prisma.list.create({ data: { boardId: board.id, title: "Done", position: 3 } });

  const t1 = await prisma.task.create({ data: { listId: todo.id, title: "Setup project", position: 1 } });
  await prisma.taskAssignee.create({ data: { taskId: t1.id, userId: b.id } });

  await prisma.task.create({ data: { listId: doing.id, title: "Implement sockets", position: 1 } });
  await prisma.task.create({ data: { listId: done.id, title: "Write README", position: 1 } });

  console.log("Seeded demo users + board");
}
main().finally(() => prisma.$disconnect());
