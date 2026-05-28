const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { parseBcaEmail } = require('./bcaParser');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars. Ensure .env.local has SUPABASE settings or set env vars.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const dir = path.resolve(__dirname, 'skipped_emails');
if (!fs.existsSync(dir)) {
  console.log('No skipped_emails directory found.');
  process.exit(0);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));
let total = 0;
let saved = 0;

(async () => {
  for (const fname of files) {
    total += 1;
    const fpath = path.join(dir, fname);
    const text = fs.readFileSync(fpath, 'utf8');
    const parsed = parseBcaEmail(text);
    if (!parsed || !parsed.external_id) {
      console.warn('Skipping (parser still failed):', fname);
      continue;
    }

    // mailbox id is first 36 chars of filename (UUID)
    const mailboxId = fname.slice(0, 36);
    const { data: mdata, error: mErr } = await supabaseAdmin
      .from('mailboxes')
      .select('user_id')
      .eq('id', mailboxId)
      .limit(1)
      .single();

    if (mErr || !mdata) {
      console.warn('Could not find mailbox for file', fname, mErr);
      continue;
    }

    const payload = {
      user_id: mdata.user_id,
      amount: parsed.amount,
      merchant: parsed.merchant || null,
      category_id: null,
      type: parsed.type || 'expense',
      transaction_date: parsed.transaction_date,
      external_id: parsed.external_id,
    };

    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from('transactions')
      .upsert(payload, { onConflict: 'external_id' })
      .select('id, external_id');

    if (upsertError) {
      console.error('Upsert error for', fname, upsertError);
      continue;
    }

    saved += upsertData && upsertData.length ? upsertData.length : 1;
    console.log('Saved', parsed.external_id, 'from', fname);
  }

  console.log({ total, saved });
})();
