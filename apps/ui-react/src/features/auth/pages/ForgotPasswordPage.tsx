import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { http } from '../../../core/api/http';

const schema = z.object({ email: z.email('Invalid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await http.post('/auth/forgot-password', data);
    setSent(true);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Reset password</Typography>

        {sent ? (
          <Alert severity="success">Check your email for a reset link.</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <Button type="submit" variant="contained" loading={isSubmitting} fullWidth>
              Send reset link
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2"><Link to="/auth/login">Back to sign in</Link></Typography>
        </Box>
      </Paper>
    </Box>
  );
}
