import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, 
  MapPin, 
  Calendar, 
  Car, 
  Shield, 
  MessageCircle,
  Phone,
  Award
} from 'lucide-react';
import { Profile } from '@/types';

interface EnhancedDriverProfileProps {
  driver: Profile;
  onContact: () => void;
  showContactButton?: boolean;
}

export const EnhancedDriverProfile: React.FC<EnhancedDriverProfileProps> = ({
  driver,
  onContact,
  showContactButton = true
}) => {
  // Mock data for demo - in real app this would come from database
  const driverStats = {
    rating: 4.8,
    totalTrips: 245,
    yearsExperience: 3,
    verified: true,
    carModel: "Toyota Camry 2020",
    completionRate: 98
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={driver.avatar_url} />
              <AvatarFallback className="text-lg">
                {driver.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="flex items-center gap-2">
                {driver.full_name}
                {driverStats.verified && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{driverStats.rating}</span>
                  <span className="text-muted-foreground">({driverStats.totalTrips} trips)</span>
                </div>
              </div>
            </div>
          </div>
          
          {showContactButton && (
            <div className="flex gap-2">
              {driver.phone && (
                <Button variant="outline" size="sm" onClick={() => window.open(`tel:${driver.phone}`)}>
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onContact}>
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Car className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm font-medium">{driverStats.carModel}</div>
            <div className="text-xs text-muted-foreground">Vehicle</div>
          </div>
          
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm font-medium">{driverStats.yearsExperience} Years</div>
            <div className="text-xs text-muted-foreground">Experience</div>
          </div>
          
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm font-medium">{driverStats.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Completion</div>
          </div>
          
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm font-medium">{driverStats.totalTrips}</div>
            <div className="text-xs text-muted-foreground">Total Trips</div>
          </div>
        </div>

        {driver.phone && (
          <div className="text-sm text-muted-foreground">
            <strong>Phone:</strong> {driver.phone}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground mt-2">
          <strong>Member since:</strong> {new Date(driver.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};