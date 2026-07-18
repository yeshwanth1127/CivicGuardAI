const { sequelize } = require('../src/models');
const { addColumnIfMissing } = require('./lib/columnHelpers');

async function addTrackingCodeColumn() {
  try {
    await addColumnIfMissing(sequelize, 'issues', 'tracking_code', 'tracking_code VARCHAR(12)');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addTrackingCodeColumn();
