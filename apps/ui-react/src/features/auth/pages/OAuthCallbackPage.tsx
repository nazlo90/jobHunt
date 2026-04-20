import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { setAccessToken } from '../../../core/api/http';
import { useAuthStore } from '../../../core/stores/authStore';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = params.get('token');
    if (token) {
      setAccessToken(token);
      fetchCurrentUser().then(() => navigate('/dashboard', { replace: true }));
    } else {
      navigate('/auth/login', { replace: true });
    }
  }, [params, fetchCurrentUser, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress />
      <Typography>Signing you in…</Typography>
    </Box>
  );
}
