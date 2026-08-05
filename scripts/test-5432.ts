import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://sqamtho:$qamth0%232025@127.0.0.1:5432/money_manager",
});

async function main() {
  await client.connect();
  console.log("SUCCESSFULLY CONNECTED TO POSTGRESQL ON PORT 5432!");
  const res = await client.query('SELECT username FROM "User" LIMIT 1');
  console.log("Found User in DB:", res.rows[0]?.username);
  await client.end();
}

main().catch((e) => console.error("Error on 5432:", e.message));
