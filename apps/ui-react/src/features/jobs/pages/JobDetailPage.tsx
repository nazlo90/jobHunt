import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, Skeleton, Alert,
  Tabs, Tab, TextField, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, CardHeader, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { useJob, useUpdateJob, useDeleteJob } from '../../../core/hooks/useJobs';
import { useUserCvs, useJobReview, useReviewCv, useAdaptCv } from '../../../core/hooks/useCvs';
import { JOB_STATUSES } from '../../../core/models/job.model';
import type { Job, JobStatus, AdaptedCv } from '../../../core/models/job.model';
import type { UserCv } from '../../../core/models/user-cv.model';

// ---------- Details Tab ----------

interface DetailsFields {
  company: string;
  role: string;
  url: string;
  status: JobStatus;
  priority: number;
  salary: string;
  location: string;
  techStack: string;
  appliedDate: string;
  contact: string;
  notes: string;
}

function fieldsFromJob(job: Job): DetailsFields {
  return {
    company: job.company ?? '',
    role: job.role ?? '',
    url: job.url ?? '',
    status: job.status,
    priority: job.priority,
    salary: job.salary ?? '',
    location: job.location ?? '',
    techStack: job.techStack ?? '',
    appliedDate: job.appliedDate ?? '',
    contact: job.contact ?? '',
    notes: job.notes ?? '',
  };
}

function DetailsTab({ job, onSave }: { job: Job; onSave: (changes: Partial<Job>) => void }) {
  const [fields, setFields] = useState<DetailsFields>(() => fieldsFromJob(job));
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    setFields(fieldsFromJob(job));
    setDirty(false);
  }, [job.id]);

  const set =
    (key: keyof DetailsFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }));
      setDirty(true);
    };

  const handleSave = () => {
    onSave({
      ...fields,
      appliedDate: fields.appliedDate || undefined,
    });
    setDirty(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField label="Company" value={fields.company} onChange={set('company')} size="small" />
        <TextField label="Role" value={fields.role} onChange={set('role')} size="small" />

        <TextField
          label="URL"
          value={fields.url}
          onChange={set('url')}
          size="small"
          type="url"
          sx={{ gridColumn: 'span 2' }}
        />

        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={fields.status}
            label="Status"
            onChange={(e) => {
              setFields((f) => ({ ...f, status: e.target.value as JobStatus }));
              setDirty(true);
            }}
          >
            {JOB_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Priority</InputLabel>
          <Select
            value={fields.priority}
            label="Priority"
            onChange={(e) => {
              setFields((f) => ({ ...f, priority: Number(e.target.value) }));
              setDirty(true);
            }}
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <MenuItem key={p} value={p}>{'★'.repeat(p)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField label="Salary" value={fields.salary} onChange={set('salary')} size="small" />
        <TextField label="Location" value={fields.location} onChange={set('location')} size="small" />
        <TextField label="Tech Stack" value={fields.techStack} onChange={set('techStack')} size="small" />

        <TextField
          label="Applied Date"
          value={fields.appliedDate}
          onChange={set('appliedDate')}
          size="small"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField label="Contact" value={fields.contact} onChange={set('contact')} size="small" />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
          Source
        </Typography>
        <Chip label={job.source} size="small" />
      </Box>

      <TextField
        label="Notes"
        value={fields.notes}
        onChange={set('notes')}
        multiline
        rows={4}
        fullWidth
        size="small"
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
        {isDirty && (
          <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 500 }}>
            Unsaved changes
          </Typography>
        )}
        <Button
          variant="contained"
          disabled={!isDirty}
          onClick={handleSave}
          startIcon={<SaveIcon />}
        >
          Save Details
        </Button>
      </Box>
    </Box>
  );
}

// ---------- Review Job Tab ----------

function scoreColor(score: number): string {
  if (score >= 70) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function buildCvHtml(text: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1e293b}
h1{font-size:1.4rem;margin-bottom:4px}pre{white-space:pre-wrap;font-family:inherit;font-size:0.9rem}</style>
</head><body><h1>${title}</h1><pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
}

