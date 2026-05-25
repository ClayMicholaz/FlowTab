const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce((acc, line) => {
      const i = line.indexOf("=");
      if (i > 0) acc[line.slice(0, i)] = line.slice(i + 1);
      return acc;
    }, {});
}

(async function () {
  const env = loadEnv();
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env in .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const targetEmail = env.TEST_TARGET_EMAIL || "claymicholaz@gmail.com";
  try {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,email")
      .eq("email", targetEmail)
      .limit(1);
    if (pErr || !profiles || profiles.length === 0) {
      console.error(
        "Could not find profile for",
        targetEmail,
        pErr && pErr.message,
      );
      process.exit(1);
    }
    const userId = profiles[0].id;
    const { data, error } = await supabase
      .from("transactions")
      .select("id,external_id,amount,merchant,transaction_date,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("Error fetching transactions", error);
      process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
