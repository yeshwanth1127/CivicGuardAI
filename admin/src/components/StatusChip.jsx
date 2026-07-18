import React from 'react';
import SoftChip from './SoftChip';
import { getStatusMeta } from '../constants/statusMeta';

const StatusChip = ({ status, ...rest }) => {
  const meta = getStatusMeta(status);
  return <SoftChip color={meta.color} label={meta.label} {...rest} />;
};

export default StatusChip;
