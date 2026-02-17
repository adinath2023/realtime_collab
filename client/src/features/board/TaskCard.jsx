import React from "react";
import { useDraggable } from "@dnd-kit/core";

export default function TaskCard({ task, listId }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${task.id}:${listId}`
  });

  const style = {
    padding: 10,
    border: "1px solid #eee",
    borderRadius: 10,
    background: isDragging ? "#fafafa" : "#fff",
    cursor: "grab",
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ fontWeight: 600 }}>{task.title}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{task.status}</div>
    </div>
  );
}
