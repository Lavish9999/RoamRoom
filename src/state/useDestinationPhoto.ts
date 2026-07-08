import { useEffect, useState } from 'react';

import { fetchDestinationPhoto, getCachedDestinationPhoto } from '@/utils/destinationPhoto';
import { fetchDestinationPhotos, getCachedDestinationPhotos } from '@/utils/destinationPhotos';

/**
 * Resolves a real cover photo for a destination. An explicit `photoUrl` (if a
 * trip ever stores one) always wins. Otherwise it uses the same Unsplash →
 * Openverse source as the template covers (great for cities, states, and
 * regions), and only falls back to the Wikipedia lookup if those return
 * nothing. Cache hits return instantly; the network lookup is debounced so
 * typing a destination doesn't fire a request per key.
 */
export function useDestinationPhoto(photoUrl?: string, destination?: string): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (photoUrl) return photoUrl;
    if (destination) {
      const cached = getCachedDestinationPhotos(destination);
      if (cached?.length) return cached[0];
      return getCachedDestinationPhoto(destination) ?? null;
    }
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

    const cachedMulti = getCachedDestinationPhotos(query);
    if (cachedMulti?.length) {
      setUrl(cachedMulti[0]);
      return;
    }
    const cachedWiki = getCachedDestinationPhoto(query);
    if (cachedWiki) {
      setUrl(cachedWiki);
      return;
    }

    // Keep the current image while we look up a new one (avoids flicker), then
    // fetch after a short pause so mid-typing keystrokes don't each hit the API.
    let cancelled = false;
    const timer = setTimeout(async () => {
      const photos = await fetchDestinationPhotos(query);
      if (cancelled) return;
      if (photos.length) {
        setUrl(photos[0]);
        return;
      }
      const wiki = await fetchDestinationPhoto(query);
      if (!cancelled) setUrl(wiki);
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photoUrl, destination]);

  return url;
}
