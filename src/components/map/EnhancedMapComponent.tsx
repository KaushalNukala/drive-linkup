import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DriverLocation, PassengerLocation, Trip, Profile } from '@/types';
import { Car, MapPin, Clock, Users, UserCheck, Navigation } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { geocodePlace, fetchRoadRoute } from '@/lib/geo';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Custom icons for different states
const createDriverIcon = (isMoving: boolean = false) => divIcon({
  html: `<div style="
    background: ${isMoving ? '#ff6b35' : '#e74c3c'};
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 6px 12px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    font-weight: bold;
  ">🏍️</div>`,
  className: 'custom-div-icon',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const pickupIcon = divIcon({
  html: `<div style="
    background: #059669;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
  ">📍</div>`,
  className: 'custom-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destinationIcon = divIcon({
  html: `<div style="
    background: #dc2626;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
  ">🎯</div>`,
  className: 'custom-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Passenger (current user) bike icon
const passengerIcon = divIcon({
  html: `<div style="
    background: #f59e0b;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  ">🏍️</div>`,
  className: 'custom-div-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface EnhancedMapComponentProps {
  center?: [number, number];
  zoom?: number;
  selectedTrip?: Trip | null;
  showDrivers?: boolean;
  onDriverClick?: (driver: DriverLocation) => void;
  className?: string;
}

export const EnhancedMapComponent: React.FC<EnhancedMapComponentProps> = ({
  center = [28.6139, 77.2090], // Default to Delhi, India
  zoom = 13,
  selectedTrip,
  showDrivers = true,
  onDriverClick,
  className = "h-[500px] w-full rounded-lg"
}) => {
  const { user } = useAuth();
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [passengerLocations, setPassengerLocations] = useState<PassengerLocation[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapZoom, setMapZoom] = useState<number>(zoom);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const mapRef = useRef<any>(null);
  const [myRole, setMyRole] = useState<'driver' | 'passenger' | null>(null);
  const [visibleDriverIds, setVisibleDriverIds] = useState<string[]>([]);
  const [visiblePassengerIds, setVisiblePassengerIds] = useState<string[]>([]);
  const [resolvedStart, setResolvedStart] = useState<[number, number] | null>(null);
  const [resolvedDest, setResolvedDest] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (showDrivers) {
      fetchDriverLocations();
      fetchPassengerLocations();
      fetchActiveTrips();
      fetchDriverProfiles();
      
      // Set up real-time subscriptions for locations
      const driverSub = supabase
        .channel('driver_locations')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'driver_locations' },
          () => fetchDriverLocations()
        )
        .subscribe();

      const passengerSub = supabase
        .channel('passenger_locations')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'passenger_locations' },
          () => fetchPassengerLocations()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(driverSub);
        supabase.removeChannel(passengerSub);
      };
    }
  }, [showDrivers]);

  // Track current user (passenger) geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(newPosition);
        
        // Share own live location so matched participants can see it
        if (user) {
          await updateUserLocation(newPosition, selectedTrip?.id);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [user, selectedTrip]);

  // Work out who this user is allowed to see on the map
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setVisibleDriverIds([]);
        setVisiblePassengerIds([]);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      const role = (profile?.role as 'driver' | 'passenger' | undefined) ?? null;
      setMyRole(role);

      if (role === 'driver') {
        const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', user.id);
        const tripIds = (myTrips || []).map((t: any) => t.id);
        setVisibleDriverIds([]);
        if (!tripIds.length) return setVisiblePassengerIds([]);
        const { data: accepted } = await supabase
          .from('bookings')
          .select('passenger_id')
          .eq('status', 'accepted')
          .in('trip_id', tripIds);
        setVisiblePassengerIds([...new Set((accepted || []).map((b: any) => b.passenger_id))]);
      } else {
        const { data: accepted } = await supabase
          .from('bookings')
          .select('trip_id')
          .eq('passenger_id', user.id)
          .eq('status', 'accepted');
        const tripIds = [...new Set((accepted || []).map((b: any) => b.trip_id))];
        setVisiblePassengerIds([]);
        if (!tripIds.length) return setVisibleDriverIds([]);
        const { data: tripRows } = await supabase.from('trips').select('driver_id').in('id', tripIds);
        setVisibleDriverIds([...new Set((tripRows || []).map((t: any) => t.driver_id))]);
      }
    };

    load();

    const bookingSub = supabase
      .channel('map_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(bookingSub);
    };
  }, [user?.id]);

  // Resolve trip start/destination coordinates (geocode names when missing) and the road route
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!selectedTrip) {
        setResolvedStart(null);
        setResolvedDest(null);
        setRouteCoordinates([]);
        return;
      }

      const start: [number, number] | null =
        selectedTrip.start_lat != null && selectedTrip.start_lng != null
          ? [selectedTrip.start_lat, selectedTrip.start_lng]
          : await geocodePlace(selectedTrip.start_location);

      const dest: [number, number] | null =
        selectedTrip.dest_lat != null && selectedTrip.dest_lng != null
          ? [selectedTrip.dest_lat, selectedTrip.dest_lng]
          : await geocodePlace(selectedTrip.destination);

      if (cancelled) return;
      setResolvedStart(start);
      setResolvedDest(dest);

      if (start && dest) {
        const line = await fetchRoadRoute(start, dest);
        if (!cancelled) setRouteCoordinates(line);
      } else {
        setRouteCoordinates([]);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [selectedTrip?.id, selectedTrip?.start_location, selectedTrip?.destination]);

  // Center map: fit the trip route when there is one, otherwise follow the user
  useEffect(() => {
    if (!mapRef.current) return;
    try {
      if (resolvedStart && resolvedDest) {
        setTimeout(() => {
          try {
            mapRef.current?.fitBounds([resolvedStart, resolvedDest], { padding: [50, 50], maxZoom: 14 });
          } catch {}
        }, 150);
      } else if (userPosition && !selectedTrip) {
        mapRef.current.setView(userPosition, 15);
      }
    } catch (e) {
      console.warn('Map update error:', e);
    }
  }, [resolvedStart, resolvedDest, userPosition, selectedTrip]);

  const fetchPassengerLocations = async () => {
    try {
      const { data } = await supabase
        .from('passenger_locations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (data) {
        // Remove duplicates - keep only the latest location for each passenger
        const latestLocations = data.reduce((acc: PassengerLocation[], current) => {
          const existing = acc.find(loc => loc.passenger_id === current.passenger_id);
          if (!existing || new Date(current.updated_at) > new Date(existing.updated_at)) {
            if (existing) {
              const index = acc.indexOf(existing);
              acc[index] = current;
            } else {
              acc.push(current);
            }
          }
          return acc;
        }, []);
        
        setPassengerLocations(latestLocations);
      }
    } catch (error) {
      console.error('Error fetching passenger locations:', error);
    }
  };


  const fetchDriverLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        // Get latest location for each driver
        const latestLocations = data.reduce((acc: DriverLocation[], location) => {
          if (!acc.find(l => l.driver_id === location.driver_id)) {
            acc.push(location);
          }
          return acc;
        }, []);
        setDriverLocations(latestLocations);
      }
    } catch (error) {
      console.error('Error fetching driver locations:', error);
    }
  };

  const updateUserLocation = async (position: [number, number], tripId?: string) => {
    if (!user) return;

    try {
      // Check if user is a driver or passenger for this trip
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role === 'driver') {
        // Update driver location
        const { error: dlError } = await supabase
          .from('driver_locations')
          .insert({
            driver_id: user.id,
            trip_id: tripId,
            latitude: position[0],
            longitude: position[1],
            updated_at: new Date().toISOString()
          });
        if (dlError) throw dlError;
      } else {
        // Update passenger location
        const { error: plError } = await supabase
          .from('passenger_locations')
          .insert({
            passenger_id: user.id,
            trip_id: tripId,
            latitude: position[0],
            longitude: position[1],
            updated_at: new Date().toISOString()
          });
        if (plError) throw plError;
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const fetchActiveTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .in('status', ['scheduled', 'active']);
      
      if (!error && data) {
        setTrips(data);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const fetchDriverProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver');
      
      if (!error && data) {
        setDrivers(data);
      }
    } catch (error) {
      console.error('Error fetching driver profiles:', error);
    }
  };

  const getTripForDriver = (driverId: string): Trip | undefined => {
    return trips.find(trip => trip.driver_id === driverId);
  };

  const getDriverProfile = (driverId: string): Profile | undefined => {
    return drivers.find(driver => driver.user_id === driverId);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isDriverMoving = (location: DriverLocation): boolean => {
    return !!location.speed && location.speed > 0;
  };

  // Route line for the selected trip
  const getRouteCoordinates = (): [number, number][] => {
    if (routeCoordinates.length > 1) return routeCoordinates;
    if (resolvedStart && resolvedDest) return [resolvedStart, resolvedDest];
    return [];
  };

  return (
    <div className={className}>
      <MapContainer
        center={selectedTrip && selectedTrip.start_lat && selectedTrip.start_lng ? 
          [selectedTrip.start_lat, selectedTrip.start_lng] : center}
        zoom={selectedTrip ? 10 : zoom}
        className="h-full w-full rounded-lg"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Driver locations - only drivers who accepted my booking */}
        {showDrivers && driverLocations
          .filter((l) => l.driver_id !== user?.id && visibleDriverIds.includes(l.driver_id))
          .map((location) => {
          const trip = getTripForDriver(location.driver_id);
          const driverProfile = getDriverProfile(location.driver_id);
          const moving = isDriverMoving(location);
          
          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createDriverIcon(moving)}
              eventHandlers={{
                click: () => onDriverClick?.(location)
              }}
            >
              <Popup>
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" />
                      <span className="font-semibold">
                        {driverProfile?.full_name || 'Driver'}
                      </span>
                      <Badge variant={moving ? "default" : "secondary"}>
                        {moving ? 'Moving' : 'Stopped'}
                      </Badge>
                    </div>
                    
                    {trip && (
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{trip.start_location} → {trip.destination}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(trip.departure_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          <span>{trip.available_seats} seats available</span>
                        </div>
                        {trip.price_per_seat != null && (
                          <div className="font-medium text-primary">
                            {formatINR(Number(trip.price_per_seat))}/seat
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Last updated: {formatTime(location.updated_at)}
                    </div>
                  </CardContent>
                </Card>
              </Popup>
            </Marker>
          );
        })}

        {/* Passenger locations - only passengers with an accepted booking on my rides */}
        {passengerLocations
          .filter((l) => l.passenger_id !== user?.id && visiblePassengerIds.includes(l.passenger_id))
          .map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={passengerIcon}
          >
            <Popup className="custom-popup">
              <Card className="border-0 shadow-none">
                <CardContent className="p-3 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Passenger</span>
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Passenger location updated recently
                  </p>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}

        {/* Your own live location - always visible */}
        {userPosition && (
          <Marker
            position={userPosition}
            icon={myRole === 'driver' ? createDriverIcon(false) : passengerIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="font-semibold">Your Location</div>
                <div className="text-xs text-muted-foreground">Updated in real-time</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Selected trip route and markers */}
        {selectedTrip && (
          <>
            {/* Start location marker */}
            {resolvedStart && (
              <Marker position={resolvedStart} icon={pickupIcon}>
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">Pickup Location</div>
                    <div className="text-sm">{selectedTrip.start_location}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination marker */}
            {resolvedDest && (
              <Marker position={resolvedDest} icon={destinationIcon}>
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">Destination</div>
                    <div className="text-sm">{selectedTrip.destination}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route line between pickup and destination */}
            {getRouteCoordinates().length > 1 && (
              <Polyline
                positions={getRouteCoordinates()}
                color="#111827"
                weight={5}
                opacity={0.9}
              />
            )}

            {/* Pickup radius circle */}
            {resolvedStart && (
              <Circle
                center={resolvedStart}
                radius={500}
                fillColor="#059669"
                fillOpacity={0.1}
                color="#059669"
                weight={2}
                opacity={0.5}
              />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
};
