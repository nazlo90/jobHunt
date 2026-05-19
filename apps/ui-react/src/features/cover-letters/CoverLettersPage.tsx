import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, MenuItem, Select, FormControl,
  InputLabel, Paper, CircularProgress, IconButton, Tooltip, Divider,
  InputAdornment,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import { useUserCvs, useGenerateCoverLetter, useParseJobDescription } from '../../core/hooks/useCvs';
import { useDebounce } from '../../core/hooks/useDebounce';

const STORAGE_KEY = 'cover_letter_selected_cv';

export default function CoverLettersPage() {
  const { data: cvs, isLoading: cvsLoading } = useUserCvs();
  const generateMutation = useGenerateCoverLetter();
  const parseMutation = useParseJobDescription();

  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedCvId, setSelectedCvId] = useState<number | ''>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>();

  const debouncedUrl = useDebounce(jobUrl, 800);

  useEffect(() => {
    if (cvs?.length && selectedCvId === '') {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedId = saved ? Number(saved) : null;
      const match = savedId && cvs.find((c) => c.id === savedId);
      setSelectedCvId(match ? match.id : cvs[0].id);
    }
  }, [cvs, selectedCvId]);

  useEffect(() => {
    if (!debouncedUrl) return;
    try { new URL(debouncedUrl); } catch { return; }

    parseMutation.mutate(debouncedUrl, {
      onSuccess: (jd) => setJobDescription(jd),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUrl]);

  const handleCvChange = (id: number) => {
    setSelectedCvId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  const handleGenerate = async () => {
    if (!selectedCvId || !jobDescription.trim()) return;
    const result = await generateMutation.mutateAsync({
      userCvId: selectedCvId as number,
      jobDescription: jobDescription.trim(),
    });
    setCoverLetter(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate =
    !!selectedCvId &&
    jobDescription.trim().length > 0 &&
    !generateMutation.isPending &&
    !parseMutation.isPending;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Cover Letters</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Paste a job URL to auto-fill the description, pick your CV, then generate.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Job URL */}
        <TextField
          label="Job URL"
          placeholder="https://..."
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          size="small"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {parseMutation.isPending
                    ? <CircularProgress size={16} />
                    : <LinkIcon fontSize="small" color="action" />}
                </InputAdornment>
              ),
              endAdornment: jobUrl ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setJobUrl(''); setJobDescription(''); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
          helperText={parseMutation.isError ? 'Could not parse this URL — paste the description manually.' : undefined}
          error={parseMutation.isError}
        />

        {/* CV selector */}
        <FormControl size="small" fullWidth>
          <InputLabel id="cv-select-label">My CV</InputLabel>
          <Select
            labelId="cv-select-label"
            label="My CV"
            value={selectedCvId}
            onChange={(e) => handleCvChange(e.target.value as number)}
            disabled={cvsLoading || !cvs?.length}
          >
            {cvsLoading && <MenuItem value="" disabled>Loading...</MenuItem>}
            {!cvsLoading && !cvs?.length && <MenuItem value="" disabled>No CVs uploaded yet</MenuItem>}
            {cvs?.map((cv) => (
              <MenuItem key={cv.id} value={cv.id}>{cv.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Job Description — optional, auto-filled from URL */}
        <TextField
          label="Job Description"
          placeholder="Auto-filled from URL, or paste manually…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          multiline
          minRows={6}
          maxRows={20}
          fullWidth
        />

        <Button
          variant="contained"
          startIcon={generateMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!canGenerate}
          onClick={handleGenerate}
          sx={{ alignSelf: 'flex-start' }}
        >
          {generateMutation.isPending ? 'Generating...' : 'Generate Cover Letter'}
        </Button>
      </Paper>

      {generateMutation.isError && (
        <Typography color="error" variant="body2">
          Failed to generate. Please try again.
        </Typography>
      )}

      {coverLetter && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Cover Letter</Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton size="small" onClick={handleCopy}>
                {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'inherit' }}
          >
            {coverLetter}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
