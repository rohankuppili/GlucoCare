import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleGoogleSignIn } from "@/lib/auth-helpers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const Login = () => {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // For login, we'll just use the basic Google sign-in
      // The role selection will happen during onboarding
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Signed in successfully!");
    } catch (error: any) {
      console.error("Google sign in error:", error);
      toast.error(error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null; // Navigating via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card variant="glass" className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to GlucoCare</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGoogleSignIn} 
            className="w-full" 
            variant="hero"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              "Sign in with Google"
            )}
          </Button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto font-semibold"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
