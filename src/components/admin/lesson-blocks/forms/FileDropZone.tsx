import { useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload } from '@/components/icons';
import { cn } from '@/lib/utils';

interface Props {
  /** id for the hidden native input (kept for label/keyboard/screen-reader semantics). */
  inputId: string;
  inputRef: RefObject<HTMLInputElement>;
  accept: string;
  /** Visible label above the zone. */
  label: string;
  primaryText: string;
  secondaryText: string;
  uploading: boolean;
  progress: number;
  /** Name of the already-stored file, if any. */
  storedName?: string | null;
  onFile: (file: File | null) => void;
}

/**
 * Large clickable + drag-and-drop zone that fronts a visually hidden native
 * file input. All validation stays in the caller's onFile handler.
 */
export function FileDropZone({
  inputId,
  inputRef,
  accept,
  label,
  primaryText,
  secondaryText,
  uploading,
  progress,
  storedName,
  onFile,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const open = () => {
    if (!uploading) inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium leading-none">
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={uploading}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (uploading) return;
          onFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors',
          'hover:border-primary/60 hover:bg-primary/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          dragging && 'border-primary bg-primary/10',
          uploading && 'cursor-wait opacity-80'
        )}
      >
        <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{primaryText}</p>
        <p className="text-xs text-muted-foreground">{secondaryText}</p>
        <p className="text-xs text-muted-foreground">or drag and drop it here</p>

        {uploading && (
          <div className="w-full max-w-sm space-y-1 pt-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
          </div>
        )}

        {storedName && !uploading && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-success">Uploaded: {storedName}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
            >
              Replace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
