import React from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { tokens } from '../theme';
import { getCurrentUser } from '../utils/auth';

const drawerWidth = 240;

const PAGE_TITLES = [
  { test: (path) => path === '/admin', title: 'Dashboard' },
  { test: (path) => path.startsWith('/admin/issue/'), title: 'Issue Details' },
  { test: (path) => path === '/admin/pipeline', title: 'CNN Pipeline' },
  { test: (path) => path === '/admin/transfer', title: 'Transfer to Department' },
  { test: (path) => path === '/admin/map', title: 'Map View' },
  { test: (path) => path === '/admin/analytics', title: 'Analytics' },
  { test: (path) => path === '/admin/dept', title: 'My Department' },
];

const Topbar = () => {
  const location = useLocation();
  const currentUser = getCurrentUser();
  const userEmail = currentUser?.email || 'Officer';
  const initials = userEmail.slice(0, 2).toUpperCase();
  const pageTitle =
    PAGE_TITLES.find((entry) => entry.test(location.pathname))?.title || 'CivicFix';

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ minHeight: 68 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, fontSize: '1.1rem' }}>
          {pageTitle}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
            {userEmail}
          </Typography>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: tokens.primary,
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
