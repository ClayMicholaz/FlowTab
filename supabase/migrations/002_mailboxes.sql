-- Mailboxes table for IMAP poller
CREATE TABLE IF NOT EXISTS mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 993,
  username text NOT NULL,
  auth_method text NOT NULL DEFAULT 'password', -- 'password' or 'xoauth2'
  secret text NOT NULL, -- store app password or refresh token (encrypt in production)
  folder text NOT NULL DEFAULT 'INBOX',
  filter_from text, -- optional FROM filter for messages
  last_checked timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mailboxes_user_idx ON mailboxes(user_id);
