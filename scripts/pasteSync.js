#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { parseBcaEmail } = require("../src/lib/bcaParser.js");

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

(async () => {
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

  // Replace the rawEmail below with the pasted email text
  const rawEmail = `Hi CLAY MICHOLAZ FU,
You just made a transaction through myBCA.
Here are the details of your transaction :

Status	:	Successful
Transaction Date	:	25 May 2026 09:51:24
Transfer Type	:	Transfer to BCA Account
Source of Fund	:	4870xxxx35
Source Currency	:	IDR - Indonesian Rupiah
Beneficiary Account	:	0467110806
Transfer Currency	:	IDR - Indonesian Rupiah
Beneficiary Name	:	OSWALD SEAN LIE
Transfer Amount	:	IDR 3,500.00
Remarks	:	-
Reference No.	:	3FA433F5-317A-4E34-8DC9-BD1A879CC175
Please save this email as your transaction reference.
If you do not recognize this transaction, immediately contact Halo BCA at 1500888.
Best Regards,

PT Bank Central Asia Tbk


This email is generated automatically. Please do not send a response to this email.

For inquiries and other banking information,

please contact BCA
`;

  const parsed = parseBcaEmail(rawEmail);
  if (!parsed) {
    console.error("Parser returned no transaction.");
    process.exit(1);
  }

  // find profile by email in .env or use a default user email
  const targetEmail = env.TEST_TARGET_EMAIL || "claymicholaz@gmail.com";
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

  const payload = {
    user_id: userId,
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
    .select("id, external_id");
  if (error) {
    console.error("Upsert error:", error.message || error);
    process.exit(1);
  }

  console.log("Upsert result:", data);
  process.exit(0);
})();
