import { useEffect, useState } from 'react';

import { fetchDestinationPhoto, getCachedDestinationPhoto } from '@/utils/destinationPhoto';

/**
 * Resolves a real cover photo for a destination. An explicit `photoUrl` (if a
 * trip ever stores one) always wins. Cache hits return instantly; otherwise the
 * lookup is debounced so typing a destination doesn't fire a request per key.
 */
export function useDestinationPhoto(photoUrl?: string, destination?: string): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (photoUrl) return photoUrl;
    if (destination) return getCachedDestinationPhoto(destination) ?? null;
    return null;
  });

  useEffect(() => {
    if (photoUrl) {
      setUrl(photoUrl);
      return;
    }
    const query = destination?.trim();
    if (!query) {
      setUrl(null);
      return;
    }

    const cached = getCachedDestinationPhoto(query);
    if (cached) {
      setUrl(cached);
      return;
    }

    // Keep the current image while we look up a new one (avoids flicker), then
    // fetch after a short pause so mid-typing keystrokes don't each hit the API.
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchDestinationPhoto(query).then((next) => {
        if (!cancelled) setUrl(next);
      });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photoUrl, destination]);

  return url;
}
