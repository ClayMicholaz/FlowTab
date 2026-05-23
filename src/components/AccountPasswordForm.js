"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AccountPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!password || password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setMessage(
        "Password saved. You can now sign in with email and password.",
      );
    } catch (err) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          Account
        </p>
        <h3 className="text-lg font-semibold text-zinc-950">Set password</h3>
        <p className="text-sm text-zinc-500">
          Use this once while signed in so you can log in later without magic
          links.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save password"}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-zinc-600">{message}</p> : null}
    </section>
  );
}
