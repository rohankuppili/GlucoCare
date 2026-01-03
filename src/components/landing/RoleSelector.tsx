import { motion } from 'framer-motion';
import { User, Users, Stethoscope, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { UserRole } from '@/types';

interface RoleSelectorProps {
  onSelectRole: (role: UserRole) => void;
}

const roles = [
  {
    id: 'patient' as UserRole,
    title: 'I am a Patient',
    description: 'Track your glucose, medications, and get personalized health insights',
    icon: User,
    features: ['Blood glucose tracking', 'Medication reminders', 'Health insights', 'Emergency SOS'],
    color: 'from-primary to-primary-dark',
    bgColor: 'bg-primary/5',
  },
  {
    id: 'family' as UserRole,
    title: 'I am Family/Caregiver',
    description: 'Stay connected with your loved one\'s health journey',
    icon: Users,
    features: ['View health trends', 'Emergency alerts', 'Health summaries', 'Find nearby care'],
    color: 'from-accent to-accent/80',
    bgColor: 'bg-accent/5',
  },
  {
    id: 'doctor' as UserRole,
    title: 'I am a Doctor',
    description: 'Manage your patients with comprehensive analytics and tools',
    icon: Stethoscope,
    features: ['Patient dashboard', 'Prescriptions', 'Long-term analytics', 'Clinical reports'],
    color: 'from-success to-success/80',
    bgColor: 'bg-success/5',
  },
];

const RoleSelector = ({ onSelectRole }: RoleSelectorProps) => {
  return (
    <section className="py-20 bg-background" id="get-started">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Role</h2>
          <p className="text-elderly-base text-muted-foreground max-w-2xl mx-auto">
            Select how you'll be using GlucoCare to get a personalized experience
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                variant="elevated"
                className={`relative overflow-hidden cursor-pointer group h-full ${role.bgColor}`}
                onClick={() => onSelectRole(role.id)}
              >
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${role.color}`} />
                
                <div className="p-8">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <role.icon className="w-8 h-8 text-primary-foreground" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl font-bold mb-3">{role.title}</h3>
                  <p className="text-muted-foreground mb-6">{role.description}</p>

                  {/* Features list */}
                  <ul className="space-y-3 mb-8">
                    {role.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all duration-300">
                    <span>Continue as {role.id === 'patient' ? 'Patient' : role.id === 'family' ? 'Caregiver' : 'Doctor'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoleSelector;
