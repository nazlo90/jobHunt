import { useState } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, CircularProgress,
  IconButton, Menu, MenuItem as MuiMenuItem, Divider, Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ScraperProfile } from '../../../core/models/scraper.model';

interface ProfileSelectorProps {
  profiles: ScraperProfile[];
  selected: ScraperProfile | null;
  activating: boolean;
  onProfileSelected: (id: number) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export default function ProfileSelector({
  profiles, selected, activating,
  onProfileSelected, onNew, onDuplicate, onRename, onDelete,
}: Readonly<ProfileSelectorProps>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const closeMenu = () => setAnchorEl(null);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', pt: 2 }}>
      <FormControl size="small" sx={{ width: 256 }} disabled={activating}>
        <InputLabel>Active Profile</InputLabel>
        <Select
          label="Active Profile"
          value={selected?.id ?? ''}
          onChange={e => onProfileSelected(Number(e.target.value))}
        >
          {profiles.map(p => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {activating && <CircularProgress size={20} />}

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title="Profile actions">
        <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
          <MoreVertIcon />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MuiMenuItem onClick={() => { closeMenu(); onNew(); }}>
          <AddIcon sx={{ mr: 1 }} fontSize="small" /> New profile
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { closeMenu(); onDuplicate(); }}>
          <ContentCopyIcon sx={{ mr: 1 }} fontSize="small" /> Duplicate current
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { closeMenu(); onRename(); }}>
          <DriveFileRenameOutlineIcon sx={{ mr: 1 }} fontSize="small" /> Rename current
        </MuiMenuItem>
        <Divider />
        <MuiMenuItem
          onClick={() => { closeMenu(); onDelete(); }}
          disabled={profiles.length <= 1}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, color: 'error.main' }} fontSize="small" /> Delete current
        </MuiMenuItem>
      </Menu>
    </Box>
  );
}
