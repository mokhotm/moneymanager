import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://sqamtho:%24qamth0%232025@127.0.0.1:5432/money_manager",
  connectionTimeoutMillis: 4000,
});

client
  .connect()
  .then(async () => {
    console.log("PG DIRECT CONNECT SUCCESS!");
    const res = await client.query('SELECT username FROM "User" LIMIT 1');
    console.log("USER FOUND:", res.rows[0]?.username);
    await client.end();
  })
  .catch((err) => {
    console.error("PG DIRECT ERROR:", err.message);
    process.exit(1);
  });
