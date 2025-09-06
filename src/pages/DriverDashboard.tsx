import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trip, Booking } from '@/types';
import { 
  Plus, 
  Car, 
  MapPin, 
  Clock, 
  Users, 
  Navigation,
  Settings,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { formatINR } from '@/lib/utils';

export default function DriverDashboard() {
  const { profile, user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchTrips();
      fetchBookings();
    }
  }, [profile]);

  const fetchTrips = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', profile.user_id)
      .order('departure_time', { ascending: true });
    
    if (data) {
      setTrips(data);
    }
    setLoading(false);
  };

  const fetchBookings = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        trips!inner(
          id,
          driver_id,
          start_location,
          destination,
          departure_time,
          available_seats,
          price_per_seat,
          status
        ),
        profiles:passenger_id(full_name, phone)
      `)
      .eq('trips.driver_id', profile.user_id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setBookings(data);
    }
  };

  const startLocationSharing = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }
    if (!window.isSecureContext) {
      toast.error('Location sharing requires HTTPS. Please use a secure connection.');
      return;
    }
    if (!user?.id) {
      toast.error('Please sign in as a driver to share location');
      return;
    }

    setIsSharing(true);
    
    const updateLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      try {
        const { error } = await supabase
          .from('driver_locations')
          .insert({
            driver_id: user?.id,
            latitude,
            longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
          });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to update location:', err);
        toast.error('Failed to update location');
        setIsSharing(false);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get location');
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    toast.success('Location sharing started');
    
    // Store watch ID to stop later if needed
    (window as any).locationWatchId = watchId;
  };

  const stopLocationSharing = () => {
    if ((window as any).locationWatchId) {
      navigator.geolocation.clearWatch((window as any).locationWatchId);
      delete (window as any).locationWatchId;
    }
    setIsSharing(false);
    toast.success('Location sharing stopped');
  };

  const updateBookingStatus = async (bookingId: string, status: 'accepted' | 'rejected') => {
    try {
      setUpdatingBookingId(bookingId);
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);
      if (error) throw error;

      toast.success(`Booking ${status}!`);
      
      // Send email notification asynchronously (non-blocking)
      supabase.functions.invoke('send-booking-notification', {
        body: {
          bookingId,
          type: status === 'accepted' ? 'booking_accepted' : 'booking_rejected'
        }
      }).then(({ error: fnError }) => {
        if (fnError) {
          console.warn('Notification function error', fnError);
        }
      });
      
      fetchBookings();
    } catch (e) {
      console.error('Booking update error:', e);
      toast.error('Failed to update booking');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const deleteTrip = async (tripId: string) => {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);
    
    if (error) {
      toast.error('Failed to delete trip');
    } else {
      toast.success('Trip deleted successfully');
      fetchTrips();
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'scheduled':
        return 'bg-primary text-primary-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'rejected':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Driver Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant={isSharing ? "destructive" : "success"}
              onClick={isSharing ? stopLocationSharing : startLocationSharing}
            >
              <Navigation className="h-4 w-4 mr-2" />
              {isSharing ? 'Stop Sharing' : 'Share Location'}
            </Button>
            
            <div className="flex gap-2">
              <Link to="/create-trip">
                <Button variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Trip
                </Button>
              </Link>
              
              <Link to="/search">
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Find Rides
                </Button>
              </Link>
              
              <Link to="/map">
                <Button variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Live Map
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Trips</p>
                  <p className="text-2xl font-bold text-primary">
                    {trips.filter(t => t.status === 'active').length}
                  </p>
                </div>
                <Car className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold text-warning">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trips</p>
                  <p className="text-2xl font-bold">{trips.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* My Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                My Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {trips.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-3">No trips yet</p>
                    <Link to="/create-trip">
                      <Button variant="outline">Create Your First Trip</Button>
                    </Link>
                  </div>
                ) : (
                  trips.map((trip) => {
                    const { date, time } = formatDateTime(trip.departure_time);
                    
                    return (
                      <Card key={trip.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <Badge className={getStatusColor(trip.status)}>
                              {trip.status}
                            </Badge>
                            {trip.price_per_seat != null && (
                               <div className="flex items-center text-sm font-medium text-primary">
                                 {formatINR(Number(trip.price_per_seat))}
                               </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {trip.start_location} → {trip.destination}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{date} {time}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{trip.available_seats} seats</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Link to={`/create-trip?edit=${trip.id}`} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full">
                                <Settings className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </Link>
                            <Link to={`/trip/${trip.id}`} className="flex-1">
                              <Button size="sm" className="w-full">
                                View Details
                              </Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteTrip(trip.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Booking Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No booking requests yet</p>
                  </div>
                ) : (
                  bookings.map((booking) => {
                    const trip = (booking as any).trips;
                    const passenger = (booking as any).profiles;
                    const tripDateTime = trip ? formatDateTime(trip.departure_time) : null;
                    
                    return (
                      <Card key={booking.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">{passenger?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.seats_requested} seat{booking.seats_requested > 1 ? 's' : ''}
                              </p>
                            </div>
                            <Badge className={getBookingStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>

                          {/* Trip Details */}
                          {trip && (
                            <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm font-medium mb-2">Trip Details:</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span>{trip.start_location} → {trip.destination}</span>
                                </div>
                                {tripDateTime && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{tripDateTime.date} {tripDateTime.time}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{trip.available_seats} seats available</span>
                                  </div>
                                  {trip.price_per_seat && (
                                    <span className="font-medium text-primary">
                                      {formatINR(Number(trip.price_per_seat))} per seat
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {booking.message && (
                            <div className="mb-3">
                              <p className="text-sm font-medium mb-1">Message:</p>
                              <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded border-l-2 border-primary/20">
                                "{booking.message}"
                              </p>
                            </div>
                          )}

                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateBookingStatus(booking.id, 'rejected')}
                              className="flex-1"
                              disabled={updatingBookingId === booking.id}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => updateBookingStatus(booking.id, 'accepted')}
                              className="flex-1"
                              disabled={updatingBookingId === booking.id}
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}