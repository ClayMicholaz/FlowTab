#!/usr/bin/env node
/*
  One-shot IMAP poller script. This file is executed as a separate Node process
  so it can require native dependencies (imap-simple, mailparser) without
  causing the Next.js bundler to attempt to resolve them.
*/

const fs = require("fs");
const path = require("path");
const Imap = require("imap-simple");
const { simpleParser } = require("mailparser");
const { createClient } = require("@supabase/supabase-js");

let parseBcaEmail;
try {
  const localParserPath = path.resolve(__dirname, "bcaParser.js");
  if (fs.existsSync(localParserPath)) {
    ({ parseBcaEmail } = require(localParserPath));
  } else {
    const fallbackPath = path.resolve(
      __dirname,
      "..",
      "src",
      "lib",
      "bcaParser.js",
    );
    if (fs.existsSync(fallbackPath)) {
      ({ parseBcaEmail } = require(fallbackPath));
    } else {
      console.error(
        "Parser not found at:",
        localParserPath,
        "or",
        fallbackPath,
      );
      throw new Error(
        "BCA parser module not found. Ensure scripts/bcaParser.js is present in deployment.",
      );
    }
  }
} catch (err) {
  throw err;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const LOOKBACK_DAYS = Number(process.env.IMAP_LOOKBACK_DAYS || 7);
const ALLOW_INSECURE_TLS = process.env.IMAP_ALLOW_INSECURE_TLS === "true";

function imapConfigFromMailbox(mailbox) {
  return {
    imap: {
      user: mailbox.username,
      password: mailbox.secret,
      host: mailbox.host,
      port: Number(mailbox.port || 993),
      tls: true,
      authTimeout: 30000,
      ...(ALLOW_INSECURE_TLS
        ? { tlsOptions: { rejectUnauthorized: false } }
        : {}),
    },
  };
}

function buildSearchCriteria(mailbox) {
  const criteria = [];
  const filterFrom = (mailbox.filter_from || "").trim();
  const lastChecked = mailbox.last_checked
    ? new Date(mailbox.last_checked)
    : null;

  if (lastChecked && !Number.isNaN(lastChecked.getTime())) {
    criteria.push(["SINCE", lastChecked]);
  } else {
    const fallbackSince = new Date(
      Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    criteria.push(["SINCE", fallbackSince]);
  }

  if (filterFrom) {
    criteria.push(["FROM", filterFrom]);
  }

  return criteria;
}

async function getConfiguredMailboxes(supabaseAdmin) {
  const { data, error } = await supabaseAdmin
    .from("mailboxes")
    .select(
      "id, user_id, host, port, username, auth_method, secret, folder, filter_from, last_checked, active",
    )
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    return data;
  }

  const fallbackHost = process.env.IMAP_HOST || process.env.MAILBOX_HOST;
  const fallbackUser = process.env.IMAP_USER || process.env.MAILBOX_USER;
  const fallbackPassword =
    process.env.IMAP_PASSWORD || process.env.MAILBOX_PASSWORD;

  if (!fallbackHost || !fallbackUser || !fallbackPassword) {
    return [];
  }

  return [
    {
      id: "env-fallback",
      user_id: process.env.IMAP_TARGET_USER_ID || null,
      host: fallbackHost,
      port: Number(process.env.IMAP_PORT || process.env.MAILBOX_PORT || 993),
      username: fallbackUser,
      auth_method: "password",
      secret: fallbackPassword,
      folder: process.env.IMAP_MAILBOX || "INBOX",
      filter_from: process.env.IMAP_FILTER_FROM || "",
      last_checked: process.env.IMAP_LAST_CHECKED || null,
      active: true,
    },
  ];
}

async function processMailbox(supabaseAdmin, mailbox) {
  if (mailbox.auth_method && mailbox.auth_method !== "password") {
    return {
      mailboxId: mailbox.id,
      saved: 0,
      processed: 0,
      skipped: 0,
      error: `Unsupported auth_method: ${mailbox.auth_method}`,
    };
  }

  const connection = await Imap.connect(imapConfigFromMailbox(mailbox));
  let processed = 0;
  let saved = 0;
  let skipped = 0;

  try {
    await connection.openBox(mailbox.folder || "INBOX");

    const messages = await connection.search(buildSearchCriteria(mailbox), {
      bodies: ["TEXT"],
      markSeen: false,
    });

    for (const item of messages) {
      processed += 1;

      const bodyPart = item.parts.find((part) => part.which === "TEXT");
      const raw = bodyPart ? bodyPart.body : "";

      let parsedEmail;
      try {
        parsedEmail = await simpleParser(raw);
      } catch (err) {
        parsedEmail = { text: raw };
      }

      const rawText = (parsedEmail && parsedEmail.text) || raw || "";
      const parsed = parseBcaEmail(rawText);

      if (!parsed || !parsed.external_id) {
        skipped += 1;
        continue;
      }

      const payload = {
        user_id: mailbox.user_id,
        amount: parsed.amount,
        merchant: parsed.merchant || null,
        category_id: null,
        type: parsed.type || "expense",
        transaction_date: parsed.transaction_date,
        external_id: parsed.external_id,
        metadata: parsed,
      };

      const { error } = await supabaseAdmin
        .from("transactions")
        .upsert(payload, { onConflict: "external_id" });

      if (error) {
        skipped += 1;
        continue;
      }

      saved += 1;
    }

    await supabaseAdmin
      .from("mailboxes")
      .update({ last_checked: new Date().toISOString() })
      .eq("id", mailbox.id);

    return { mailboxId: mailbox.id, saved, processed, skipped };
  } finally {
    try {
      await connection.end();
    } catch (err) {}
  }
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const mailboxes = await getConfiguredMailboxes(supabaseAdmin);

  if (!mailboxes.length) {
    throw new Error(
      "No active mailboxes found and no IMAP_* fallback environment variables were provided",
    );
  }

  const results = [];
  let saved = 0;

  for (const mailbox of mailboxes) {
    const result = await processMailbox(supabaseAdmin, mailbox);
    results.push(result);
    saved += result.saved || 0;
  }

  console.log(JSON.stringify({ saved, mailboxes: results }));
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exitCode = 2;
});
