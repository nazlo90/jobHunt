import { NavLink, useNavigate } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, IconButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../../core/stores/authStore';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Jobs', to: '/jobs', icon: <WorkOutlinedIcon /> },
  { label: 'Configurations', to: '/configurations', icon: <TuneIcon /> },
];

interface SidebarProps {
  readonly onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <WorkOutlinedIcon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1rem' }}>
          JobHunt
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#f1f5f9' }} />

      <List sx={{ flexGrow: 1, px: 1, pt: 1 }}>
        {NAV_ITEMS.map(({ label, to, icon }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            onClick={onNavigate}
            sx={{
              borderRadius: 1.5,
              mb: 0.5,
              '&.active': {
                bgcolor: '#ede9fe',
                color: '#7c3aed',
                '& .MuiListItemIcon-root': { color: '#7c3aed' },
                '& .MuiListItemText-primary': { fontWeight: 600 },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: '#f1f5f9' }} />

      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
          {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{user?.name ?? user?.email}</Typography>
          {user?.name && (
            <Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>
          )}
        </Box>
        <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
