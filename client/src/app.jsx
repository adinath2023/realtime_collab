import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";
import BoardPicker from "./features/board/BoardPicker";
import BoardPage from "./features/board/BoardPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BoardPicker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:boardId"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
