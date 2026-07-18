// Shared dialect-aware column helpers for one-off migration scripts. This
// app supports both Postgres (production-style) and SQLite (local dev —
// see src/config/db.js), which need different ways to inspect a table's
// existing columns.
async function columnExists(sequelize, table, column) {
  if (sequelize.getDialect() === 'sqlite') {
    const [rows] = await sequelize.query(`PRAGMA table_info(${table})`);
    return rows.some((row) => row.name === column);
  }

  const [rows] = await sequelize.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='${table}' AND column_name='${column}'
  `);
  return rows.length > 0;
}

async function addColumnIfMissing(sequelize, table, column, ddl) {
  if (await columnExists(sequelize, table, column)) {
    console.log(`ℹ️  ${column} column already exists on ${table}`);
    return;
  }
  await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  console.log(`✅ Successfully added ${column} column to ${table}`);
}

module.exports = { columnExists, addColumnIfMissing };
