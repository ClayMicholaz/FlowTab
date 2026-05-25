#!/usr/bin/env node
/*
  One-shot IMAP poller script. This file is executed as a separate Node process
  so it can require native dependencies (imap-simple, mailparser) without
  causing the Next.js bundler to attempt to resolve them.
*/

const { parseBcaEmail } = require("../src/lib/bcaParser.js");
const Imap = require("imap-simple");
const { simpleParser } = require("mailparser");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function imapConfigFromEnv() {
  return {
    imap: {
      user: process.env.IMAP_USER || process.env.MAILBOX_USER,
      password: process.env.IMAP_PASSWORD || process.env.MAILBOX_PASSWORD,
      host: process.env.IMAP_HOST || process.env.MAILBOX_HOST,
      port: Number(process.env.IMAP_PORT || process.env.MAILBOX_PORT || 993),
      tls: true,
      authTimeout: 30000,
    },
  };
}

async function run() {
  const config = imapConfigFromEnv();
  const mailbox = process.env.IMAP_MAILBOX || "INBOX";
  const filterFrom = process.env.IMAP_FILTER_FROM || "";

  const connection = await Imap.connect(config);
  await connection.openBox(mailbox);

  const searchCriteria = filterFrom
    ? ["UNSEEN", ["FROM", filterFrom]]
    : ["UNSEEN"];
  const fetchOptions = { bodies: ["TEXT"], markSeen: false };
  const messages = await connection.search(searchCriteria, fetchOptions);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let saved = 0;

  for (const item of messages) {
    const all = item.parts.find((p) => p.which === "TEXT");
    const raw = all ? all.body : "";
    let parsedEmail;
    try {
      parsedEmail = await simpleParser(raw);
    } catch (err) {
      parsedEmail = { text: raw };
    }

    const rawText = (parsedEmail && parsedEmail.text) || raw || "";
    const parsed = parseBcaEmail(rawText);
    if (!parsed || !parsed.external_id) {
      await connection.addFlags(item.attributes.uid, "\\Seen");
      continue;
    }

    const payload = {
      user_id: process.env.IMAP_TARGET_USER_ID || null,
      amount: parsed.amount,
      merchant: parsed.merchant || null,
      category_id: null,
      type: parsed.type || "expense",
      transaction_date: parsed.transaction_date,
      external_id: parsed.external_id,
      metadata: parsed,
    };

    try {
      const { error } = await supabaseAdmin
        .from("transactions")
        .upsert(payload, { onConflict: "external_id" });
      if (!error) saved += 1;
      await connection.addFlags(item.attributes.uid, "\\Seen");
    } catch (err) {
      try {
        await connection.addFlags(item.attributes.uid, "\\Seen");
      } catch (e) {}
    }
  }

  await connection.end();
  console.log(JSON.stringify({ saved }));
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exitCode = 2;
});
