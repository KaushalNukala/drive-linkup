import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedMapComponent } from '@/components/map/EnhancedMapComponent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Trip, Profile, DriverLocation } from '@/types';
import { 
  MapPin, 
  Clock, 
  Users, 
  Search,
  Filter,
  Car,
  IndianRupee
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

export default function Map() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }, []);

  useEffect(() => {
    fetchTrips();
    
    // Subscribe to real-time trip updates
    const tripChannel = supabase
      .channel('trips-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips'
        },
        () => {
          fetchTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripChannel);
    };
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          phone
        )
      `)
      .in('status', ['scheduled', 'active'])
      .order('departure_time', { ascending: true });
    
    if (data) {
      setTrips(data);
    }
    setLoading(false);
  };

  const filteredTrips = trips.filter(trip =>
    trip.start_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Live Trip Map</h1>
          <p className="text-muted-foreground">
            See active drivers and available trips in real-time
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trip List Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Available Trips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading trips...</p>
                    </div>
                  ) : filteredTrips.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No trips found</p>
                    </div>
                  ) : (
                    filteredTrips.map((trip) => {
                      const { date, time } = formatDateTime(trip.departure_time);
                      
                      return (
                        <Card
                          key={trip.id}
                          className={`cursor-pointer transition-all hover:shadow-medium ${
                            selectedTrip?.id === trip.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedTrip(trip)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <Badge className={getStatusColor(trip.status)}>
                                {trip.status === 'active' ? 'Live' : 'Scheduled'}
                              </Badge>
                              {trip.price_per_seat != null && (
                                <div className="flex items-center text-sm font-medium text-primary">
                                  {formatINR(Number(trip.price_per_seat))}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                  <div className="font-medium">{trip.start_location}</div>
                                  <div className="text-muted-foreground">to {trip.destination}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{time}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>{trip.available_seats}</span>
                                </div>
                              </div>

                              {trip.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {trip.description}
                                </p>
                              )}
                            </div>

                            <Button
                              size="sm"
                              className="w-full mt-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/trip/${trip.id}`);
                              }}
                            >
                              View Details
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[800px]">
              <CardContent className="p-0 h-full">
                <EnhancedMapComponent
                  className="h-full rounded-lg"
                  showDrivers={true}
                  selectedTrip={selectedTrip}
                  center={userCenter || [20.5937, 78.9629]} // Default to India
                  zoom={userCenter ? 13 : 5}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Selected Trip Details */}
        {selectedTrip && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Route</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{selectedTrip.start_location} → {selectedTrip.destination}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Schedule</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{formatDateTime(selectedTrip.departure_time).date} at {formatDateTime(selectedTrip.departure_time).time}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Availability</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{selectedTrip.available_seats} seats available</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedTrip.price_per_seat && (
                    <div>
                      <h4 className="font-semibold mb-2">Price</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <IndianRupee className="h-4 w-4 text-primary" />
                        <span>{formatINR(Number(selectedTrip.price_per_seat))} per seat</span>
                      </div>
                    </div>
                  )}

                  {selectedTrip.description && (
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTrip.description}
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button 
                      className="w-full"
                      onClick={() => window.location.href = `/trip/${selectedTrip.id}`}
                    >
                      Book This Trip
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}