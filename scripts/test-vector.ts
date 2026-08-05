import pg from "pg";

const connectionString = "postgresql://sqamtho:$qamth0%232025@localhost:5432/money_manager";

async function checkVector() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log("Checking pgvector extension in PostgreSQL...");
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("RESULT: pgvector extension IS enabled in PostgreSQL database!");
  } catch (err: any) {
    console.log("RESULT: pgvector error:", err.message);
  } finally {
    await client.end();
  }
}

checkVector();
