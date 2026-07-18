const { sequelize } = require('../src/models');
const { addColumnIfMissing } = require('./lib/columnHelpers');

async function addUserDepartmentColumn() {
  try {
    await addColumnIfMissing(sequelize, 'users', 'department', 'department VARCHAR(60)');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addUserDepartmentColumn();
