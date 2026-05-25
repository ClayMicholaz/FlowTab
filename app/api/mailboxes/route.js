import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function decodeJwtSub(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8"),
    );
    return payload.sub || null;
  } catch (err) {
    return null;
  }
}

export async function GET(request) {
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const userId = decodeJwtSub(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("mailboxes")
      .select(
        "id, host, port, username, auth_method, folder, filter_from, active, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}

export async function POST(request) {
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const userId = decodeJwtSub(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await request.json();
    const {
      host,
      port = 993,
      username,
      auth_method = "password",
      secret,
      folder = "INBOX",
      filter_from = "",
    } = body;

    if (!host || !username || !secret) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 },
      );
    }

    const insert = {
      user_id: userId,
      host,
      port,
      username,
      auth_method,
      secret,
      folder,
      filter_from,
      active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("mailboxes")
      .insert(insert)
      .select("id");
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: data?.[0]?.id }), {
      status: 201,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}
