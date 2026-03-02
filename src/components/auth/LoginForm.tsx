import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Stethoscope, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/types';

interface LoginFormProps {
  role: UserRole;
  onBack: () => void;
  onLogin: () => void;
}

const LoginForm = ({ role, onBack, onLogin }: LoginFormProps) => {
  const roleConfig = {
    patient: {
      title: 'Patient Login',
      description: 'Access your personal health dashboard',
      icon: User,
      color: 'bg-primary',
    },
    family: {
      title: 'Family/Caregiver Access',
      description: 'View your loved one\'s health data',
      icon: Heart,
      color: 'bg-accent',
    },
    doctor: {
      title: 'Doctor Login',
      description: 'Access your patient management dashboard',
      icon: Stethoscope,
      color: 'bg-success',
    },
  };

  const config = roleConfig[role];

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
            <div className="space-y-6">
              <Button onClick={onLogin} variant="hero" className="w-full" size="xl">
                Continue with Google
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                We use Google Sign-In to securely access your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginForm;
