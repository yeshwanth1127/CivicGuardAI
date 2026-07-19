// Keep in sync with backend/src/models/Issue.js's `departments` list.
export const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Sanitation & Waste Management',
  'Electrical & Street Lighting',
  'Water & Drainage',
  'Parks & Public Spaces',
  'General Administration',
];

// Pre-selects a sensible default in the dropdown based on the CNN-predicted
// category — the admin can always override it before sending.
export const CATEGORY_DEPARTMENT_SUGGESTION = {
  Pothole: 'Roads & Infrastructure',
  Sidewalk: 'Roads & Infrastructure',
  Other: 'General Administration',
};
