import React, { useState } from "react";
import { useSignupMutation } from "../../api/authApi";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const nav = useNavigate();
  const [signup, { isLoading, error }] = useSignupMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const res = await signup({ name, email, password }).unwrap();
    localStorage.setItem("token", res.token);
    nav("/");
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}>
      <h2>Signup</h2>
      <form onSubmit={onSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" style={{ width: "100%", marginBottom: 8 }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{ width: "100%", marginBottom: 8 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (min 6)" type="password" style={{ width: "100%", marginBottom: 8 }} />
        <button disabled={isLoading} style={{ width: "100%" }}>
          {isLoading ? "..." : "Create account"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>Signup failed</p>}
      <p style={{ marginTop: 12 }}>
        Have account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
