import AuthForm from "../src/components/AuthForm";

export default function Home() {
  return (
    <main>
      <h1>FlowTab</h1>
      <p>Personal expense tracker — Next.js + Supabase starter</p>
      <section style={{ marginTop: 24 }}>
        <h2>Sign in</h2>
        <AuthForm />
      </section>
    </main>
  );
}
