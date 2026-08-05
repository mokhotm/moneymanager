import pg from "pg";

const client = new pg.Client({
  connectionString: "postgresql://sqamtho:$qamth0%232025@127.0.0.1:5432/money_manager",
});

client.connect((err: any) => {
  if (err) {
    console.error("PG CONNECT FAILED:", err.message);
  } else {
    console.log("PG CONNECT SUCCESSFUL!");
    client.query('SELECT username FROM "User" LIMIT 1', (e, res) => {
      console.log("USER ROW:", res?.rows[0]);
      client.end();
    });
  }
});
