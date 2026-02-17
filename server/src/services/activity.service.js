export async function logActivity(prisma, { boardId, actorId, action, entityType, entityId, metadata }) {
  return prisma.activity.create({
    data: { boardId, actorId, action, entityType, entityId, metadata }
  });
}
