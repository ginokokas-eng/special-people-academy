import { cn } from '@/lib/utils';
import { Loader2 } from '@/components/icons';
import { useSignedMediaUrl } from '@/hooks/useSignedMediaUrl';
import type { MediaRef } from './types';

interface Props {
  media?: MediaRef | null;
  alt: string;
  className?: string;
  /** Text shown when there is nothing to display. */
  emptyLabel?: string;
}

/**
 * An <img> for a MediaRef. Storage refs are shown through a short-lived signed
 * URL; a load failure re-signs once (URLs expire on long-open lessons).
 *
 * The element is keyed by object PATH, never by the signed URL, so re-signing
 * does not remount the image and re-download it.
 */
export function SignedImage({ media, alt, className, emptyLabel = 'No image added yet.' }: Props) {
  const { url, loading, error, refresh } = useSignedMediaUrl(media);

  if (loading && !url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading image</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground">
        {error ? 'This image could not be loaded.' : emptyLabel}
      </div>
    );
  }

  return (
    <img
      key={media?.path || 'external'}
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (!error) refresh();
      }}
      className={cn('mx-auto w-full object-contain', className)}
    />
  );
}
