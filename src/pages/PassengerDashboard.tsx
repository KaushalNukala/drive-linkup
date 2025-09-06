import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Trip, Booking } from '@/types';
import { 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  DollarSign,
  MessageSquare,
  Navigation,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function PassengerDashboard() {
  const { profile, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchBookings();
    }
  }, [profile]);

  const fetchBookings = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        trips(
          *,
          profiles:driver_id(full_name, phone)
        )
      `)
      .eq('passenger_id', profile.user_id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setBookings(data);
    }
    setLoading(false);
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    
    if (error) {
      toast.error('Failed to cancel booking');
    } else {
      toast.success('Booking cancelled');
      fetchBookings();
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
      toast.error('Please sign in to share location');
      return;
    }

    setIsSharing(true);
    
    const updateLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      try {
        const { error } = await supabase
          .from('passenger_locations')
          .insert({
            passenger_id: user?.id,
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

  const handleSearch = () => {
    if (searchFrom && searchTo) {
      const params = new URLSearchParams({
        from: searchFrom,
        to: searchTo
      });
      window.location.href = `/search?${params.toString()}`;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'rejected':
        return 'bg-destructive text-destructive-foreground';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTripStatusColor = (status: string) => {
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
            <h1 className="text-3xl font-bold">Passenger Dashboard</h1>
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
            
            <Link to="/map">
              <Button variant="outline">
                <Navigation className="h-4 w-4 mr-2" />
                Live Map
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="hero">
                <Search className="h-4 w-4 mr-2" />
                Find Rides
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Quick Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter starting point"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter destination"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleSearch}
                  className="w-full"
                  disabled={!searchFrom || !searchTo}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Rides
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Bookings</p>
                  <p className="text-2xl font-bold text-primary">
                    {bookings.filter(b => b.status === 'accepted' && (b as any).trips?.status === 'active').length}
                  </p>
                </div>
                <Navigation className="h-8 w-8 text-primary" />
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
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              My Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start by searching for rides that match your route
                  </p>
                  <Link to="/search">
                    <Button variant="hero">
                      <Search className="h-4 w-4 mr-2" />
                      Find Your First Ride
                    </Button>
                  </Link>
                </div>
              ) : (
                bookings.map((booking) => {
                  const trip = (booking as any).trips;
                  const driver = trip?.profiles;
                  const { date, time } = formatDateTime(trip?.departure_time || '');
                  
                  return (
                    <Card key={booking.id} className="border-border">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3">
                            <Badge className={getBookingStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            {trip?.status && (
                              <Badge variant="outline" className={getTripStatusColor(trip.status)}>
                                Trip {trip.status}
                              </Badge>
                            )}
                          </div>
                          {trip?.price_per_seat && (
                            <div className="flex items-center text-lg font-semibold text-primary">
                              <DollarSign className="h-4 w-4" />
                              {trip.price_per_seat * booking.seats_requested}
                            </div>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold mb-1">Route</h4>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{trip?.start_location} → {trip?.destination}</span>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-1">Schedule</h4>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{date} at {time}</span>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-1">Seats Booked</h4>
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{booking.seats_requested} seat{booking.seats_requested > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {driver && (
                              <div>
                                <h4 className="font-semibold mb-1">Driver</h4>
                                <p className="text-sm">{driver.full_name}</p>
                                {booking.status === 'accepted' && driver.phone && (
                                  <p className="text-sm text-muted-foreground">{driver.phone}</p>
                                )}
                              </div>
                            )}

                            {booking.message && (
                              <div>
                                <h4 className="font-semibold mb-1">Your Message</h4>
                                <p className="text-sm text-muted-foreground">{booking.message}</p>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              {booking.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => cancelBooking(booking.id)}
                                  className="flex-1"
                                >
                                  Cancel Request
                                </Button>
                              )}
                              
                              {booking.status === 'accepted' && trip && (
                                <Link to={`/trip/${trip.id}`} className="flex-1">
                                  <Button size="sm" className="w-full">
                                    View Trip Details
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
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
  );
}