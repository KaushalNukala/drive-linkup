import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, 
  Clock, 
  Users, 
  DollarSign,
  Car,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function CreateTrip() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    startLocation: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    availableSeats: 1,
    pricePerSeat: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast.error('You must be logged in to create a trip');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const departureDateTime = new Date(`${formData.departureDate}T${formData.departureTime}`);
      
      // Check if the date/time is in the future
      if (departureDateTime <= new Date()) {
        toast.error('Departure time must be in the future');
        setLoading(false);
        return;
      }

      const tripData = {
        driver_id: profile.user_id,
        start_location: formData.startLocation,
        destination: formData.destination,
        departure_time: departureDateTime.toISOString(),
        available_seats: formData.availableSeats,
        price_per_seat: formData.pricePerSeat ? parseFloat(formData.pricePerSeat) : null,
        description: formData.description || null,
        status: 'scheduled' as const
      };

      const { data, error } = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Trip created successfully!');
      navigate('/driver-dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  
  // Set minimum time if selected date is today
  const minTime = formData.departureDate === today 
    ? new Date().toTimeString().slice(0, 5) 
    : '';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Trip</h1>
            <p className="text-muted-foreground">
              Share your journey and connect with passengers traveling your route
            </p>
          </div>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Route Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startLocation">Starting Point *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="startLocation"
                        placeholder="Enter starting location"
                        value={formData.startLocation}
                        onChange={(e) => handleInputChange('startLocation', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="destination"
                        placeholder="Enter destination"
                        value={formData.destination}
                        onChange={(e) => handleInputChange('destination', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="departureDate">Departure Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="departureDate"
                        type="date"
                        min={today}
                        value={formData.departureDate}
                        onChange={(e) => handleInputChange('departureDate', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departureTime">Departure Time *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="departureTime"
                        type="time"
                        min={minTime}
                        value={formData.departureTime}
                        onChange={(e) => handleInputChange('departureTime', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Seats and Price */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availableSeats">Available Seats *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="availableSeats"
                        type="number"
                        min="1"
                        max="8"
                        value={formData.availableSeats}
                        onChange={(e) => handleInputChange('availableSeats', parseInt(e.target.value))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pricePerSeat">Price per Seat (optional)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="pricePerSeat"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.pricePerSeat}
                        onChange={(e) => handleInputChange('pricePerSeat', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any additional information about your trip, preferences, or requirements..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Trip Preview */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Trip Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>
                          {formData.startLocation || 'Starting point'} → {formData.destination || 'Destination'}
                        </span>
                      </div>
                      
                      {formData.departureDate && formData.departureTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>
                            {new Date(`${formData.departureDate}T${formData.departureTime}`).toLocaleDateString()} at{' '}
                            {new Date(`${formData.departureDate}T${formData.departureTime}`).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{formData.availableSeats} seat{formData.availableSeats !== 1 ? 's' : ''} available</span>
                      </div>
                      
                      {formData.pricePerSeat && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span>${formData.pricePerSeat} per seat</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/driver-dashboard')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Creating Trip...' : 'Create Trip'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}