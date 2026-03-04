import React, { useState } from "react";
import { User, Edit2, Mail, Phone, Calendar, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoleBasedAuth } from "@/hooks/useRoleBasedAuth";
import { getUserProfile } from "@/lib/roles";
import { format } from "date-fns";

interface UserProfileCardProps {
  onEdit?: () => void;
  showEditButton?: boolean;
}

export default function UserProfileCard({ 
  onEdit, 
  showEditButton = true 
}: UserProfileCardProps) {
  const { user, role, loading } = useRoleBasedAuth();
  const [profile, setProfile] = useState<any>(null);

  // Get user profile on mount
  React.useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setProfile);
    }
  }, [user]);

  if (loading || !profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "patient":
        return "default";
      case "doctor":
        return "secondary";
      case "family":
        return "outline";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "patient":
        return "Patient";
      case "doctor":
        return "Doctor";
      case "family":
        return "Family Member";
      default:
        return role;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Profile</CardTitle>
          {showEditButton && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="text-lg">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="text-xl font-semibold">
              {profile.firstName} {profile.lastName}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={getRoleBadgeVariant(profile.role)}>
                <Shield className="w-3 h-3 mr-1" />
                {getRoleLabel(profile.role)}
              </Badge>
              {profile.onboarded && (
                <Badge variant="secondary" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{profile.phone}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date of Birth</p>
                <p className="text-sm text-muted-foreground">
                  {profile.dob ? format(new Date(profile.dob), "MMM dd, yyyy") : "Not set"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {profile.uid.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific information */}
        {profile.patientId && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Patient ID</p>
            <Badge variant="outline" className="font-mono">
              {profile.patientId}
            </Badge>
          </div>
        )}

        {profile.doctorId && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Doctor ID</p>
            <Badge variant="outline" className="font-mono">
              {profile.doctorId}
            </Badge>
          </div>
        )}

        {profile.primaryPatientId && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Primary Patient ID</p>
            <Badge variant="outline" className="font-mono">
              {profile.primaryPatientId}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
