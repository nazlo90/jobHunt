import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import CvManager from './components/CvManager';
import ProfileSelector from './components/ProfileSelector';
import ScraperForm from './components/ScraperForm';
import {
  useScraperProfiles, useActivateProfile, useCreateProfile,
  useUpdateProfile, useDuplicateProfile, useDeleteProfile,
} from '../../core/hooks/useScraper';
import type { ScraperProfile } from '../../core/models/scraper.model';

export default function ConfigurationsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'scraper' ? 1 : 0);
  const [selectedProfile, setSelectedProfile] = useState<ScraperProfile | null>(null);

  const { data: profiles, isLoading } = useScraperProfiles();
  const activateProfile = useActivateProfile();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const duplicateProfile = useDuplicateProfile();
  const deleteProfile = useDeleteProfile();

  // Select active profile when profiles load or change
  useEffect(() => {
    if (!selectedProfile && profiles?.length) {
      const active = profiles.find(p => p.isActive) ?? profiles[0];
      setSelectedProfile(active ?? null);
    }
  }, [profiles, selectedProfile]);

  const selectAndActivate = (id: number, profileOverride?: ScraperProfile) => {
    const profile = profileOverride ?? profiles?.find(p => p.id === id);
    if (!profile) return;
    if (profile.isActive) {
      setSelectedProfile(profile);
      return;
    }
    activateProfile.mutate(id, {
      onSuccess: updated => setSelectedProfile(updated),
    });
  };

  const promptNewProfile = () => {
    const name = prompt('Profile name:');
    if (!name?.trim()) return;
    createProfile.mutate({ name: name.trim() }, {
      onSuccess: profile => selectAndActivate(profile.id, profile),
    });
  };

  const promptRenameProfile = () => {
    if (!selectedProfile) return;
    const name = prompt('New profile name:', selectedProfile.name);
    if (!name?.trim() || name.trim() === selectedProfile.name) return;
    updateProfile.mutate({ id: selectedProfile.id, name: name.trim() }, {
      onSuccess: updated => setSelectedProfile(updated),
    });
  };

  const promptDuplicateProfile = () => {
    if (!selectedProfile) return;
    const name = prompt('Name for the duplicate:', `${selectedProfile.name} (copy)`);
    if (!name?.trim()) return;
    duplicateProfile.mutate({ id: selectedProfile.id, name: name.trim() }, {
      onSuccess: copy => setSelectedProfile(copy),
    });
  };

  const handleDeleteProfile = () => {
    if (!selectedProfile) return;
    if (!confirm(`Delete profile "${selectedProfile.name}"? This cannot be undone.`)) return;
    deleteProfile.mutate(selectedProfile.id, {
      onSuccess: () => setSelectedProfile(null),
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, m: 0 }}>Configurations</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your CVs and configure the job scraper.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="My CVs" />
        <Tab label="Scraper Profiles" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ py: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload your CV as a PDF. The CV Adapter uses it to generate tailored applications for each job.
            You can upload multiple CVs (e.g. one per role type) and choose which to use per job.
          </Typography>
          <CvManager />
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ py: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Profiles let you save different search configurations — e.g. one for frontend roles, another for fullstack.
            Selecting a profile makes it active; the scraper always uses the active profile.
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <ProfileSelector
                profiles={profiles ?? []}
                selected={selectedProfile}
                activating={activateProfile.isPending}
                onProfileSelected={id => selectAndActivate(id)}
                onNew={promptNewProfile}
                onDuplicate={promptDuplicateProfile}
                onRename={promptRenameProfile}
                onDelete={handleDeleteProfile}
              />

              {selectedProfile && (
                <Box sx={{ mt: 3 }}>
                  <ScraperForm
                    profile={selectedProfile}
                    onProfileUpdated={updated => setSelectedProfile(updated)}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
