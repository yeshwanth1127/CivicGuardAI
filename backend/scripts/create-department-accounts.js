const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/db');
const { User } = require('../src/models');
require('dotenv').config();

// Hardcoded department accounts — one per municipal department (see
// Transfer to Department). Each is a 'staff'-role account tagged with a
// `department`, so they can update issue status (staff is already allowed
// to) but the frontend scopes their dashboard to only their department's
// issues.
const DEPARTMENT_ACCOUNTS = [
  { department: 'Roads & Infrastructure', email: 'roads@civicfix.gov', name: 'Roads & Infrastructure Dept' },
  { department: 'Sanitation & Waste Management', email: 'sanitation@civicfix.gov', name: 'Sanitation & Waste Management Dept' },
  { department: 'Electrical & Street Lighting', email: 'electrical@civicfix.gov', name: 'Electrical & Street Lighting Dept' },
  { department: 'Water & Drainage', email: 'water@civicfix.gov', name: 'Water & Drainage Dept' },
  { department: 'Parks & Public Spaces', email: 'parks@civicfix.gov', name: 'Parks & Public Spaces Dept' },
  { department: 'General Administration', email: 'admin.dept@civicfix.gov', name: 'General Administration Dept' },
];
const PASSWORD = 'department123';

async function createDepartmentAccounts() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    console.log('📝 Creating department accounts...\n');

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    for (const account of DEPARTMENT_ACCOUNTS) {
      const existingUser = await User.findOne({ where: { email: account.email } });

      if (existingUser) {
        // Keep the department tag in sync even if the account already exists
        // (e.g. re-running this script after adding a new department).
        await existingUser.update({ department: account.department, role: 'staff' });
        console.log(`⚠️  ${account.name} already exists — department tag refreshed`);
        continue;
      }

      await User.create({
        name: account.name,
        email: account.email,
        password: hashedPassword,
        role: 'staff',
        department: account.department,
      });

      console.log(`✅ Created: ${account.name} (${account.email})`);
    }

    console.log('\n🎉 Department accounts ready!\n');
    console.log('📋 Department Login Credentials:');
    console.log('═══════════════════════════════════════════════════════════════');
    DEPARTMENT_ACCOUNTS.forEach((account) => {
      console.log(`Department: ${account.department}`);
      console.log(`Email:      ${account.email}`);
      console.log(`Password:   ${PASSWORD}`);
      console.log('───────────────────────────────────────────────────────────────');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating department accounts:', error.message);
    process.exit(1);
  }
}

createDepartmentAccounts();
