const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, "utf8");
    c.split(/\r?\n/).forEach((l) => {
      const line = l.trim();
      if (!line || line.startsWith("#")) return;
      const i = line.indexOf("=");
      if (i === -1) return;
      let k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    });
  }
}
loadEnv();
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("missing supabase env");
  process.exit(1);
}
const s = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await s
    .from("transactions")
    .select("id,user_id,amount,external_id,transaction_date,created_at")
    .eq("amount", 2);
  console.log({ data, error });
})();
