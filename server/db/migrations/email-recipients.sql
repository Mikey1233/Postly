-- Gmail recipients — manually-curated address book the composer uses when
-- the Gmail "platform" is selected. Per-post selection is stored in
-- posts.metadata.gmail.recipientIds; the subject lives at
-- posts.metadata.gmail.subject.
CREATE TABLE IF NOT EXISTS email_recipients (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  group_tag   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_recipients_email_key
  ON email_recipients (lower(email));

CREATE INDEX IF NOT EXISTS email_recipients_group_idx
  ON email_recipients (group_tag);
