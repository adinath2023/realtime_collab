import React from "react";
import TaskCard from "./TaskCard";

export default function ListColumn({ list, onAddTask }) {
  return (
    <div
      id={`drop:${list.id}`}
      style={{
        minWidth: 280,
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 10,
        background: "#fff"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong style={{ flex: 1 }}>{list.title}</strong>
        <button onClick={onAddTask}>+ Task</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {list.tasks
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((t) => (
            <TaskCard key={t.id} task={t} listId={list.id} />
          ))}
      </div>
    </div>
  );
}
