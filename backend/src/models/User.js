const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { departments } = require('./Issue');

const roles = ['citizen', 'staff', 'admin'];

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...roles),
      allowNull: false,
      defaultValue: 'citizen',
    },
    // Tags a 'staff' account as belonging to a specific municipal
    // department (see Transfer to Department). Null for regular
    // staff/admin accounts, which continue to see every issue.
    department: {
      type: DataTypes.STRING(60),
      allowNull: true,
      validate: {
        isIn: [departments],
      },
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);

module.exports = {
  User,
  roles,
};

