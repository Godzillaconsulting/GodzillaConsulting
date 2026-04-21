import { Client } from "pg";
import { config } from "dotenv";

config({ path: "./server/.env" });

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
await client.connect();
await client.query("UPDATE site_nodes SET published_data = draft_data WHERE id = 'paquete-control-ia'");
console.log("DB Fixed successfully!");
process.exit(0);
