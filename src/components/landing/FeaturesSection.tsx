import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Bell, 
  Utensils, 
  Brain, 
  MapPin, 
  Calendar,
  BarChart3,
  Heart
} from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: 'Smart Glucose Tracking',
    description: 'Interactive charts showing daily, weekly, and monthly trends with color-coded risk zones.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Predictive analytics and personalized recommendations based on your unique health patterns.',
  },
  {
    icon: Utensils,
    title: 'Indian Diet Planner',
    description: 'Culturally relevant meal suggestions with glycemic load tracking and festival mode.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Medication, appointment, and health check reminders designed for elderly users.',
  },
  {
    icon: MapPin,
    title: 'Nearby Care Finder',
    description: 'Locate hospitals, diabetes clinics, pharmacies, and dieticians near you.',
  },
  {
    icon: Calendar,
    title: 'Appointment Manager',
    description: 'Schedule and track doctor visits with automatic reminder notifications.',
  },
  {
    icon: BarChart3,
    title: 'HbA1c Forecasting',
    description: 'Predict your next HbA1c results based on current glucose management.',
  },
  {
    icon: Heart,
    title: 'Complete Vitals',
    description: 'Track blood pressure, heart rate, weight, activity, and sleep patterns.',
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Powerful Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <br />
            <span className="text-gradient-primary">Manage Diabetes</span>
          </h2>
          <p className="text-elderly-base text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools designed with elderly users in mind, making health management simple and effective.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass-card p-6 hover:shadow-glow transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
