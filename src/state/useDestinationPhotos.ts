import { useEffect, useState } from 'react';

import { fetchDestinationPhotos, getCachedDestinationPhotos } from '@/utils/destinationPhotos';

/**
 * Resolves several real photos of a destination for the template covers. Cache
 * hits return instantly; otherwise it fetches once and fills in when ready.
 * Returns an empty array until (or unless) photos are available, so callers can
 * fall back to a gradient.
 */
export function useDestinationPhotos(destination?: string, count = 8): string[] {
  const [urls, setUrls] = useState<string[]>(() =>
    destination ? getCachedDestinationPhotos(destination) ?? [] : [],
  );

  useEffect(() => {
    const query = destination?.trim();
    if (!query) {
      setUrls([]);
      return;
    }
    const cached = getCachedDestinationPhotos(query);
    if (cached) {
      setUrls(cached);
      return;
    }
    let cancelled = false;
    fetchDestinationPhotos(query, count).then((next) => {
      if (!cancelled) setUrls(next);
    });
    return () => {
      cancelled = true;
    };
  }, [destination, count]);

  return urls;
}
