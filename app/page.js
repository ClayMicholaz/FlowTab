import AuthSection from "../src/components/AuthSection";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
            FlowTab
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Personal expense dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            A calm, minimal workspace for tracking manual transactions before
            Gmail automation.
          </p>
        </div>
      </header>
      <AuthSection />
    </main>
  );
}
