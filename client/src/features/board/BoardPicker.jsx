import React, { useState } from "react";
import { useListBoardsQuery, useCreateBoardMutation } from "../../api/boardsApi";
import { Link } from "react-router-dom";

export default function BoardPicker() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading } = useListBoardsQuery({ page, limit: 10, q });
  const [createBoard] = useCreateBoardMutation();

  async function onCreate() {
    const title = prompt("Board title?");
    if (!title) return;
    await createBoard({ title }).unwrap();
  }

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <h2 style={{ flex: 1 }}>Boards</h2>
        <button onClick={() => { localStorage.removeItem("token"); location.href = "/login"; }}>
          Logout
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search boards..." style={{ flex: 1 }} />
        <button onClick={onCreate}>+ New Board</button>
      </div>

      {isLoading && <p>Loading...</p>}
      {data?.items?.map((b) => (
        <div key={b.id} style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 8 }}>
          <Link to={`/boards/${b.id}`} style={{ textDecoration: "none" }}>
            <strong>{b.title}</strong>
          </Link>
        </div>
      ))}

      {data && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {data.page} • Total {data.total}</span>
          <button disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
