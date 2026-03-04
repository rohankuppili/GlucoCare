import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteUser } from "firebase/auth";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { auth } from "@/lib/firebase";
import { deleteUserData } from "@/lib/roles";
import { toast } from "sonner";

export default function DeleteAccountButton({
  variant = "destructive",
  size = "default",
  iconOnly = false,
  className,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("No signed-in user found.");
      return;
    }

    setLoading(true);
    try {
      await deleteUserData(currentUser.uid);
      await deleteUser(currentUser);
      toast.success("Account deleted permanently.");
      navigate("/");
    } catch (error: unknown) {
      console.error("Delete account error:", error);
      const code = (error as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        toast.error("Please sign in again, then retry account deletion.");
      } else {
        toast.error("Failed to delete account permanently.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={loading}>
          {loading ? (
            <Loader2 className={`w-4 h-4 animate-spin ${iconOnly ? "" : "mr-2"}`} />
          ) : (
            <Trash2 className={`w-4 h-4 ${iconOnly ? "" : "mr-2"}`} />
          )}
          {iconOnly ? "" : "Delete Account"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Account Permanently?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and linked role data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Permanently"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
