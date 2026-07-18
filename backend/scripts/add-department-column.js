const { sequelize } = require('../src/models');
const { addColumnIfMissing } = require('./lib/columnHelpers');

async function addDepartmentColumn() {
  try {
    await addColumnIfMissing(sequelize, 'issues', 'department', 'department VARCHAR(60)');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addDepartmentColumn();
