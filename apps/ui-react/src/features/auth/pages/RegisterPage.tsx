import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { useAuthStore } from '../../../core/stores/authStore';
import GoogleButton from '../components/GoogleButton';

const schema = z.object({
  email: z.email('Invalid email'),
  name: z.string().optional(),
  password: z.string().min(6, 'Min 6 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const register_ = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ confirm: _, ...data }: FormData) => {
    try {
      await register_(data);
      navigate('/dashboard');
    } catch {
      setError('root', { message: 'Registration failed. Email may already be in use.' });
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Create account</Typography>

        <GoogleButton />

        {errors.root && <Alert severity="error" sx={{ mb: 2 }}>{errors.root.message}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Name (optional)" {...register('name')} />
          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <TextField
            label="Confirm password"
            type="password"
            {...register('confirm')}
            error={!!errors.confirm}
            helperText={errors.confirm?.message}
          />
          <Button type="submit" variant="contained" loading={loading} fullWidth>
            Register
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            Already have an account? <Link to="/auth/login">Sign in</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
