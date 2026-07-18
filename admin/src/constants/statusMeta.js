import { tokens } from '../theme';

// Status roles (Open/In Progress/Resolved/Needs Review) are semantically
// fixed and never reused for the CNN category chips below — keeps the two
// color languages from colliding on screen.
export const STATUS_META = {
  Open: { color: tokens.warning, label: 'Open' },
  'In Progress': { color: tokens.primary, label: 'In Progress' },
  Resolved: { color: tokens.good, label: 'Resolved' },
};

export const REVIEW_META = {
  needsReview: { color: tokens.critical, label: 'Needs Manual Review' },
  verified: { color: tokens.good, label: 'Verified' },
};

// CNN classification categories — distinct hues from the status palette so
// a category chip is never mistaken for a status chip.
export const CATEGORY_META = {
  Pothole: { color: '#c65a2e', label: 'Pothole' },
  Garbage: { color: '#1baf7a', label: 'Garbage' },
  Streetlight: { color: '#4a3aa7', label: 'Streetlight' },
  Sidewalk: { color: '#a8842e', label: 'Sidewalk' },
  Flooding: { color: '#1a7fb8', label: 'Flooding' },
  'Road Sign': { color: '#b8348f', label: 'Road Sign' },
  Other: { color: tokens.textMuted, label: 'Other' },
};

export const getStatusMeta = (status) =>
  STATUS_META[status] || { color: tokens.textMuted, label: status || 'Unknown' };

export const getCategoryMeta = (category) =>
  CATEGORY_META[category] || { color: tokens.textMuted, label: category };
