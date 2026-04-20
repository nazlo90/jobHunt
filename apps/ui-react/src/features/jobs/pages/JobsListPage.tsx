import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, IconButton, CircularProgress,
  Checkbox, TablePagination, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { useJobs, useJobStats, useDeleteJob, useBulkDeleteJobs, useBulkUpdateStatus } from '../../../core/hooks/useJobs';
import type { Job, JobsFilter, JobStatus } from '../../../core/models/job.model';
import { JOB_STATUSES } from '../../../core/models/job.model';
import { useDebounce } from '../../../core/hooks/useDebounce';

const STATUS_STYLES: Record<string, { bgcolor: string; color: string; border?: string; fontWeight?: number }> = {
  New:           { bgcolor: '#e0e7ff', color: '#3730a3' },
  Bookmarked:    { bgcolor: '#e0e7ff', color: '#3730a3' },
  Saved:         { bgcolor: '#fce7f3', color: '#9d174d' },
  Applied:       { bgcolor: '#d1fae5', color: '#065f46' },
  Screening:     { bgcolor: '#fef3c7', color: '#92400e' },
  Technical:     { bgcolor: '#ede9fe', color: '#5b21b6' },
  'Final Round': { bgcolor: '#f3e8ff', color: '#6b21a8' },
  Offer:         { bgcolor: '#d1fae5', color: '#064e3b', fontWeight: 600 },
  Rejected:      { bgcolor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
  Archived:      { bgcolor: '#f3f4f6', color: '#9ca3af' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function JobsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [source, setSource] = useState('');
  const [minPriority, setMinPriority] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<JobStatus | ''>('');

  const debouncedSearch = useDebounce(search, 300);

  const filters: JobsFilter = { sortBy, page: page + 1, limit: rowsPerPage };
  if (debouncedSearch) filters.search = debouncedSearch;
  if (status) filters.status = status;
  if (source) filters.source = source;
  if (minPriority) filters.minPriority = minPriority;

  const { data, isLoading } = useJobs(filters);
  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;

  const { data: stats } = useJobStats();
  const sources = useMemo(
    () => stats?.bySource.map((s) => s.source) ?? [],
    [stats],
  );

  const deleteJob = useDeleteJob();
  const bulkDelete = useBulkDeleteJobs();
  const bulkUpdateStatus = useBulkUpdateStatus();

  const allSelected = jobs.length > 0 && jobs.every((j) => selected.includes(j.id));
  const someSelected = selected.length > 0 && !allSelected;

  function resetPage() {
    setPage(0);
    setSelected([]);
  }

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? jobs.map((j) => j.id) : []);
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Delete this job?')) deleteJob.mutate(id);
  }

  function handleBulkDelete() {
    if (confirm(`Delete ${selected.length} job(s)?`)) {
      bulkDelete.mutate(selected, { onSuccess: () => setSelected([]) });
    }
  }

  function handleBulkStatus(newStatus: JobStatus) {
    bulkUpdateStatus.mutate(
      { ids: selected, status: newStatus },
      { onSuccess: () => { setSelected([]); setBulkStatus(''); } },
    );
  }

  function exportCsv() {
    const idSet = new Set(selected);
    const rows = jobs.filter((j) => idSet.has(j.id));
    const headers: (keyof Job)[] = ['id', 'company', 'role', 'status', 'salary', 'source', 'location', 'url', 'createdAt'];
    const csv = [
      headers.join(','),
      ...rows.map((j) =>
        headers.map((h) => `"${String(j[h] ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Jobs{' '}
          <Typography component="span" variant="body1" sx={{ color: 'text.secondary', fontWeight: 400 }}>
            ({total})
          </Typography>
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/jobs/new')}>
          Add job
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <TextField
          placeholder="Search…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          size="small"
          sx={{ width: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => { setStatus(e.target.value as JobStatus | ''); resetPage(); }}
          >
            <MenuItem value="">All</MenuItem>
            {JOB_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Source</InputLabel>
          <Select
            value={source}
            label="Source"
            onChange={(e) => { setSource(e.target.value); resetPage(); }}
          >
            <MenuItem value="">All</MenuItem>
            {sources.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Min Stars</InputLabel>
          <Select
            value={minPriority}
            label="Min Stars"
            onChange={(e) => { setMinPriority(Number(e.target.value)); resetPage(); }}
          >
            <MenuItem value={0}>Any</MenuItem>
            {[1, 2, 3, 4, 5].map((p) => <MenuItem key={p} value={p}>{'★'.repeat(p)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={(e) => { setSortBy(e.target.value); resetPage(); }}
          >
            <MenuItem value="created_at">Date Added</MenuItem>
            <MenuItem value="priority">Priority</MenuItem>
            <MenuItem value="company">Company</MenuItem>
            <MenuItem value="salary">Salary</MenuItem>
            <MenuItem value="applied_date">Applied Date</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Paper>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 56, display: { xs: 'none', sm: 'table-cell' } }}>★</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Source</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Salary</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Added</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(job.id)}
                        onChange={() => toggleOne(job.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#f59e0b', fontSize: '0.7rem', letterSpacing: '-1px', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
                      {'★'.repeat(job.priority)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>{job.company}</TableCell>
                    <TableCell>{job.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        sx={{
                          fontSize: '11.5px',
                          fontWeight: STATUS_STYLES[job.status]?.fontWeight ?? 500,
                          bgcolor: STATUS_STYLES[job.status]?.bgcolor ?? '#f3f4f6',
                          color: STATUS_STYLES[job.status]?.color ?? '#6b7280',
                          border: STATUS_STYLES[job.status]?.border,
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{job.source}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{job.salary ?? '—'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
                      {fmtDate(job.createdAt)}
                    </TableCell>
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}
                    >
                      {job.url && (
                        <IconButton size="small" href={job.url} target="_blank" rel="noopener">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleDelete(job.id, e)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!jobs.length && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No jobs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Bulk actions floating bar */}
      {selected.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
            zIndex: 1200,
            '@keyframes slideUp': {
              from: { opacity: 0, transform: 'translateX(-50%) translateY(10px)' },
              to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
            },
            animation: 'slideUp 0.18s ease',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', px: 0.5, whiteSpace: 'nowrap' }}>
            {selected.length} selected
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={bulkStatus}
              label="Status"
              onChange={(e) => handleBulkStatus(e.target.value as JobStatus)}
            >
              {JOB_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <IconButton size="small" title="Export CSV" onClick={exportCsv}>
            <DownloadIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Delete selected" sx={{ color: 'error.main' }} onClick={handleBulkDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Clear selection" onClick={() => setSelected([])}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
