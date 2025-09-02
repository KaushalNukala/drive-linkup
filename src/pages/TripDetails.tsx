import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapComponent } from '@/components/map/MapComponent';
import { supabase } from '@/integrations/supabase/client';
import { Trip, Booking } from '@/types';
import { 
  MapPin, 
  Clock, 
  Users, 
  IndianRupee,
  User,
  Phone,
  MessageSquare,
  Navigation,
  ArrowLeft,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { formatINR } from '@/lib/utils';

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(searchParams.get('book') === 'true');
  
  const [bookingForm, setBookingForm] = useState({
    seats: 1,
    message: ''
  });

  useEffect(() => {
    if (id) {
      fetchTripDetails();
    }
  }, [id]);

  useEffect(() => {
    const fetchExisting = async () => {
      if (!id || !user) return;
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', id)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });
      const existing = (data || []).find(b => b.status === 'pending' || b.status === 'accepted') || null;
      setExistingBooking(existing);
    };
    fetchExisting();
  }, [id, user]);

  const fetchTripDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    
    // Fetch trip details with driver info
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          phone,
          avatar_url,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (tripError) {
      console.error('Trip fetch error:', tripError);
      toast.error('Trip not found');
      navigate('/search');
      return;
    }

    setTrip(tripData);
    setDriver(tripData.profiles);

    // Fetch bookings for this trip (if user is the driver)
    if (user && tripData.driver_id === user.id) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:passenger_id (
            full_name,
            phone,
            email
          )
        `)
        .eq('trip_id', id)
        .order('created_at', { ascending: false });
      
      if (bookingsData) {
        setBookings(bookingsData);
      }
    }
    
    setLoading(false);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !trip) {
      toast.error('You must be logged in to book a trip');
      return;
    }

    if (trip.driver_id === user.id) {
      toast.error("You can't book your own trip");
      return;
    }

    if (bookingForm.seats > trip.available_seats) {
      toast.error('Not enough seats available');
      return;
    }

    setBookingLoading(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .insert([{
          trip_id: trip.id,
          passenger_id: user.id,
          seats_requested: bookingForm.seats,
          message: bookingForm.message || null,
          status: 'pending'
        }]);

      if (error) {
        throw error;
      }

      toast.success('Booking request sent successfully!');
      setShowBookingForm(false);
      setBookingForm({ seats: 1, message: '' });
      setExistingBooking({
        id: 'temp',
        trip_id: trip.id,
        passenger_id: user.id,
        seats_requested: bookingForm.seats,
        status: 'pending',
        message: bookingForm.message || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Booking);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send booking request');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
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
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
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

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Trip not found</h2>
          <p className="text-muted-foreground mb-4">The trip you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  const { date, time } = formatDateTime(trip.departure_time);
  const isDriver = user?.id === trip.driver_id;
  const canBook = user && !isDriver && trip.status === 'scheduled' && trip.available_seats > 0 && !existingBooking;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Trip Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-2">Trip Details</CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(trip.status)}>
                        {trip.status}
                      </Badge>
                      {trip.price_per_seat && (
                        <div className="flex items-center text-xl font-bold text-primary">
                          <IndianRupee className="h-5 w-5" />
                          {formatINR(Number(trip.price_per_seat))}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            per seat
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Route */}
                <div>
                  <h4 className="font-semibold mb-3">Route</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-primary"></div>
                      <div>
                        <p className="font-medium">Starting Point</p>
                        <p className="text-sm text-muted-foreground">{trip.start_location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-secondary"></div>
                      <div>
                        <p className="font-medium">Destination</p>
                        <p className="text-sm text-muted-foreground">{trip.destination}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule & Availability */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Schedule</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">{time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{date}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Availability</h4>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''} available
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {trip.description && (
                  <div>
                    <h4 className="font-semibold mb-3">Trip Notes</h4>
                    <p className="text-muted-foreground">{trip.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Route Map
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MapComponent
                  className="h-96 rounded-b-lg"
                  selectedTrip={trip}
                  showDrivers={trip.status === 'active'}
                  center={trip.start_lat && trip.start_lng ? [trip.start_lat, trip.start_lng] : undefined}
                />
              </CardContent>
            </Card>

            {/* Driver's Bookings (only visible to driver) */}
            {isDriver && bookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Passenger Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">{(booking as any).profiles?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.seats_requested} seat{booking.seats_requested > 1 ? 's' : ''}
                              </p>
                            </div>
                            <Badge className={getBookingStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>
                          
                          {booking.message && (
                            <p className="text-sm text-muted-foreground mb-3">
                              "{booking.message}"
                            </p>
                          )}
                          
                          {booking.status === 'accepted' && (booking as any).profiles?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{(booking as any).profiles.phone}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Driver Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Driver
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    {driver?.avatar_url ? (
                      <img 
                        src={driver.avatar_url} 
                        alt={driver.full_name} 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <h3 className="font-semibold">{driver?.full_name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">Verified Driver</p>
                  
                  <div className="flex justify-center mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  {user && trip.status === 'active' && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Contact Driver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Booking Form */}
            {canBook && (
              <Card>
                <CardHeader>
                  <CardTitle>Book This Trip</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showBookingForm ? (
                    <div className="text-center space-y-4">
                      <div className="text-2xl font-bold text-primary">
                        {trip.price_per_seat ? formatINR(Number(trip.price_per_seat) * bookingForm.seats) : 'Free'}
                      </div>
                      <Button 
                        onClick={() => setShowBookingForm(true)}
                        className="w-full"
                        variant="hero"
                      >
                        Request to Join
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="seats">Number of Seats</Label>
                        <Input
                          id="seats"
                          type="number"
                          min="1"
                          max={trip.available_seats}
                          value={bookingForm.seats}
                          onChange={(e) => setBookingForm(prev => ({ 
                            ...prev, 
                            seats: parseInt(e.target.value) || 1 
                          }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Message (optional)</Label>
                        <Textarea
                          id="message"
                          placeholder="Add a message to the driver..."
                          value={bookingForm.message}
                          onChange={(e) => setBookingForm(prev => ({ 
                            ...prev, 
                            message: e.target.value 
                          }))}
                          rows={3}
                        />
                      </div>

                      <div className="text-center py-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-xl font-bold text-primary">
                          {trip.price_per_seat ? formatINR(Number(trip.price_per_seat) * bookingForm.seats) : 'Free'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowBookingForm(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={bookingLoading}
                          className="flex-1"
                          variant="hero"
                        >
                          {bookingLoading ? 'Sending...' : 'Send Request'}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sign in to book */}
            {!user && (
              <Card>
                <CardContent className="text-center p-6">
                  <h3 className="font-semibold mb-2">Want to join this trip?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to send a booking request to the driver
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Sign In to Book
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}