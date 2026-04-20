import { useState, useEffect } from 'react';
import {
  Box, Card, CardHeader, CardContent, TextField, Select, MenuItem,
  FormControlLabel, Switch, Button, Typography, Chip, InputBase,
  Divider, CircularProgress, FormControl, InputLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import type { ScraperProfile } from '../../../core/models/scraper.model';
import { useUpdateProfile } from '../../../core/hooks/useScraper';
import { SOURCE_CATEGORIES, ALL_SOURCES, type ArrayField } from '../../../core/constants/scraper.const';

function ChipInput({
  label, hint, placeholder, value, onChange,
}: Readonly<{
  label: string;
  hint: string;
  placeholder?: string;
  value: string[];
  onChange: (v: string[]) => void;
}>) {
  const [input, setInput] = useState('');

  const add = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 0.5,
        border: 1, borderColor: 'divider', borderRadius: 1, p: 1, mb: 0.5,
      }}>
        {value.map(chip => (
          <Chip
            key={chip}
            label={chip}
            size="small"
            onDelete={() => onChange(value.filter(v => v !== chip))}
          />
        ))}
        <InputBase
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) add(input); }}
          sx={{ flexGrow: 1, minWidth: 120, fontSize: 14 }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </Box>
  );
}

interface ScraperFormProps {
  profile: ScraperProfile;
  onProfileUpdated: (profile: ScraperProfile) => void;
}

export default function ScraperForm({ profile, onProfileUpdated }: Readonly<ScraperFormProps>) {
  const updateProfile = useUpdateProfile();

  const [chips, setChips] = useState<Record<ArrayField, string[]>>({
    searchTerms: [...profile.searchTerms],
    strongKeywords: [...profile.strongKeywords],
    additionalKeywords: [...profile.additionalKeywords],
    excludeTitle: [...profile.excludeTitle],
    excludeKeywords: [...profile.excludeKeywords],
  });
  const [minSalary, setMinSalary] = useState(profile.minSalary);
  const [minScore, setMinScore] = useState(profile.minScore);
  const [remoteOnly, setRemoteOnly] = useState(profile.remoteOnly);
  const [requireStrongMatch, setRequireStrongMatch] = useState(profile.requireStrongMatch);
  const [enabledSources, setEnabledSources] = useState<string[]>(profile.enabledSources ?? [...ALL_SOURCES]);

  useEffect(() => {
    setChips({
      searchTerms: [...profile.searchTerms],
      strongKeywords: [...profile.strongKeywords],
      additionalKeywords: [...profile.additionalKeywords],
      excludeTitle: [...profile.excludeTitle],
      excludeKeywords: [...profile.excludeKeywords],
    });
    setMinSalary(profile.minSalary);
    setMinScore(profile.minScore);
    setRemoteOnly(profile.remoteOnly);
    setRequireStrongMatch(profile.requireStrongMatch);
    setEnabledSources(profile.enabledSources ?? [...ALL_SOURCES]);
  }, [profile.id]);

  const setChipField = (field: ArrayField, value: string[]) =>
    setChips(prev => ({ ...prev, [field]: value }));

  const toggleSource = (source: string, enabled: boolean) =>
    setEnabledSources(prev => enabled ? [...prev, source] : prev.filter(s => s !== source));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { id: profile.id, minSalary, minScore, remoteOnly, requireStrongMatch, enabledSources, ...chips },
      { onSuccess: updated => onProfileUpdated(updated) },
    );
  };

  return (
    <Box component="form" onSubmit={save} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Search Terms */}
      <Card>
        <CardHeader
          title="Search Terms"
          subheader="Each term is searched separately on LinkedIn and other platforms."
          slotProps={{ title: { variant: 'h6' } }}
        />
        <CardContent>
          <ChipInput
            label="Search Terms"
            placeholder="e.g. Senior Frontend Developer…"
            hint="Type a term and press Enter or , to add it. Click × to remove."
            value={chips.searchTerms}
            onChange={v => setChipField('searchTerms', v)}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader title="Filters" titleTypographyProps={{ variant: 'h6' }} />
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Min Salary"
              type="number"
              size="small"
              value={minSalary}
              onChange={e => setMinSalary(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 0 } }}
              sx={{ flex: '1 1 160px' }}
            />
            <FormControl size="small" sx={{ flex: '1 1 160px' }}>
              <InputLabel>Min Score</InputLabel>
              <Select label="Min Score" value={minScore} onChange={e => setMinScore(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(p => (
                  <MenuItem key={p} value={p}>{'★'.repeat(p)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <FormControlLabel
              control={<Switch checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} color="primary" />}
              label="Remote Only"
            />
            <FormControlLabel
              control={<Switch checked={requireStrongMatch} onChange={e => setRequireStrongMatch(e.target.checked)} color="primary" />}
              label="Require Strong Match"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader
          title="Keywords"
          subheader="Used to score and rank jobs by relevance."
          slotProps={{ title: { variant: 'h6' } }}
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <ChipInput
            label="Strong Keywords"
            placeholder="e.g. TypeScript, React…"
            hint="Jobs matching these keywords get a higher relevance score. Press Enter or , to add."
            value={chips.strongKeywords}
            onChange={v => setChipField('strongKeywords', v)}
          />
          <ChipInput
            label="Additional Keywords"
            placeholder="e.g. GraphQL, Node.js…"
            hint="Secondary keywords — still boost score, but less than strong keywords."
            value={chips.additionalKeywords}
            onChange={v => setChipField('additionalKeywords', v)}
          />
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader
          title="Exclusions"
          subheader="Jobs matching these will be filtered out before saving."
          slotProps={{ title: { variant: 'h6' } }}
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <ChipInput
            label="Exclude by Job Title"
            placeholder="e.g. junior, intern, manager…"
            hint="Jobs whose title contains any of these words will be skipped. Press Enter or , to add."
            value={chips.excludeTitle}
            onChange={v => setChipField('excludeTitle', v)}
          />
          <ChipInput
            label="Exclude by Description Keyword"
            placeholder="e.g. WordPress, Ruby, Golang…"
            hint="Jobs whose description contains these words will be skipped."
            value={chips.excludeKeywords}
            onChange={v => setChipField('excludeKeywords', v)}
          />
        </CardContent>
      </Card>

      {/* Platforms */}
      <Card>
        <CardHeader title="Scraper Platforms" titleTypographyProps={{ variant: 'h6' }} />
        <CardContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Toggle which platforms are scraped during each run.
          </Typography>
          {SOURCE_CATEGORIES.map((category, idx) => (
            <Box key={category.label}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mb: 1, mt: idx === 0 ? 0 : 0.5 }}>
                {category.label}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5, mb: 2 }}>
                {category.sources.map(source => (
                  <FormControlLabel
                    key={source}
                    control={
                      <Switch
                        size="small"
                        checked={enabledSources.includes(source)}
                        onChange={e => toggleSource(source, e.target.checked)}
                        color="primary"
                      />
                    }
                    label={<Typography variant="body2">{source}</Typography>}
                  />
                ))}
              </Box>
              {idx < SOURCE_CATEGORIES.length - 1 && <Divider sx={{ mb: 1.5 }} />}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 2 }}>
        <Button
          type="submit"
          variant="contained"
          startIcon={updateProfile.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          disabled={updateProfile.isPending}
        >
          Save Changes
        </Button>
      </Box>

    </Box>
  );
}
