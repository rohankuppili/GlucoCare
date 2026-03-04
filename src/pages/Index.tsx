import { useMemo, useState } from 'react';
import { UserRole } from '@/types';
import HeroSection from '@/components/landing/HeroSection';
import RoleSelector from '@/components/landing/RoleSelector';
import FeaturesSection from '@/components/landing/FeaturesSection';
import LoginForm from '@/components/auth/LoginForm';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import FamilyDashboard from '@/components/dashboard/FamilyDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthWithRole } from '@/contexts/AuthContext';
import RoleSetup from '@/pages/RoleSetup';
import { getUserProfile, setUserProfile } from '@/lib/roles';

type AppView = 'landing' | 'login' | 'dashboard';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { user, profile, loading: authLoading, refreshProfile } = useAuthWithRole();

  const effectiveRole: UserRole | null = useMemo(() => {
    return (profile?.role as UserRole | undefined) ?? selectedRole;
  }, [profile?.role, selectedRole]);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentView('login');
  };

  const handleLogin = async () => {
    if (!selectedRole) return;

    const signedInUser = user ?? (await signInWithPopup(auth, googleProvider)).user;

    // Ensure a user profile exists so onboarding state is authoritative in Firestore.
    const existing = await getUserProfile(signedInUser.uid);
    if (!existing) {
      const displayParts = (signedInUser.displayName || "").split(" ");
      const firstName = displayParts[0] || "";
      const lastName = displayParts.slice(1).join(" ") || "";

      await setUserProfile(signedInUser.uid, {
        email: signedInUser.email || "",
        firstName,
        lastName,
        dob: "",
        phone: "",
        displayName: signedInUser.displayName || undefined,
        photoURL: signedInUser.photoURL || undefined,
        role: selectedRole,
        onboarded: false,
      });
    }

    await refreshProfile();
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setSelectedRole(null);
    setCurrentView('landing');
  };

  const handleGetStarted = () => {
    document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
    setCurrentView('landing');
  };

  // Render login form
  if (currentView === 'login' && selectedRole) {
    return (
      <LoginForm
        role={selectedRole}
        onBack={handleBackToRoles}
        onLogin={handleLogin}
      />
    );
  }

  if (user && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Onboarding gate: if authenticated but not onboarded, show role setup flow.
  if (user && (!profile || !profile.onboarded)) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <RoleSetup
          initialRole={effectiveRole}
          onComplete={async () => {
            await refreshProfile();
            setCurrentView('dashboard');
          }}
        />
      </div>
    );
  }

  // Render dashboard based on role
  if (currentView === 'dashboard' && !!user && effectiveRole) {
    switch (effectiveRole) {
      case 'patient':
        return <PatientDashboard onLogout={handleLogout} />;
      case 'family':
        return <FamilyDashboard onLogout={handleLogout} />;
      case 'doctor':
        return <DoctorDashboard onLogout={handleLogout} />;
    }
  }

  // Render landing page
  return (
    <div className="min-h-screen">
      <HeroSection onGetStarted={handleGetStarted} />
      <RoleSelector onSelectRole={handleSelectRole} />
      <FeaturesSection />
      
      {/* Footer */}
      <footer className="py-12 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">G</span>
            </div>
            <span className="text-2xl font-bold">GlucoCare</span>
          </div>
          <p className="text-muted-foreground mb-4">
            Smart Diabetes Management for a Healthier Life
          </p>
          <p className="text-sm text-muted-foreground">
            © 2024 GlucoCare. Made with ❤️ for elderly care.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
