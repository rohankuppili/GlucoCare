import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Lock, ArrowLeft, Heart, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/types';

interface LoginFormProps {
  role: UserRole;
  onBack: () => void;
  onLogin: (credentials: { id: string; password: string; patientId?: string }) => void;
}

const LoginForm = ({ role, onBack, onLogin }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    patientId: '', // For family access
  });

  const roleConfig = {
    patient: {
      title: 'Patient Login',
      description: 'Access your personal health dashboard',
      idLabel: 'Patient ID',
      idPlaceholder: 'PAT-2024-001',
      icon: User,
      color: 'bg-primary',
    },
    family: {
      title: 'Family/Caregiver Access',
      description: 'View your loved one\'s health data',
      idLabel: 'Patient ID',
      idPlaceholder: 'Enter patient\'s ID',
      icon: Heart,
      color: 'bg-accent',
    },
    doctor: {
      title: 'Doctor Login',
      description: 'Access your patient management dashboard',
      idLabel: 'Doctor ID',
      idPlaceholder: 'DOC-2024-001',
      icon: User,
      color: 'bg-success',
    },
  };

  const config = roleConfig[role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-6">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Role Selection
        </Button>

        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${config.color} flex items-center justify-center`}>
              <config.icon className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">{config.title}</CardTitle>
            <CardDescription className="text-lg">{config.description}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ID Field */}
              <div className="space-y-2">
                <Label htmlFor="id" className="text-lg font-medium">
                  {config.idLabel}
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="id"
                    type="text"
                    placeholder={config.idPlaceholder}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="pl-12 h-14 text-lg rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-lg font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-12 pr-12 h-14 text-lg rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Family Access Key - Only for family role */}
              {role === 'family' && (
                <div className="space-y-2">
                  <Label htmlFor="accessKey" className="text-lg font-medium">
                    Access Key (from Patient)
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="accessKey"
                      type="text"
                      placeholder="Enter 6-digit access key"
                      value={formData.patientId}
                      onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      className="pl-12 h-14 text-lg rounded-xl"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask the patient for their access key to view their health data
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" variant="hero" className="w-full" size="xl">
                Sign In
              </Button>

              {/* Demo credentials hint */}
              <div className="mt-6 p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-2">Demo Credentials</p>
                <p className="text-sm font-medium">
                  ID: {config.idPlaceholder} | Password: demo123
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginForm;
