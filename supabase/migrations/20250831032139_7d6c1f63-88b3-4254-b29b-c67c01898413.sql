-- Create user role enum
CREATE TYPE user_role AS ENUM ('driver', 'passenger');

-- Create trip status enum  
CREATE TYPE trip_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

-- Create booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'passenger',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  start_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_lat NUMERIC,
  start_lng NUMERIC,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  available_seats INTEGER NOT NULL,
  price_per_seat NUMERIC,
  status trip_status NOT NULL DEFAULT 'scheduled',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  passenger_id UUID NOT NULL,
  seats_requested INTEGER NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_locations table
CREATE TABLE public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  trip_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Trips policies
CREATE POLICY "Anyone can view active trips" ON public.trips FOR SELECT USING (status = ANY (ARRAY['scheduled'::trip_status, 'active'::trip_status]));
CREATE POLICY "Drivers can insert their own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update their own trips" ON public.trips FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can delete their own trips" ON public.trips FOR DELETE USING (auth.uid() = driver_id);

-- Bookings policies
CREATE POLICY "Users can view bookings for their trips or requests" ON public.bookings FOR SELECT USING ((auth.uid() = passenger_id) OR (auth.uid() IN (SELECT trips.driver_id FROM trips WHERE trips.id = bookings.trip_id)));
CREATE POLICY "Passengers can create booking requests" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "Passengers can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = passenger_id);
CREATE POLICY "Drivers can update bookings for their trips" ON public.bookings FOR UPDATE USING (auth.uid() IN (SELECT trips.driver_id FROM trips WHERE trips.id = bookings.trip_id));

-- Driver locations policies
CREATE POLICY "Anyone can view active driver locations" ON public.driver_locations FOR SELECT USING (true);
CREATE POLICY "Drivers can insert their own location" ON public.driver_locations FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update location records" ON public.driver_locations FOR UPDATE USING (auth.uid() = driver_id);

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;