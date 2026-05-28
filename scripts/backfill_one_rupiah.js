#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const { parseBcaEmail } = require("./bcaParser.js");

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath) === false) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key in process.env === false) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const rawEmail = [
  "Hi CLAY MICHOLAZ FU,",
  "You just made a transaction through myBCA.",
  "Here are the details of your transaction :",
  "",
  "Status\t:\tSuccessful",
  "Transaction Date\t:\t28 May 2026 20:45:42",
  "Transfer Type\t:\tTransfer to BCA Account",
  "Source of Fund\t:\t4870xxxx35",
  "Source Currency\t:\tIDR - Indonesian Rupiah",
  "Beneficiary Account\t:\t4872300906",
  "Transfer Currency\t:\tIDR - Indonesian Rupiah",
  "Beneficiary Name\t:\tIGNATIUS KEITH WENDY",
  "Transfer Amount\t:\tIDR 1.00",
  "Remarks\t:\t-",
  "Reference No.\t:\t2127CCDC-41C7-45B1-8B3C-BFCD0AED1889",
  "Please save this email as your transaction reference.",
  "If you do not recognize this transaction, immediately contact Halo BCA at 1500888.",
  "Best Regards,",
  "",
  "PT Bank Central Asia Tbk",
  "",
  "",
  "This email is generated automatically. Please do not send a response to this email.",
  "",
  "For inquiries and other banking information,",
  "",
  "please contact BCA",
  "",
  "",
  "",
  "",
  "",
  "",
  "Fb\tTw\tInst\tYt",
].join("\n");

async function main() {
  const parsed = parseBcaEmail(rawEmail);
  if (!parsed) {
    throw new Error("Parser returned null for the provided email");
  }

  const payload = {
    user_id: "9b765ace-2f8c-4b56-aec7-212dd6ea41c2",
    amount: parsed.amount,
    merchant: parsed.merchant || null,
    category_id: null,
    type: parsed.type || "expense",
    transaction_date: parsed.transaction_date,
    external_id: parsed.external_id,
  };

  const { data, error } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "external_id" })
    .select("id, amount, external_id, transaction_date, created_at");

  if (error) {
    throw error;
  }

  console.log(JSON.stringify({ parsed, saved: data }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
