import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface LargePasteWarningModalProps {
  open: boolean;
  characterCount: number;
  onConfirm: () => void;
}

export function LargePasteWarningModal({
  open,
  characterCount,
  onConfirm,
}: LargePasteWarningModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Large External Content Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              A large block of text ({characterCount.toLocaleString()} characters)
              was pasted into the editor.
            </p>
            <p>
              Please confirm this is your own work and complies with your
              assignment's academic integrity policy.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onConfirm}>
            I confirm this is my own work
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
