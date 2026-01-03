import { useState } from 'react';
import { UserRole } from '@/types';
import HeroSection from '@/components/landing/HeroSection';
import RoleSelector from '@/components/landing/RoleSelector';
import FeaturesSection from '@/components/landing/FeaturesSection';
import LoginForm from '@/components/auth/LoginForm';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import FamilyDashboard from '@/components/dashboard/FamilyDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';

type AppView = 'landing' | 'login' | 'dashboard';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentView('login');
  };

  const handleLogin = (credentials: { id: string; password: string }) => {
    // Demo login - in production, this would validate against a backend
    console.log('Login attempt:', credentials);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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

  // Render dashboard based on role
  if (currentView === 'dashboard' && isAuthenticated && selectedRole) {
    switch (selectedRole) {
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
