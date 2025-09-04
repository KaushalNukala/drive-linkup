import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Trip, DriverLocation, Profile } from '@/types';
import { Car, MapPin, Navigation, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import 'leaflet/dist/leaflet.css';
import { formatINR } from '@/lib/utils';

// Fix Leaflet default icon URLs
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 13,
  selectedTrip,
  showDrivers = true,
  onDriverClick,
  className = "h-[500px] w-full rounded-lg"
}) => {
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (showDrivers) {
      fetchDriverLocations();
      fetchActiveTrips();
      fetchDriverProfiles();
      
      // Set up real-time subscription for driver locations
      const subscription = supabase
        .channel('driver_locations')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'driver_locations' },
          () => fetchDriverLocations()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [showDrivers]);

  // Track current user (passenger) geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
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
      } catch (e) {
        // ignore if map is not ready
      }
    }
  }, [userPosition]);

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

  // Create route line for selected trip
  const getRouteCoordinates = (trip: Trip): [number, number][] => {
    const coords: [number, number][] = [];
    if (trip.start_lat && trip.start_lng) {
      coords.push([trip.start_lat, trip.start_lng]);
    }
    if (trip.dest_lat && trip.dest_lng) {
      coords.push([trip.dest_lat, trip.dest_lng]);
    }
    return coords;
  };

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full rounded-lg"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Driver locations */}
        {showDrivers && driverLocations.map((location) => {
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

        {/* Current passenger location */}
        {userPosition && (
          <Marker position={userPosition} icon={passengerIcon}>
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
            {selectedTrip.start_lat && selectedTrip.start_lng && (
              <Marker
                position={[selectedTrip.start_lat, selectedTrip.start_lng]}
                icon={pickupIcon}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">Pickup Location</div>
                    <div className="text-sm">{selectedTrip.start_location}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination marker */}
            {selectedTrip.dest_lat && selectedTrip.dest_lng && (
              <Marker
                position={[selectedTrip.dest_lat, selectedTrip.dest_lng]}
                icon={destinationIcon}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">Destination</div>
                    <div className="text-sm">{selectedTrip.destination}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route line */}
            {selectedTrip.start_lat && selectedTrip.start_lng && 
             selectedTrip.dest_lat && selectedTrip.dest_lng && (
              <Polyline
                positions={getRouteCoordinates(selectedTrip)}
                color="#2563eb"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}

            {/* Pickup radius circle */}
            {selectedTrip.start_lat && selectedTrip.start_lng && (
              <Circle
                center={[selectedTrip.start_lat, selectedTrip.start_lng]}
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