function ReviewJobTab({ job, userCvs }: { job: Job; userCvs: UserCv[] }) {
  const { data: existingReview } = useJobReview(job.id);
  const reviewCv = useReviewCv();
  const adaptCv = useAdaptCv();

  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [latestCv, setLatestCv] = useState<AdaptedCv | null>(null);
  const [adaptedCvText, setAdaptedCvText] = useState<string | null>(null);

  // Auto-select first CV
  useEffect(() => {
    if (userCvs.length > 0 && !selectedCvId) {
      setSelectedCvId(userCvs[0].id);
    }
  }, [userCvs]);

  // Load existing review on mount
  useEffect(() => {
    if (existingReview) {
      setLatestCv(existingReview);
      if (existingReview.jobDescription && !jobDescription) {
        setJobDescription(existingReview.jobDescription);
      }
    }
  }, [existingReview]);

  const handleAnalyze = () => {
    if (!selectedCvId || !jobDescription) return;
    setAdaptedCvText(null);
    reviewCv.mutate(
      { jobId: job.id, jobDescription, userCvId: selectedCvId },
      { onSuccess: (cv) => setLatestCv(cv) },
    );
  };

  const handleAdapt = () => {
    if (!latestCv) return;
    setAdaptedCvText(null);
    adaptCv.mutate(latestCv.id, { onSuccess: (text) => setAdaptedCvText(text) });
  };

  const handlePreview = () => {
    if (!adaptedCvText) return;
    const title = `Adapted CV — ${latestCv?.company || latestCv?.role || 'Preview'}`;
    const html = buildCvHtml(adaptedCvText, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSaveAsPdf = () => {
    if (!adaptedCvText) return;
    const title = `Adapted CV — ${latestCv?.company || latestCv?.role || 'Preview'}`;
    const html = buildCvHtml(adaptedCvText, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) return;
    win.addEventListener('load', () => {
      URL.revokeObjectURL(url);
      setTimeout(() => win.print(), 200);
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
      {/* CV Selection */}
      <Box
        sx={{
          bgcolor: 'action.hover',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
        }}
      >
        {userCvs.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              No CVs uploaded yet. Go to{' '}
              <Link to="/settings" style={{ color: '#7c3aed' }}>Settings</Link>
              {' '}to add one.
            </Typography>
          </Box>
        ) : (
          <>
            <FormControl size="small" fullWidth>
              <InputLabel>Select CV to compare</InputLabel>
              <Select
                value={selectedCvId ?? ''}
                label="Select CV to compare"
                onChange={(e) => setSelectedCvId(Number(e.target.value))}
              >
                {userCvs.map((cv) => (
                  <MenuItem key={cv.id} value={cv.id}>{cv.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedCvId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                <Typography variant="caption" sx={{ color: 'secondary.main' }}>
                  AI will compare your CV against the job description and score the match.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Job description */}
      <TextField
        label="Paste Job Description"
        multiline
        rows={8}
        fullWidth
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste the full job description here…"
      />

      {/* Analyze button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          disabled={!jobDescription || reviewCv.isPending || !selectedCvId}
          onClick={handleAnalyze}
          startIcon={reviewCv.isPending ? <CircularProgress size={16} color="inherit" /> : <ManageSearchIcon />}
        >
          {reviewCv.isPending ? 'Analyzing…' : 'Analyze Match'}
        </Button>
        {!selectedCvId && userCvs.length > 0 && (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            Select a CV above to enable analysis.
          </Typography>
        )}
      </Box>

      {/* Review result */}
      {latestCv && (
        <>
          <Card variant="outlined">
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: scoreColor(latestCv.relevanceScore) }}
                  >
                    {latestCv.relevanceScore}/100
                  </Typography>
                  <Typography variant="h6">Relevance Score</Typography>
                </Box>
              }
              subheader={
                latestCv.createdAt
                  ? `Reviewed ${new Date(latestCv.createdAt).toLocaleString()}`
                  : undefined
              }
            />
            <CardContent>
              <CvSection title="Adapted Profile">
                <Typography variant="body2">{latestCv.adaptedProfile}</Typography>
              </CvSection>

              <CvSection title="Keywords Found">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {latestCv.keywordsFound.map((kw) => (
                    <Chip key={kw} label={kw} size="small" sx={{ bgcolor: '#ecfdf5', color: '#065f46' }} />
                  ))}
                </Box>
              </CvSection>

              <CvSection title="Missing Skills">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {latestCv.missingSkills.length > 0
                    ? latestCv.missingSkills.map((skill) => (
                        <Chip key={skill} label={skill} size="small" sx={{ bgcolor: '#fff1f2', color: '#9f1239' }} />
                      ))
                    : <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>None — great match!</Typography>
                  }
                </Box>
              </CvSection>

              {latestCv.topExperience.length > 0 && (
                <CvSection title="Tailored Experience">
                  {latestCv.topExperience.map((exp) => (
                    <Box key={exp.company} sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>{exp.role}</strong> — {exp.company}
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          {exp.period}
                        </Typography>
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 3 }}>
                        {exp.bullets.map((b, i) => (
                          <Typography key={i} component="li" variant="body2" sx={{ lineHeight: 1.7 }}>{b}</Typography>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </CvSection>
              )}

              <CvSection title="Cover Letter">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Tooltip title="Copy to clipboard">
                    <IconButton size="small" onClick={() => handleCopy(latestCv.coverLetter)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {latestCv.coverLetter}
                </Typography>
              </CvSection>

              <CvSection title="Advice" last>
                <Typography variant="body2">{latestCv.advice}</Typography>
              </CvSection>
            </CardContent>
          </Card>

          {/* CV Adapter */}
          <Card variant="outlined" sx={{ borderColor: '#ddd6fe', bgcolor: '#faf5ff' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoFixHighIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6">CV Adapter</Typography>
                </Box>
              }
              subheader="Generates a tailored version of your CV — only profile, skills and employment bullets are changed. Personal info, education and languages stay untouched."
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="contained"
                  disabled={adaptCv.isPending}
                  onClick={handleAdapt}
                  startIcon={adaptCv.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                >
                  {adaptCv.isPending ? 'Adapting…' : 'Adapt CV to this Job'}
                </Button>
                {adaptedCvText && (
                  <>
                    <Button variant="outlined" onClick={handlePreview} startIcon={<VisibilityIcon />}>
                      Preview
                    </Button>
                    <Button variant="outlined" onClick={handleSaveAsPdf} startIcon={<PictureAsPdfIcon />}>
                      Save as PDF
                    </Button>
                  </>
                )}
              </Box>
              {adaptedCvText && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'success.main' }}>
                    CV adapted — use Preview to review, then Save as PDF.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

function CvSection({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Box sx={{ mb: last ? 0 : 3 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'text.secondary',
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

// ---------- Main Page ----------

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = Number(id);

  const { data: job, isLoading, isError } = useJob(jobId);
  const { data: userCvs = [] } = useUserCvs();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const [tab, setTab] = useState(0);

  const handleSave = (changes: Partial<Job>) => {
    updateJob.mutate({ id: jobId, ...changes });
  };

  const handleDelete = async () => {
    if (confirm('Delete this job?')) {
      await deleteJob.mutateAsync(jobId);
      navigate('/jobs');
    }
  };

  if (isLoading) return <Skeleton variant="rectangular" height={400} />;
  if (isError || !job) return <Alert severity="error">Job not found.</Alert>;

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          mb: 3,
          borderRadius: 2,
        }}
      >
        <IconButton onClick={() => navigate('/jobs')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.company}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.role}
          </Typography>
        </Box>
        {job.url && (
          <Button href={job.url} target="_blank" rel="noopener" endIcon={<OpenInNewIcon />} size="small">
            Open Job
          </Button>
        )}
        <Button color="error" variant="outlined" size="small" onClick={handleDelete}>
          Delete
        </Button>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Details" />
          <Tab label="Review Job" />
        </Tabs>
        <Box sx={{ px: 3 }}>
          {tab === 0 && <DetailsTab job={job} onSave={handleSave} />}
          {tab === 1 && <ReviewJobTab job={job} userCvs={userCvs} />}
        </Box>
      </Paper>
    </Box>
  );
}
