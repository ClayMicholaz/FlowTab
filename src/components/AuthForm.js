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
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) setMessage(error.message);
      else setMessage("Magic link sent — check your email.");
    } catch (err) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label
          htmlFor="email"
          className="grid gap-2 text-sm font-medium text-zinc-700"
        >
          Email
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
