import React, { useState } from "react";
import { useLoginMutation } from "../../api/authApi";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState("demo1@app.com");
  const [password, setPassword] = useState("Password@123");

  async function onSubmit(e) {
    e.preventDefault();
    const res = await login({ email, password }).unwrap();
    localStorage.setItem("token", res.token);
    nav("/");
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{ width: "100%", marginBottom: 8 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" style={{ width: "100%", marginBottom: 8 }} />
        <button disabled={isLoading} style={{ width: "100%" }}>
          {isLoading ? "..." : "Login"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>Login failed</p>}
      <p style={{ marginTop: 12 }}>
        New? <Link to="/signup">Signup</Link>
      </p>
    </div>
  );
}
