import React from 'react';
import SoftChip from './SoftChip';
import { getCategoryMeta } from '../constants/statusMeta';

const CategoryChip = ({ category, confidence, ...rest }) => {
  const meta = getCategoryMeta(category);
  const label =
    confidence != null ? `${meta.label} · ${Math.round(confidence * 100)}%` : meta.label;
  return <SoftChip color={meta.color} label={label} {...rest} />;
};

export default CategoryChip;
