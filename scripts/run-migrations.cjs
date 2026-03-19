// Run Supabase migrations via direct Postgres connection
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const CONNECTION_STRING =
  "postgresql://postgres:obNiVvxnHTenjo8k@db.ndudzfaisulnmbpnvkwo.supabase.co:5432/postgres";

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

// Only run the new migrations added today
const TARGET_MIGRATIONS = [
  "20260315000001_portals_core.sql",
  "20260315000002_finance_tables.sql",
  "20260315000003_projects_tables.sql",
  "20260315000004_social_tables.sql",
  "20260315000005_team_tables.sql",
  "20260315000006_notifications_tables.sql",
  "20260315000007_general_tables.sql",
  "20260315000008_seed_defaults.sql",
];

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("✓ Connected to Supabase Postgres\n");

    for (const filename of TARGET_MIGRATIONS) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filepath, "utf8");
      console.log(`▶ Running ${filename} ...`);
      try {
        await client.query(sql);
        console.log(`  ✓ Done\n`);
      } catch (err) {
        console.error(`  ✗ Error: ${err.message}\n`);
        // Continue with remaining migrations rather than aborting
      }
    }

    console.log("All migrations complete.");
  } finally {
    await client.end();
  }
}

run().catch(console.error);
