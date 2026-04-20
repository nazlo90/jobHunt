import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Paper,
  Select, MenuItem, FormControl, InputLabel, Alert,
} from '@mui/material';
import { useCreateJob, useAutocompleteJob } from '../../../core/hooks/useJobs';
import { JOB_STATUSES } from '../../../core/models/job.model';

const schema = z.object({
  company: z.string().min(1, 'Required'),
  role: z.string().min(1, 'Required'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().optional(),
  salary: z.string().optional(),
  techStack: z.string().optional(),
  status: z.enum(['New', 'Saved', 'Applied', 'Screening', 'Technical', 'Final Round', 'Offer', 'Rejected', 'Archived']),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AddJobPage() {
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const autocomplete = useAutocompleteJob();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'New' },
  });

  const handleAutofill = async () => {
    const url = (document.getElementById('url-field') as HTMLInputElement)?.value;
    if (!url) return;
    const data = await autocomplete.mutateAsync(url);
    if (data.company) setValue('company', data.company);
    if (data.role) setValue('role', data.role);
    if (data.salary) setValue('salary', data.salary);
    if (data.location) setValue('location', data.location ?? '');
    if (data.techStack) setValue('techStack', data.techStack ?? '');
  };

  const onSubmit = async (data: FormData) => {
    const job = await createJob.mutateAsync(data);
    navigate(`/jobs/${job.id}`);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Add job</Typography>

      <Paper sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              id="url-field"
              label="Job URL"
              fullWidth
              {...register('url')}
              error={!!errors.url}
              helperText={errors.url?.message}
            />
            <Button
              variant="outlined"
              onClick={handleAutofill}
              loading={autocomplete.isPending}
              sx={{ whiteSpace: 'nowrap', minWidth: 110 }}
            >
              Auto-fill
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Company *"
              fullWidth
              {...register('company')}
              error={!!errors.company}
              helperText={errors.company?.message}
            />
            <TextField
              label="Role *"
              fullWidth
              {...register('role')}
              error={!!errors.role}
              helperText={errors.role?.message}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Location" fullWidth {...register('location')} />
            <TextField label="Salary" fullWidth {...register('salary')} />
          </Box>

          <TextField label="Tech stack" {...register('techStack')} />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select defaultValue="New" label="Status" {...register('status')}>
              {JOB_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Notes" multiline rows={3} {...register('notes')} />

          {createJob.isError && (
            <Alert severity="error">Failed to save job. Please try again.</Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="contained" loading={createJob.isPending}>Save</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
