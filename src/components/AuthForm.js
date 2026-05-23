"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) setMessage(error.message);
      else setMessage("Magic link sent — check your email.");
    } catch (err) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 8,
            margin: "8px 0",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 12px" }}
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
