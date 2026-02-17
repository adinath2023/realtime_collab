import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DndContext, closestCenter } from "@dnd-kit/core";

import { useGetBoardQuery, useAddListMutation, useAddTaskMutation, useMoveTaskMutation, useBoardActivityQuery } from "../../api/boardsApi";
import { baseApi } from "../../api/baseApi";
import { getSocket } from "../../sockets/socket";
import { useDispatch } from "react-redux";

import ListColumn from "./ListColumn";

export default function BoardPage() {
  const { boardId } = useParams();
  const dispatch = useDispatch();

  const { data: board, isLoading } = useGetBoardQuery(boardId);
  const { data: activity } = useBoardActivityQuery({ boardId, page: 1, limit: 15 });

  const [addList] = useAddListMutation();
  const [addTask] = useAddTaskMutation();
  const [moveTask] = useMoveTaskMutation();

  const socket = useMemo(() => getSocket(), []);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.auth = { token: localStorage.getItem("token") };
    socket.connect();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.emit("board:join", { boardId });

    const updateBoard = (fn) => {
      dispatch(baseApi.util.updateQueryData("getBoard", boardId, fn));
    };

    socket.on("list:created", ({ list }) => updateBoard((draft) => {
      draft.lists.push({ ...list, tasks: [] });
      draft.lists.sort((a,b) => a.position - b.position);
    }));

    socket.on("task:created", ({ task }) => updateBoard((draft) => {
      const list = draft.lists.find((l) => l.id === task.listId);
      if (list) {
        list.tasks.push(task);
        list.tasks.sort((a,b) => a.position - b.position);
      }
    }));

    socket.on("task:moved", ({ task, fromListId }) => updateBoard((draft) => {
      const from = draft.lists.find((l) => l.id === fromListId);
      const to = draft.lists.find((l) => l.id === task.listId);
      if (!from || !to) return;
      from.tasks = from.tasks.filter((t) => t.id !== task.id);
      to.tasks.push(task);
      from.tasks.sort((a,b) => a.position - b.position);
      to.tasks.sort((a,b) => a.position - b.position);
    }));

    socket.on("task:updated", ({ task }) => updateBoard((draft) => {
      for (const l of draft.lists) {
        const idx = l.tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) l.tasks[idx] = { ...l.tasks[idx], ...task };
      }
    }));

    socket.on("task:deleted", ({ taskId }) => updateBoard((draft) => {
      for (const l of draft.lists) l.tasks = l.tasks.filter((t) => t.id !== taskId);
    }));

    return () => {
      socket.emit("board:leave", { boardId });
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [boardId, dispatch, socket]);

  async function onAddList() {
    const title = prompt("List title?");
    if (!title) return;
    await addList({ boardId, title }).unwrap();
  }

  async function onAddTask(listId) {
    const title = prompt("Task title?");
    if (!title) return;
    await addTask({ listId, title }).unwrap();
  }

  async function onDragEnd(event) {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const [taskId, fromListId] = String(active.id).split(":");
    const toListId = String(over.id).replace("drop:", "");
    if (!board) return;

    if (fromListId === toListId) return; // simple MVP (cross-list only)

    const toList = board.lists.find((l) => l.id === toListId);
    if (!toList) return;
    const toPosition = (toList.tasks?.length || 0) + 1;

    await moveTask({ taskId, toListId, toPosition }).unwrap();
  }

  if (isLoading) return <p style={{ padding: 20 }}>Loading...</p>;
  if (!board) return <p style={{ padding: 20 }}>Not found</p>;

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link to="/">← Back</Link>
        <h2 style={{ flex: 1 }}>{board.title}</h2>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{connected ? "Live" : "Offline"}</span>
        <button onClick={onAddList}>+ List</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, marginTop: 12 }}>
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10 }}>
            {board.lists.map((list) => (
              <div key={list.id} id={`drop:${list.id}`}>
                <ListColumn list={list} onAddTask={() => onAddTask(list.id)} />
              </div>
            ))}
          </div>
        </DndContext>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10, height: "fit-content" }}>
          <h3>Activity</h3>
          {activity?.items?.slice(0, 10).map((a) => (
            <div key={a.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ fontSize: 12 }}>
                <strong>{a.actor?.name}</strong> — {a.action}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{new Date(a.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
