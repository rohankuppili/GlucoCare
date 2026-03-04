import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, setUserProfile } from "@/lib/roles";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { toast } from "sonner";
import type { UserProfile, UserRole } from "@/types/roles";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();

  const role = profile?.role || null;
  const isAuthenticated = !!user;
  const isOnboarded = profile?.onboarded ?? false;

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          setProfile(userProfile);
        } catch (error) {
          handleError(error, {
            showToast: false,
            fallbackMessage: "Failed to load user profile"
          });
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [handleError]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(null);
      toast.success("Signed out successfully");
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to sign out"
      });
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) {
      toast.error("No user logged in");
      return;
    }

    try {
      const mergedUpdates = { ...profile, ...updates };
      await setUserProfile(user.uid, mergedUpdates);
      
      // Refresh the profile
      const updatedProfile = await getUserProfile(user.uid);
      setProfile(updatedProfile);
      
      toast.success("Profile updated successfully");
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to update profile"
      });
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
    } catch (error) {
      handleError(error, {
        showToast: false,
        fallbackMessage: "Failed to refresh profile"
      });
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    role,
    isAuthenticated,
    isOnboarded,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for accessing auth state with role-based checks
export function useAuthWithRole() {
  const auth = useAuth();
  
  const canAccessDashboard = auth.isAuthenticated && auth.isOnboarded;
  const canAccessRoleSetup = auth.isAuthenticated && !auth.isOnboarded;
  const needsRoleSelection = auth.isAuthenticated && !auth.role;
  
  return {
    ...auth,
    canAccessDashboard,
    canAccessRoleSetup,
    needsRoleSelection,
  };
}
