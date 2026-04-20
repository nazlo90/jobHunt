import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { http } from '../../../core/api/http';

const schema = z.object({
  password: z.string().min(6, 'Min 6 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }: FormData) => {
    try {
      await http.post('/auth/reset-password', { token, password });
      navigate('/auth/login');
    } catch {
      setError('root', { message: 'Invalid or expired token.' });
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>New password</Typography>

        {errors.root && <Alert severity="error" sx={{ mb: 2 }}>{errors.root.message}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="New password"
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
          <Button type="submit" variant="contained" loading={isSubmitting} fullWidth>
            Set new password
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
