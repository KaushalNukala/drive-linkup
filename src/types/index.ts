export type UserRole = 'driver' | 'passenger';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  start_location: string;
  destination: string;
  start_lat?: number;
  start_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  departure_time: string;
  available_seats: number;
  price_per_seat?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats_requested: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}