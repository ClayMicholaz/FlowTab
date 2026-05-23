"use client";

import AuthForm from "./AuthForm";
import TransactionsManager from "./TransactionsManager";
import { useSupabaseAuth } from "./SupabaseProvider";

export default function AuthSection() {
  const { session, loading, signOut } = useSupabaseAuth();

  if (loading) {
    return (
      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Loading session...</p>
      </section>
    );
  }

  if (session?.user) {
    return (
      <section className="mt-8 space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Signed in</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">
              {session.user.email}
            </h2>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
        <TransactionsManager userId={session.user.id} />
      </section>
    );
  }

  return (
    <section className="mt-8 max-w-md rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Sign in</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Magic link sign-in is enough for the first version.
      </p>
      <AuthForm />
    </section>
  );
}
