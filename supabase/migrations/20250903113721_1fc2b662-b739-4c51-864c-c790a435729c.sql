-- Fix booking acceptance failures by disabling DB http call
CREATE OR REPLACE FUNCTION public.notify_booking_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- External HTTP call removed to avoid "schema \"net\" does not exist" errors.
  -- Email notifications are handled via Edge Function send-booking-notification.
  RETURN NEW;
END;
$function$;