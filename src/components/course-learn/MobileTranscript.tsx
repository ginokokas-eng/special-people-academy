import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TranscriptTab } from './TranscriptTab';
import { formatTime } from './useLearnerPrefs';
import type { LessonTranscript, MediaController } from './types';

interface Props {
  transcript: LessonTranscript | null;
  loading: boolean;
  canSeek: boolean;
  controllerRef: React.MutableRefObject<MediaController | null>;
  lessonTitle?: string;
  /** Allow learners to download the transcript as a text file. */
  allowDownload?: boolean;
}

function buildPlainText(transcript: LessonTranscript): string {
  if (transcript.segments && transcript.segments.length > 0) {
    return transcript.segments
      .map((s) => `[${formatTime(s.start)}] ${s.text}`)
      .join('\n');
  }
  return transcript.transcript_text ?? '';
}

export function MobileTranscript({
  transcript,
  loading,
  canSeek,
  controllerRef,
  lessonTitle,
  allowDownload = true,
}: Props) {
  const [currentTime, setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);

  // Poll the player position so the active segment stays highlighted.
  useEffect(() => {
    if (!canSeek) return;
    const id = setInterval(() => {
      setCurrentTime(controllerRef.current?.getCurrentTime?.() ?? 0);
    }, 500);
    return () => clearInterval(id);
  }, [canSeek, controllerRef]);

  const hasContent =
    !!transcript &&
    (!!transcript.transcript_text || (transcript.segments?.length ?? 0) > 0);

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(buildPlainText(transcript));
      setCopied(true);
      toast.success('Transcript copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy transcript');
    }
  };

  const handleDownload = () => {
    if (!transcript) return;
    const text = buildPlainText(transcript);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (lessonTitle || 'lesson').replace(/[^\w\d-]+/g, '-').toLowerCase();
    a.href = url;
    a.download = `transcript-${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {hasContent && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1.5 h-4 w-4 text-status-success-foreground" />
            ) : (
              <Copy className="mr-1.5 h-4 w-4" />
            )}
            Copy
          </Button>
          {allowDownload && (
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
          )}
        </div>
      )}
      <TranscriptTab
        transcript={transcript}
        loading={loading}
        canSeek={canSeek}
        controllerRef={controllerRef}
        currentTime={currentTime}
      />
    </div>
  );
}
