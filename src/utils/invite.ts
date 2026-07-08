// Placeholder download link until real App Store / Play Store links exist.
export const APP_DOWNLOAD_URL = 'https://roamroom.app';

/** The message shared/sent when inviting someone to a trip. */
export function buildInviteMessage(opts: { tripName?: string; destination?: string; code: string }) {
  const city = opts.destination?.split(',')[0]?.trim();
  const where = city ? ` to ${city}` : '';
  return (
    `Join "${opts.tripName || 'my trip'}"${where} on RoamRoom.\n\n` +
    `Download the app: ${APP_DOWNLOAD_URL}\n` +
    `Then tap "Join trip" and enter invite code ${opts.code}.`
  );
}
