const { Sequelize } = require('sequelize');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in the environment variables');
}

// Supports either a Postgres connection string (postgres://...) or a local
// SQLite file (sqlite:relative/or/absolute/path.sqlite) — useful for local
// dev/demo setups that don't have a Postgres server available.
const SQLITE_PREFIX = 'sqlite:';
const isSqlite = databaseUrl.startsWith(SQLITE_PREFIX);

const sequelize = isSqlite
  ? new Sequelize({
      dialect: 'sqlite',
      storage: databaseUrl.slice(SQLITE_PREFIX.length) || ':memory:',
      logging: false,
    })
  : new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        application_name: 'CivicFixBackend',
      },
    });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB,
};
