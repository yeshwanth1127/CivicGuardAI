const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const statuses = ['Open', 'In Progress', 'Resolved'];
const categories = [
  'Pothole',
  'Garbage',
  'Streetlight',
  'Sidewalk',
  'Flooding',
  'Road Sign',
  'Other',
];
const departments = [
  'Roads & Infrastructure',
  'Sanitation & Waste Management',
  'Electrical & Street Lighting',
  'Water & Drainage',
  'Parks & Public Spaces',
  'General Administration',
];

const Issue = sequelize.define(
  'Issue',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    photo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resolved_photo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
      validate: {
        min: -90,
        max: 90,
      },
    },
    longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
      validate: {
        min: -180,
        max: 180,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Perceptual hash of the uploaded image for duplicate/fake detection
    phash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Flag to mark issues that require manual review (e.g. when EXIF GPS is missing)
    needs_review: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // CNN-predicted issue category. STRING (not ENUM) so it can be added to
    // the existing table via a plain ALTER TABLE in the migration script,
    // with the allowed values enforced at the application layer instead.
    // All 7 category labels are kept under 20 chars to fit this column.
    category: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [categories],
      },
    },
    classification_confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    // Which municipal department this issue has been routed to. STRING (not
    // ENUM) for the same reason as `category` — a plain ALTER TABLE can add
    // it to the existing table, with allowed values enforced at the app layer.
    department: {
      type: DataTypes.STRING(60),
      allowNull: true,
      validate: {
        isIn: [departments],
      },
    },
    status: {
      type: DataTypes.ENUM(...statuses),
      allowNull: false,
      defaultValue: 'Open',
    },
    // Short public-facing code (e.g. "CF-7K2M9Q") a citizen can use to look up
    // their report on the no-login /track page. Generated once at creation.
    tracking_code: {
      type: DataTypes.STRING(12),
      allowNull: true,
    },
    // Set the first time status transitions to 'Resolved' — powers the
    // resolution-time metric on the admin analytics dashboard. Left null
    // otherwise; created_at already covers the "reported at" timestamp.
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'issues',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  }
);

module.exports = {
  Issue,
  statuses,
  categories,
  departments,
};
