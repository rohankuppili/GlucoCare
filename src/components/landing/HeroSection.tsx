import { motion } from 'framer-motion';
import { Heart, Activity, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8"
          >
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">Trusted by 10,000+ Patients & Families</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          >
            Smart Diabetes Care
            <br />
            <span className="text-gradient-primary">Made Simple</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-elderly-base text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            An elderly-friendly platform designed to help you, your family, and your doctor 
            work together for better diabetes management. Easy to use, always secure.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button variant="hero" size="xl" onClick={onGetStarted}>
              Get Started Free
            </Button>
            <Button variant="outline" size="xl">
              Watch Demo
            </Button>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { icon: Activity, label: 'Real-time Tracking', description: 'Monitor glucose 24/7' },
              { icon: Shield, label: 'Secure & Private', description: 'Bank-grade security' },
              { icon: Users, label: 'Family Connected', description: 'Stay informed together' },
              { icon: Heart, label: 'Doctor Approved', description: 'Clinical-grade insights' },
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="glass-card p-6 text-center hover:shadow-glow transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{feature.label}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
