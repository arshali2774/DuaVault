// One-off backfill for the normalized_arabic_text column (see migration
// 20260816152730_add_normalized_arabic_text_to_duas.sql). Run once after
// deploying that migration so pre-existing duas participate in duplicate
// detection and the duplicate-review page, not just newly added ones.
// Not wired into CI, same as the RLS/auth/middleware test suites — run it
// by hand:
//
//   npm run backfill:normalized-arabic-text
//
// Reads connection info the same way the test suites do (SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY env vars) so it works unmodified against
// either the local Supabase CLI instance or the hosted project — point it
// at whichever by setting those two vars before running.

import { createClient } from "@supabase/supabase-js";
import { normalizeArabicText } from "../src/lib/arabic-normalize";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.\n" +
      "For the local instance: `npx supabase status -o env` has both (API_URL, SERVICE_ROLE_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: rows, error } = await supabase
    .from("duas")
    .select("id, arabic_text")
    .is("normalized_arabic_text", null);

  if (error) throw error;
  if (!rows || rows.length === 0) {
    console.log("No rows need backfilling.");
    return;
  }

  console.log(`Backfilling ${rows.length} row(s)...`);

  let updated = 0;
  for (const row of rows) {
    const normalized = normalizeArabicText(row.arabic_text);
    const { error: updateError } = await supabase
      .from("duas")
      .update({ normalized_arabic_text: normalized })
      .eq("id", row.id);

    if (updateError) {
      console.error(`Failed to backfill dua ${row.id}:`, updateError.message);
      continue;
    }
    updated++;
  }

  console.log(`Backfilled ${updated}/${rows.length} row(s).`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
