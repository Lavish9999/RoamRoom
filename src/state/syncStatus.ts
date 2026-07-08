export type SyncStatus = 'synced' | 'syncing' | 'local-only' | 'error';

export function syncStatusLabel(status: SyncStatus) {
  if (status === 'synced') return 'Synced';
  if (status === 'syncing') return 'Syncing';
  if (status === 'error') return 'Sync issue';
  return 'Local only';
}

export function syncStatusCopy(status: SyncStatus) {
  if (status === 'synced') return 'Cloud sync is up to date.';
  if (status === 'syncing') return 'Saving changes to the shared trip.';
  if (status === 'error') return 'Saved on this device. Will retry when sync is available.';
  return 'Saved on this device until cloud sync is available.';
}
