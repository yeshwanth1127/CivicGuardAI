import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';

// A minimal KPI tile: icon chip, big number, label. Used in the dashboard's
// summary row. `delay` staggers the fade-in-up entrance across a row of tiles.
const StatTile = ({ icon, label, value, color, delay = 0 }) => (
  <Box
    className="fade-in-up"
    sx={{
      flex: '1 1 160px',
      minWidth: 150,
      p: 2.25,
      borderRadius: 4,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      animationDelay: `${delay}ms`,
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 16px rgba(11,11,11,0.08)',
      },
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(color, 0.14),
          color,
        }}
      >
        {icon}
      </Box>
    </Stack>
    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

export default StatTile;
