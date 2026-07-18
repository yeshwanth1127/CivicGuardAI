const express = require('express');
const { body, param } = require('express-validator');
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  reclassifyIssue,
  trackIssue,
  deleteIssue,
} = require('../controllers/issueController');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { departments } = require('../models');

const router = express.Router();

const issueIdValidation = [
  param('id').isUUID().withMessage('Issue id must be a valid UUID'),
];

const createIssueValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('photo_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('Photo URL must be valid'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude is invalid'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude is invalid'),
  body('status')
    .optional()
    .isIn(['Open', 'In Progress', 'Resolved'])
    .withMessage('Status must be Open, In Progress, or Resolved'),
];

const updateIssueValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('photo_url').optional().isURL().withMessage('Photo URL must be valid'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude is invalid'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude is invalid'),
  body('status')
    .optional()
    .isIn(['Open', 'In Progress', 'Resolved'])
    .withMessage('Status must be Open, In Progress, or Resolved'),
  body('department')
    .optional()
    .isIn(departments)
    .withMessage(`Department must be one of: ${departments.join(', ')}`),
];

// Public — anyone can report an issue, no account required. The Issue model
// has no reporter/user association, so this was already effectively
// anonymous under the hood; this just removes the login gate in front of it.
router.post(
  '/',
  upload.single('image'),
  createIssueValidation,
  createIssue
);
router.get('/', getIssues);
// Public — no-login lookup by tracking code. Registered before /:id so the
// two-segment path is unambiguous.
router.get('/track/:code', trackIssue);
router.get('/:id', issueIdValidation, getIssueById);
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('staff', 'admin'),
  upload.single('image'),
  issueIdValidation,
  updateIssueValidation,
  updateIssue
);
router.post(
  '/:id/classify',
  authenticateToken,
  authorizeRoles('staff', 'admin'),
  issueIdValidation,
  reclassifyIssue
);
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  issueIdValidation,
  deleteIssue
);

module.exports = router;
