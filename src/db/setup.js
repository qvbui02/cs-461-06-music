const { Client, Pool } = require("pg");
const fs = require("fs");

// Load environment variables from env.json
const env = JSON.parse(fs.readFileSync("./env.json", "utf8"));

// Extract the variables from env.json
const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = env;

// Connect to the default `postgres` database to check if the target database exists
const defaultConfig = {
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: "postgres",
};

const targetConfig = {
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
};

const sqlFilePath = "./src/db/ddl.sql"; // Path to schema

async function setupDatabase() {
  const client = new Client(defaultConfig);

  try {
    await client.connect();
    console.log("Connected to the default database.");

    // Check if the target database exists
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [PG_DATABASE]
    );

    if (res.rowCount === 0) {
      console.log(`Database "${PG_DATABASE}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${PG_DATABASE}`);
      console.log(`Database "${PG_DATABASE}" created.`);
    } else {
      console.log(`Database "${PG_DATABASE}" already exists.`);
    }

    await client.end();

    // Connect to the database to set up tables and insert data
    const targetClient = new Client(targetConfig);
    await targetClient.connect();

    console.log(`Connected to the database "${PG_DATABASE}".`);

    // Read and execute the SQL file
    const sql = fs.readFileSync(sqlFilePath, "utf8");
    await targetClient.query(sql);
    console.log("Tables and data initialized.");

    await targetClient.end();
  } catch (err) {
    console.error("Error setting up the database:", err.message);
  } finally {
    await client.end();
  }
}

// Create a reusable connection pool
const pool = new Pool(targetConfig);

// Export the pool for use in other files
module.exports = { setupDatabase, pool };

// Call setupDatabase in this file
(async () => {
  try {
    await setupDatabase(); // Call the setupDatabase function
    console.log("Database setup completed successfully.");
  } catch (error) {
    console.error("Error during database setup:", error.message);
  }
})();
