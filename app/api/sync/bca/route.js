import { createClient } from "@supabase/supabase-js";
import { parseBcaEmails } from "../../../../src/lib/bcaParser";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return Response.json({ error: "Missing auth token." }, { status: 401 });
    }

    const body = await request.json();
    const rawEmails = Array.isArray(body.rawEmails)
      ? body.rawEmails
      : body.rawText
        ? [body.rawText]
        : [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return Response.json(
        { error: "Server auth is not configured." },
        { status: 500 },
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const parsedTransactions = parseBcaEmails(rawEmails).map((entry) => ({
      user_id: user.id,
      amount: entry.amount,
      merchant: entry.merchant,
      category_id: null,
      type: entry.type,
      transaction_date: entry.transaction_date,
      external_id: entry.external_id,
    }));

    if (parsedTransactions.length === 0) {
      return Response.json(
        { error: "No BCA transactions found in the provided text." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .upsert(parsedTransactions, { onConflict: "external_id" })
      .select("id, external_id");

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      ok: true,
      parsed: parsedTransactions.length,
      saved: data?.length ?? 0,
    });
  } catch {
    return Response.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
