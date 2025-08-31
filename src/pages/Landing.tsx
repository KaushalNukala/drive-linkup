import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Car, 
  MapPin, 
  Users, 
  Clock, 
  Shield, 
  Star,
  ArrowRight,
  Search
} from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  const handleSearch = () => {
    if (searchFrom && searchTo) {
      const params = new URLSearchParams({
        from: searchFrom,
        to: searchTo
      });
      window.location.href = `/search?${params.toString()}`;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Your journey starts with{' '}
            <span className="text-accent">TripConnect</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Connect with travelers on the same route. Save money, make friends, and reduce your carbon footprint.
          </p>

          {/* Search Box */}
          <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      placeholder="Enter starting point"
                      value={searchFrom}
                      onChange={(e) => setSearchFrom(e.target.value)}
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      placeholder="Enter destination"
                      value={searchTo}
                      onChange={(e) => setSearchTo(e.target.value)}
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch}
                    variant="accent" 
                    size="lg" 
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Rides
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {!user && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button variant="accent" size="lg" className="px-8">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose TripConnect?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The smartest way to travel with safety, savings, and convenience at the forefront.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center shadow-medium hover:shadow-strong transition-smooth">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Safe & Verified</h3>
                <p className="text-muted-foreground">
                  All users are verified with secure authentication. Rate and review your travel companions.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-medium hover:shadow-strong transition-smooth">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Live Tracking</h3>
                <p className="text-muted-foreground">
                  Real-time location sharing for peace of mind. Know exactly where your ride is at all times.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-medium hover:shadow-strong transition-smooth">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Community Driven</h3>
                <p className="text-muted-foreground">
                  Connect with like-minded travelers. Build lasting friendships through shared journeys.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Simple steps to start your journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* For Passengers */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-center">For Passengers</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Search for Rides</h4>
                    <p className="text-muted-foreground">Enter your route and find available drivers going your way.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Request to Join</h4>
                    <p className="text-muted-foreground">Send a booking request with your travel details.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Travel Together</h4>
                    <p className="text-muted-foreground">Meet up and enjoy your shared journey with live tracking.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Drivers */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-center">For Drivers</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Post Your Trip</h4>
                    <p className="text-muted-foreground">Add your route, schedule, and available seats.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Accept Passengers</h4>
                    <p className="text-muted-foreground">Review requests and choose your travel companions.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Share the Journey</h4>
                    <p className="text-muted-foreground">Split costs and make new connections on the road.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of travelers already using TripConnect
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button variant="accent" size="lg" className="px-8">
                  Sign Up Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="outline" size="lg" className="px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                  View Live Map
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}