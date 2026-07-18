const { sequelize } = require('../config/db');
const { User, roles } = require('./User');
const { Issue, statuses, categories, departments } = require('./Issue');

module.exports = {
  sequelize,
  User,
  Issue,
  roles,
  statuses,
  categories,
  departments,
};
