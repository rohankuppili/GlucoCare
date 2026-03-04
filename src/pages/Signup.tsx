import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Users, Stethoscope, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserRole } from "@/types/roles";
import LoginForm from "@/components/auth/LoginForm";

type SignupView = "role-select" | "login" | "loading" | "success";

export default function Signup() {
  const [view, setView] = useState<SignupView>("role-select");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setView("login");
  };

  const handleBack = () => {
    if (view === "login") {
      setView("role-select");
      setSelectedRole(null);
      setError(null);
    }
  };

  const handleLogin = async () => {
    setView("loading");
    setError(null);
    
    try {
      // The actual authentication will be handled by the LoginForm component
      // This will trigger the Google sign-in flow
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate loading
      setView("success");
    } catch (err) {
      setError("Failed to sign in. Please try again.");
      setView("login");
    }
  };

  if (view === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card variant="glass" className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to GlucoCare!</h2>
              <p className="text-muted-foreground mb-6">
                Your account has been created successfully. You will be redirected to complete your profile setup.
              </p>
              <Button 
                onClick={() => window.location.href = "/role-setup"}
                className="w-full"
              >
                Continue Setup
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Creating your account...</h2>
          <p className="text-muted-foreground">Please wait while we set up your profile</p>
        </motion.div>
      </div>
    );
  }

  if (view === "login" && selectedRole) {
    return (
      <LoginForm
        role={selectedRole}
        onBack={handleBack}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold">Join GlucoCare</CardTitle>
            <p className="text-lg text-muted-foreground">
              Start managing your diabetes care journey today
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              className="w-full h-24 flex-col gap-3 p-4 hover:bg-primary/5 transition-colors"
              onClick={() => handleRoleSelect("patient")}
            >
              <User className="w-10 h-10 text-primary" />
              <div className="text-center">
                <span className="font-semibold text-lg">Patient</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your glucose readings and health data
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-24 flex-col gap-3 p-4 hover:bg-accent/5 transition-colors"
              onClick={() => handleRoleSelect("family")}
            >
              <Users className="w-10 h-10 text-accent" />
              <div className="text-center">
                <span className="font-semibold text-lg">Family Member / Caretaker</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitor a patient's data with their Patient ID
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-24 flex-col gap-3 p-4 hover:bg-success/5 transition-colors"
              onClick={() => handleRoleSelect("doctor")}
            >
              <Stethoscope className="w-10 h-10 text-success" />
              <div className="text-center">
                <span className="font-semibold text-lg">Doctor</span>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage multiple patients
                </p>
              </div>
            </Button>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => window.location.href = "/login"}
                >
                  Sign in
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
