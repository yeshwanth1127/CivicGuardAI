import React from 'react';
import SoftChip from './SoftChip';
import { REVIEW_META } from '../constants/statusMeta';

const ReviewChip = ({ needsReview, ...rest }) => {
  const meta = needsReview ? REVIEW_META.needsReview : REVIEW_META.verified;
  return <SoftChip color={meta.color} label={meta.label} {...rest} />;
};

export default ReviewChip;
