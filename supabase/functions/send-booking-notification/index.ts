import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  bookingId: string;
  type: 'booking_created' | 'booking_accepted' | 'booking_rejected';
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, type }: BookingNotificationRequest = await req.json();

    // Get booking details with trip and profile info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        trip:trips(*),
        passenger:profiles!bookings_passenger_id_fkey(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', booking.trip.driver_id)
      .single();

    if (driverError || !driver) {
      throw new Error('Driver not found');
    }

    let emailData;
    
    if (type === 'booking_created') {
      // Send email to driver
      emailData = {
        from: "TripConnect <noreply@resend.dev>",
        to: [driver.email],
        subject: "New Booking Request - TripConnect",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">New Booking Request</h1>
            <p>Hi ${driver.full_name},</p>
            <p>You have received a new booking request for your trip:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Trip Details:</h3>
              <p><strong>Route:</strong> ${booking.trip.start_location} → ${booking.trip.destination}</p>
              <p><strong>Departure:</strong> ${new Date(booking.trip.departure_time).toLocaleString()}</p>
              <p><strong>Seats Requested:</strong> ${booking.seats_requested}</p>
            </div>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Passenger Details:</h3>
              <p><strong>Name:</strong> ${booking.passenger.full_name}</p>
              <p><strong>Phone:</strong> ${booking.passenger.phone || 'Not provided'}</p>
              ${booking.message ? `<p><strong>Message:</strong> ${booking.message}</p>` : ''}
            </div>

            <p>Please log into TripConnect to accept or reject this booking request.</p>
            <p>Best regards,<br>TripConnect Team</p>
          </div>
        `,
      };
    } else if (type === 'booking_accepted') {
      // Send email to passenger
      emailData = {
        from: "TripConnect <noreply@resend.dev>",
        to: [booking.passenger.email],
        subject: "Booking Confirmed - TripConnect",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Booking Confirmed!</h1>
            <p>Hi ${booking.passenger.full_name},</p>
            <p>Great news! Your booking request has been accepted.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>Trip Details:</h3>
              <p><strong>Route:</strong> ${booking.trip.start_location} → ${booking.trip.destination}</p>
              <p><strong>Departure:</strong> ${new Date(booking.trip.departure_time).toLocaleString()}</p>
              <p><strong>Seats Booked:</strong> ${booking.seats_requested}</p>
              ${booking.trip.price_per_seat ? `<p><strong>Total Price:</strong> $${(booking.trip.price_per_seat * booking.seats_requested).toFixed(2)}</p>` : ''}
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Driver Contact:</h3>
              <p><strong>Name:</strong> ${driver.full_name}</p>
              <p><strong>Phone:</strong> ${driver.phone || 'Contact through app'}</p>
            </div>

            <p>Please be ready at the pickup location on time. You can contact your driver through the app if needed.</p>
            <p>Have a safe trip!<br>TripConnect Team</p>
          </div>
        `,
      };
    } else if (type === 'booking_rejected') {
      // Send email to passenger
      emailData = {
        from: "TripConnect <noreply@resend.dev>",
        to: [booking.passenger.email],
        subject: "Booking Update - TripConnect",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Booking Not Available</h1>
            <p>Hi ${booking.passenger.full_name},</p>
            <p>Unfortunately, your booking request for the following trip could not be accepted:</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>Trip Details:</h3>
              <p><strong>Route:</strong> ${booking.trip.start_location} → ${booking.trip.destination}</p>
              <p><strong>Departure:</strong> ${new Date(booking.trip.departure_time).toLocaleString()}</p>
              <p><strong>Seats Requested:</strong> ${booking.seats_requested}</p>
            </div>

            <p>Don't worry! You can search for other available trips that match your travel needs.</p>
            <p>Best regards,<br>TripConnect Team</p>
          </div>
        `,
      };
    }

    const emailResponse = await resend.emails.send(emailData);
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);