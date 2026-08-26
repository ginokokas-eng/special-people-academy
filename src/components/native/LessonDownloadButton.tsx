import { DownloadControl } from '@/components/native/DownloadControl';
import { useOfflineLesson } from '@/hooks/useOfflineLesson';
import { formatBytes } from '@/lib/offline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * The download affordance for one lesson. Renders nothing outside the shell —
 * a browser has nowhere to put the bytes, and an inert button would be a lie.
 *
 * Wifi-only is the default, so on mobile data the tap opens a confirm rather
 * than silently spending the learner's data.
 */
export function LessonDownloadButton({
  lessonId,
  courseId,
  path,
  sizeBytes,
}: {
  lessonId: string;
  courseId: string;
  /** Storage path of the lesson's media; null when there is nothing to cache. */
  path: string | null;
  sizeBytes?: number;
}) {
  const offline = useOfflineLesson(lessonId, courseId, path);
  if (!offline.supported || !path) return null;

  return (
    <>
      <DownloadControl
        variant="icon"
        state={offline.state}
        progress={offline.progress}
        sizeLabel={sizeBytes ? formatBytes(sizeBytes) : ''}
        onToggle={() => void offline.toggle()}
      />

      <AlertDialog open={offline.confirmMobileData} onOpenChange={(o) => !o && offline.dismissConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Download{sizeBytes ? ` ${formatBytes(sizeBytes)}` : ''} on mobile data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have “download over wifi only” switched on. This lesson will use your mobile
              data allowance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wait for wifi</AlertDialogCancel>
            <AlertDialogAction onClick={() => void offline.confirmAndStart()}>
              Download now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
