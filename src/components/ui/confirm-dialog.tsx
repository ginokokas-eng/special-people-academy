import { useEffect, useState } from 'react';
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

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Controlled confirmation dialog using the shadcn AlertDialog.
 * Use this instead of the native window.confirm() for destructive actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Imperative API: a drop-in async replacement for window.confirm()           */
/* -------------------------------------------------------------------------- */

type HostState = ConfirmOptions & { open: boolean };

let pushState: ((s: HostState) => void) | null = null;
let resolver: ((value: boolean) => void) | null = null;

/**
 * Show a confirmation dialog and resolve to true/false.
 * Usage: if (!(await confirmDialog({ description: 'Delete this?' }))) return;
 * Requires <ConfirmDialogHost /> mounted once near the app root.
 */
export function confirmDialog(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushState) {
      // Fallback if host isn't mounted yet.
      resolve(window.confirm(options.description || options.title || 'Are you sure?'));
      return;
    }
    resolver = resolve;
    pushState({ ...options, open: true });
  });
}

/** Mount once near the app root so confirmDialog() works everywhere. */
export function ConfirmDialogHost() {
  const [state, setState] = useState<HostState>({ open: false });

  useEffect(() => {
    pushState = setState;
    return () => {
      pushState = null;
    };
  }, []);

  const settle = (value: boolean) => {
    resolver?.(value);
    resolver = null;
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title={state.title ?? 'Are you sure?'}
      description={state.description}
      confirmLabel={state.confirmLabel ?? 'Confirm'}
      cancelLabel={state.cancelLabel ?? 'Cancel'}
      destructive={state.destructive ?? true}
      onConfirm={() => settle(true)}
    />
  );
}
