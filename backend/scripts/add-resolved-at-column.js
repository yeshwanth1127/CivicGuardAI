const { sequelize } = require('../src/models');
const { addColumnIfMissing } = require('./lib/columnHelpers');

async function addResolvedAtColumn() {
  try {
    const ddl =
      sequelize.getDialect() === 'sqlite'
        ? 'resolved_at DATETIME'
        : 'resolved_at TIMESTAMP WITH TIME ZONE';
    await addColumnIfMissing(sequelize, 'issues', 'resolved_at', ddl);
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addResolvedAtColumn();
