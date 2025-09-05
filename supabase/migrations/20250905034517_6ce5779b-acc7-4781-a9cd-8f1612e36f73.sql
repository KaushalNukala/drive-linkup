-- Create passenger_locations table to track passenger locations
CREATE TABLE public.passenger_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_id UUID NOT NULL,
  trip_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.passenger_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for passenger_locations
CREATE POLICY "Passengers can insert their own location" 
ON public.passenger_locations 
FOR INSERT 
WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update their own location" 
ON public.passenger_locations 
FOR UPDATE 
USING (auth.uid() = passenger_id);

-- Allow drivers to see passenger locations for their trips with accepted bookings
CREATE POLICY "Drivers can view passenger locations for accepted bookings" 
ON public.passenger_locations 
FOR SELECT 
USING (
  trip_id IN (
    SELECT trips.id 
    FROM trips 
    INNER JOIN bookings ON bookings.trip_id = trips.id 
    WHERE trips.driver_id = auth.uid() 
    AND bookings.passenger_id = passenger_locations.passenger_id 
    AND bookings.status = 'accepted'
  )
);

-- Allow passengers to see their own locations
CREATE POLICY "Passengers can view their own location" 
ON public.passenger_locations 
FOR SELECT 
USING (auth.uid() = passenger_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_passenger_locations_updated_at
BEFORE UPDATE ON public.passenger_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_passenger_locations_passenger_id ON public.passenger_locations(passenger_id);
CREATE INDEX idx_passenger_locations_trip_id ON public.passenger_locations(trip_id);
CREATE INDEX idx_passenger_locations_updated_at ON public.passenger_locations(updated_at);