import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Skeleton, Button, Divider,
  Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Link } from 'react-router-dom';
import { useJobStats } from '../../core/hooks/useJobs';
import { useScraperStatus, useRunScraper, useStopScraper, useScraperProfiles } from '../../core/hooks/useScraper';
import { useUserCvs } from '../../core/hooks/useCvs';

function StatCard({ label, value, color }: { label: string; value: number | undefined; color?: string }) {
  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      {value === undefined ? (
        <Skeleton variant="text" width={60} sx={{ mx: 'auto' }} />
      ) : (
        <Typography variant="h3" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
      )}
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const { data: stats } = useJobStats();
  const { data: scraperStatus } = useScraperStatus();
  const { data: profiles } = useScraperProfiles();
  const { data: userCvs } = useUserCvs();
  const runScraper = useRunScraper();
  const stopScraper = useStopScraper();

  const activeProfile = profiles?.find((p) => p.isActive) ?? profiles?.[0];
  const [selectedProfileId, setSelectedProfileId] = useState<number | undefined>(undefined);
  const profileId = selectedProfileId ?? activeProfile?.id;

  const hasCvs = (userCvs?.length ?? 0) > 0;
  const hasSearchTerms = ((profiles?.find((p) => p.id === profileId) ?? activeProfile)?.searchTerms?.length ?? 0) > 0;
  const onboardingDone = hasCvs && hasSearchTerms;

  const isRunning = scraperStatus?.running ?? false;
  const isStopping = stopScraper.isPending;
  const lastRun = scraperStatus?.lastRun;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Dashboard</Typography>

      {/* Onboarding banner */}
      {!onboardingDone && (
        <Paper
          variant="outlined"
          sx={{ mb: 4, p: 3, borderColor: 'primary.light', bgcolor: 'primary.50' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <RocketLaunchIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Get started with JobHunt</Typography>
              <Typography variant="body2" color="text.secondary">
                Complete these steps to start finding jobs automatically.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Step 1 */}
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1,
                bgcolor: hasCvs ? 'success.50' : 'background.paper',
              }}
            >
              {hasCvs
                ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                : <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 24 }} />
              }
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: hasCvs ? 'success.dark' : 'text.primary' }}>
                  Upload a CV
                </Typography>
                {!hasCvs && (
                  <Typography variant="caption" color="text.secondary">
                    Required for AI-powered CV adapting
                  </Typography>
                )}
              </Box>
              {!hasCvs && (
                <Button component={Link} to="/settings?tab=cv" variant="outlined" size="small">
                  Upload CV
                </Button>
              )}
            </Box>

            {/* Step 2 */}
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1,
                bgcolor: hasSearchTerms ? 'success.50' : 'background.paper',
              }}
            >
              {hasSearchTerms
                ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                : <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 24 }} />
              }
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: hasSearchTerms ? 'success.dark' : 'text.primary' }}>
                  Set up search terms
                </Typography>
                {!hasSearchTerms && (
                  <Typography variant="caption" color="text.secondary">
                    Tell the scraper what roles to look for
                  </Typography>
                )}
              </Box>
              {!hasSearchTerms && (
                <Button component={Link} to="/configurations?tab=scraper" variant="outlined" size="small">
                  Add Search Terms
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Empty state */}
      {stats?.total === 0 && onboardingDone && (
        <Paper sx={{ mb: 4, p: 6, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>No jobs yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Run the scraper to automatically collect jobs from all your configured platforms, or add a job manually.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {isStopping ? (
              <Button variant="contained" disabled startIcon={<CircularProgress size={16} />}>
                Stopping…
              </Button>
            ) : isRunning ? (
              <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={() => stopScraper.mutate()}>
                Stop
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                loading={runScraper.isPending}
                onClick={() => runScraper.mutate(profileId)}
              >
                Run Scraper
              </Button>
            )}
            <Button component={Link} to="/jobs/new" variant="outlined" startIcon={<AddIcon />}>
              Add Job Manually
            </Button>
          </Box>
        </Paper>
      )}

      {/* Stat cards */}
      {(stats?.total ?? 0) > 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Total Jobs" value={stats?.total} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="In Pipeline" value={stats?.pipeline} color="warning.main" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Offers" value={stats?.offers} color="success.main" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Applied This Week" value={stats?.thisWeek} color="info.main" />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* By Status */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>By Status</Typography>
                {stats?.byStatus.map((s, i) => (
                  <Box key={s.status}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography variant="body2" color="text.secondary">{s.status}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.count}</Typography>
                    </Box>
                    {i < (stats.byStatus.length - 1) && <Divider />}
                  </Box>
                ))}
              </Paper>
            </Grid>

            {/* By Source */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>By Source</Typography>
                {stats?.bySource.map((s, i) => (
                  <Box key={s.source}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography variant="body2" color="text.secondary">{s.source}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.count}</Typography>
                    </Box>
                    {i < (stats.bySource.length - 1) && <Divider />}
                  </Box>
                ))}
              </Paper>
            </Grid>

            {/* Scraper card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Scraper</Typography>

                {lastRun ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Last run: {lastRun.finishedAt ? new Date(lastRun.finishedAt).toLocaleString() : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      New: {lastRun.inserted} &nbsp;|&nbsp; Updated: {lastRun.updated} &nbsp;|&nbsp; Removed: {lastRun.deleted}
                    </Typography>
                    {lastRun.errors.length > 0 && (
                      <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                        {lastRun.errors.length} error(s)
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No runs yet
                  </Typography>
                )}

                <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  {profiles && profiles.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Profile</InputLabel>
                      <Select
                        label="Profile"
                        value={profileId ?? ''}
                        onChange={(e) => setSelectedProfileId(e.target.value as number)}
                      >
                        {profiles.map((p) => (
                          <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {isStopping ? (
                    <Button variant="contained" disabled startIcon={<CircularProgress size={16} />}>
                      Stopping…
                    </Button>
                  ) : isRunning ? (
                    <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={() => stopScraper.mutate()}>
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      loading={runScraper.isPending}
                      onClick={() => runScraper.mutate(profileId)}
                    >
                      Run Scraper
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
