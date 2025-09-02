import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trip } from '@/types';
import { 
  Search as SearchIcon, 
  MapPin, 
  Clock, 
  Users, 
  IndianRupee,
  Filter,
  Calendar,
  ArrowRight
} from 'lucide-react';

export default function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    date: searchParams.get('date') || ''
  });

  useEffect(() => {
    if (searchQuery.from || searchQuery.to) {
      searchTrips();
    } else {
      // Load all available trips if no search query
      loadAllTrips();
    }
  }, []);

  const searchTrips = async () => {
    setLoading(true);
    
    let query = supabase
      .from('trips')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          phone,
          avatar_url
        )
      `)
      .in('status', ['scheduled', 'active'])
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true });

    // Add filters based on search criteria
    if (searchQuery.from) {
      query = query.ilike('start_location', `%${searchQuery.from}%`);
    }
    
    if (searchQuery.to) {
      query = query.ilike('destination', `%${searchQuery.to}%`);
    }
    
    if (searchQuery.date) {
      const startOfDay = new Date(searchQuery.date);
      const endOfDay = new Date(searchQuery.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('departure_time', startOfDay.toISOString())
        .lte('departure_time', endOfDay.toISOString());
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Search error:', error);
    } else {
      setTrips(data || []);
    }
    
    setLoading(false);
  };

  const loadAllTrips = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          phone,
          avatar_url
        )
      `)
      .in('status', ['scheduled', 'active'])
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Load trips error:', error);
    } else {
      setTrips(data || []);
    }
    
    setLoading(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.from) params.set('from', searchQuery.from);
    if (searchQuery.to) params.set('to', searchQuery.to);
    if (searchQuery.date) params.set('date', searchQuery.date);
    
    setSearchParams(params);
    searchTrips();
  };

  const clearSearch = () => {
    setSearchQuery({ from: '', to: '', date: '' });
    setSearchParams(new URLSearchParams());
    loadAllTrips();
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateLabel = date.toLocaleDateString();
    
    if (date.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateLabel = 'Tomorrow';
    }
    
    return {
      date: dateLabel,
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
          <h1 className="text-3xl font-bold mb-2">Find Your Perfect Ride</h1>
          <p className="text-muted-foreground">
            Search for available trips and connect with drivers going your way
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="h-5 w-5" />
              Search Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Starting location"
                    value={searchQuery.from}
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, from: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Destination"
                    value={searchQuery.to}
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, to: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date (optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={searchQuery.date}
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, date: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 justify-end">
                <Button onClick={handleSearch} disabled={loading}>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
                {(searchQuery.from || searchQuery.to || searchQuery.date) && (
                  <Button variant="outline" onClick={clearSearch}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Searching for trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No trips found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery.from || searchQuery.to 
                    ? "Try adjusting your search criteria or check back later" 
                    : "No trips are currently available"
                  }
                </p>
                {!user && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Are you a driver? Share your trip to help others!
                    </p>
                    <Link to="/auth?mode=signup">
                      <Button variant="outline">
                        Join as Driver
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {trips.length} trip{trips.length !== 1 ? 's' : ''} found
                </h2>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              {trips.map((trip) => {
                const { date, time } = formatDateTime(trip.departure_time);
                const driver = (trip as any).profiles;
                
                return (
                  <Card key={trip.id} className="hover:shadow-medium transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3">
                          <Badge className={getStatusColor(trip.status)}>
                            {trip.status === 'active' ? 'Live Now' : 'Scheduled'}
                          </Badge>
                          {trip.price_per_seat && (
                            <div className="flex items-center text-lg font-semibold text-primary">
                              <IndianRupee className="h-4 w-4" />
                              {formatINR(Number(trip.price_per_seat))}
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                per seat
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {driver && (
                          <div className="text-right">
                            <p className="font-medium">{driver.full_name}</p>
                            <p className="text-sm text-muted-foreground">Driver</p>
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-3">
                          <div>
                            <h4 className="font-semibold mb-2">Route</h4>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary"></div>
                                <span className="font-medium">{trip.start_location}</span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-secondary"></div>
                                <span className="font-medium">{trip.destination}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{date} at {time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''} available</span>
                            </div>
                          </div>

                          {trip.description && (
                            <div>
                              <h4 className="font-semibold mb-1">Trip Notes</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {trip.description}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col justify-end gap-3">
                          <Link to={`/trip/${trip.id}`} className="w-full">
                            <Button className="w-full">
                              View Details
                            </Button>
                          </Link>
                          
                          {user ? (
                            <Link to={`/trip/${trip.id}?book=true`} className="w-full">
                              <Button variant="hero" className="w-full">
                                Book Now
                              </Button>
                            </Link>
                          ) : (
                            <Link to="/auth" className="w-full">
                              <Button variant="outline" className="w-full">
                                Sign In to Book
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}