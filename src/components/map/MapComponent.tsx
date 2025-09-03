import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DriverLocation, Trip } from '@/types';
import { Car, MapPin, Clock, Users } from 'lucide-react';
import { formatINR } from '@/lib/utils';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Custom icons
const driverIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  showDrivers?: boolean;
  selectedTrip?: Trip | null;
  className?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 13,
  showDrivers = true,
  selectedTrip = null,
  className = "h-96"
}) => {
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (showDrivers) {
      fetchDriverLocations();
      fetchActiveTrips();

      // Subscribe to real-time location updates
      const locationChannel = supabase
        .channel('driver-locations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'driver_locations'
          },
          () => {
            fetchDriverLocations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(locationChannel);
      };
    }
  }, [showDrivers]);

  // Track current user geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Center map on current user when available
  useEffect(() => {
    if (userPosition && mapRef.current) {
      try {
        mapRef.current.setView(userPosition, 15);
      } catch {}
    }
  }, [userPosition]);

  const fetchDriverLocations = async () => {
    const { data } = await supabase
      .from('driver_locations')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (data) {
      // Remove duplicates - keep only the latest location for each driver
      const latestLocations = data.reduce((acc: DriverLocation[], current) => {
        const existing = acc.find(loc => loc.driver_id === current.driver_id);
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
      
      setDriverLocations(latestLocations);
    }
  };

  const fetchActiveTrips = async () => {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .in('status', ['scheduled', 'active'])
      .order('departure_time', { ascending: true });
    
    if (data) {
      setTrips(data);
    }
  };

  const getTripForDriver = (driverId: string) => {
    return trips.find(trip => trip.driver_id === driverId);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full rounded-lg"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Driver locations */}
        {showDrivers && driverLocations.map((location) => {
          const trip = getTripForDriver(location.driver_id);
          
          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={driverIcon}
            >
              <Popup className="custom-popup">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-3 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Active Driver</span>
                      <Badge variant="outline" className="text-xs">
                        {trip?.status || 'Available'}
                      </Badge>
                    </div>
                    
                    {trip && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{trip.start_location} → {trip.destination}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatTime(trip.departure_time)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{trip.available_seats} seats available</span>
                        </div>
                        
                        {trip.price_per_seat && (
                          <div className="text-sm font-medium text-primary">
                            {formatINR(Number(trip.price_per_seat))} per seat
                          </div>
                        )}
                        
                        <Button size="sm" className="w-full mt-2">
                          View Trip Details
                        </Button>
                      </div>
                    )}
                    
                    {!trip && (
                      <p className="text-sm text-muted-foreground">
                        Driver is currently online
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Selected trip route */}
        {selectedTrip && selectedTrip.start_lat && selectedTrip.start_lng && 
         selectedTrip.dest_lat && selectedTrip.dest_lng && (
          <>
            <Marker position={[selectedTrip.start_lat, selectedTrip.start_lng]}>
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">Start</div>
                  <div className="text-sm">{selectedTrip.start_location}</div>
                </div>
              </Popup>
            </Marker>
            
            <Marker position={[selectedTrip.dest_lat, selectedTrip.dest_lng]}>
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">Destination</div>
                  <div className="text-sm">{selectedTrip.destination}</div>
                </div>
              </Popup>
            </Marker>
            
            <Polyline
              positions={[
                [selectedTrip.start_lat, selectedTrip.start_lng],
                [selectedTrip.dest_lat, selectedTrip.dest_lng]
              ]}
              color="#3B82F6"
              weight={3}
              opacity={0.7}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};
