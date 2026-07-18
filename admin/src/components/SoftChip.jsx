import React from 'react';
import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';

// A "soft" pill badge: tinted background, colored text, hairline border in
// the same hue — the recurring visual language for status/category chips
// across the dashboard and issue detail page.
const SoftChip = ({ color, label, icon, size = 'small', sx, ...rest }) => (
  <Chip
    icon={icon}
    label={label}
    size={size}
    sx={{
      backgroundColor: alpha(color, 0.12),
      color,
      border: `1px solid ${alpha(color, 0.28)}`,
      '& .MuiChip-icon': { color },
      ...sx,
    }}
    {...rest}
  />
);

export default SoftChip;
