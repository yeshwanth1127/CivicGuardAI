const { sequelize } = require('../src/models');

async function addColumnIfMissing(columnName, ddl) {
  const [results] = await sequelize.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='issues' AND column_name='${columnName}'
  `);

  if (results.length === 0) {
    await sequelize.query(`ALTER TABLE issues ADD COLUMN ${ddl}`);
    console.log(`✅ Successfully added ${columnName} column`);
  } else {
    console.log(`ℹ️  ${columnName} column already exists`);
  }
}

async function addClassificationColumns() {
  try {
    await addColumnIfMissing('category', 'category VARCHAR(20)');
    await addColumnIfMissing(
      'classification_confidence',
      'classification_confidence FLOAT'
    );

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addClassificationColumns();
