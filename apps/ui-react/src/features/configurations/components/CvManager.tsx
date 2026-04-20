import { useRef, useState } from 'react';
import {
  Box, TextField, Button, List, ListItem, ListItemIcon, ListItemText,
  CircularProgress, Typography, IconButton,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useQueryClient } from '@tanstack/react-query';
import { useUserCvs, useDeleteUserCv, cvKeys } from '../../../core/hooks/useCvs';
import { scraperKeys } from '../../../core/hooks/useScraper';
import { http } from '../../../core/api/http';
import { extractTextFromPdf } from '../../../core/utils/pdfExtract';

export default function CvManager() {
  const { data: cvs, isLoading } = useUserCvs();
  const deleteCv = useDeleteUserCv();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cvName = name.trim() || file.name.replace(/\.pdf$/i, '');
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const cvText = await extractTextFromPdf(arrayBuffer);

      const form = new FormData();
      form.append('name', cvName);
      form.append('cvText', cvText);
      form.append('pdf', file, file.name);
      await http.post('/user-cvs', form);

      queryClient.invalidateQueries({ queryKey: cvKeys.userCvs() });
      setName('');

      // Best-effort auto-fill active scraper profile from CV text
      http.post('/profiles/extract-from-cv', { cvText })
        .then(() => queryClient.invalidateQueries({ queryKey: scraperKeys.profiles() }))
        .catch(() => {});
    } catch (err) {
      console.error('CV upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          label="CV name"
          placeholder="e.g. Senior Frontend CV"
          value={name}
          onChange={e => setName(e.target.value)}
          size="small"
          sx={{ width: 256 }}
        />
        <Button
          variant="outlined"
          startIcon={uploading ? <CircularProgress size={18} /> : <UploadFileIcon />}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload PDF'}
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
        Give the CV a name, then click "Upload PDF" to select a file.
      </Typography>

      {!cvs?.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No CVs uploaded yet.
        </Typography>
      ) : (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <List disablePadding>
            {cvs.map((cv) => (
              <ListItem
                key={cv.id}
                divider
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={() => deleteCv.mutate(cv.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primary={cv.name}
                  secondary={cv.filename}
                  slotProps={{ secondary: { variant: 'caption' } }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
