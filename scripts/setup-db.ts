import pg from "pg";

const connectionString = "postgresql://sqamtho:$qamth0%232025@localhost:5432/postgres";

async function createDb() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to default postgres database.");
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'money_manager'");
    if (res.rows.length === 0) {
      await client.query("CREATE DATABASE money_manager");
      console.log("Database 'money_manager' created successfully!");
    } else {
      console.log("Database 'money_manager' already exists.");
    }
  } catch (err: any) {
    console.error("Error creating database:", err.message);
  } finally {
    await client.end();
  }
}

createDb();
