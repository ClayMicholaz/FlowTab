"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signIn");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!password) {
      setMessage("Password is required.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("Signed in.");
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Could not create account.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setMessage("Account created, but sign-in failed.");
        return;
      }

      setMessage("Account created and signed in.");
    } catch (err) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => setMode("signIn")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "signIn"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signUp")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "signUp"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Create account
        </button>
      </div>

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
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />
        </label>

        <label
          htmlFor="password"
          className="grid gap-2 text-sm font-medium text-zinc-700"
        >
          Password
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="At least 8 characters"
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Saving..."
            : mode === "signIn"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
