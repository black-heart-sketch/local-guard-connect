import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, AlertTriangle, Users, Phone, Eye, Lock, MessageCircle, FileText, UserCheck, Clock, BarChart3, Heart, Camera, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  const features = [
    {
      icon: FileText,
      title: "Quick Crime Reporting",
      description: "Submit detailed crime reports with multimedia evidence in seconds"
    },
    {
      icon: MapPin,
      title: "Real-Time Crime Map",
      description: "View and track criminal activity in your area with live updates"
    },
    {
      icon: AlertTriangle,
      title: "Emergency Panic Button",
      description: "Instant emergency alerts with GPS location to authorities"
    },
    {
      icon: Eye,
      title: "Anonymous Reporting",
      description: "Report crimes safely without revealing your identity"
    },
    {
      icon: Heart,
      title: "GBV Support Module",
      description: "Specialized reporting for gender-based violence with NGO partnerships"
    },
    {
      icon: Users,
      title: "Community Patrol",
      description: "Coordinate with verified community safety groups and patrols"
    },
    {
      icon: Lock,
      title: "Secure Evidence Vault",
      description: "Store sensitive evidence in an encrypted, PIN-protected vault"
    },
    {
      icon: MessageCircle,
      title: "Multi-Language Support",
      description: "Report in English, French, and other local languages"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Reports Submitted", icon: FileText },
    { number: "2,500+", label: "Cases Resolved", icon: UserCheck },
    { number: "50+", label: "Communities Protected", icon: Users },
    { number: "24/7", label: "Emergency Response", icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Local Guard Connect</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#community" className="text-muted-foreground hover:text-foreground transition-colors">Community</a>
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>Welcome, {profile?.full_name || user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              🛡️ Protecting Communities Together
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your Safety is Our 
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Priority</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Report crimes, stay informed, and build safer communities with our comprehensive crime reporting platform. 
              Anonymous reporting, real-time alerts, and emergency response - all in your pocket.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Report Now
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <MapPin className="mr-2 h-5 w-5" />
                View Crime Map
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Comprehensive Safety Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every feature designed with your safety and privacy in mind
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How Local Guard Connect Works</h2>
            <p className="text-xl text-muted-foreground">Simple, secure, and effective reporting in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">1. Report</h3>
              <p className="text-muted-foreground leading-relaxed">
                Submit detailed crime reports with photos, videos, and location data. Choose anonymous or identified reporting.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">2. Verify</h3>
              <p className="text-muted-foreground leading-relaxed">
                Reports are reviewed by our admin team and verified with local authorities for accuracy and legitimacy.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">3. Act</h3>
              <p className="text-muted-foreground leading-relaxed">
                Community and authorities take action. Get updates on your reports and stay informed about your area's safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="destructive" className="mb-4">Emergency Features</Badge>
              <h2 className="text-4xl font-bold text-foreground mb-6">Instant Emergency Response</h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                When seconds matter, Local Guard Connect provides instant emergency features including panic buttons, 
                automatic location sharing, and direct connection to emergency services.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Phone className="h-6 w-6 text-destructive mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">One-Touch Emergency Alert</h4>
                    <p className="text-muted-foreground">Instantly alert authorities and emergency contacts</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-6 w-6 text-destructive mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Automatic Location Sharing</h4>
                    <p className="text-muted-foreground">GPS coordinates sent automatically with alerts</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Camera className="h-6 w-6 text-destructive mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Auto-Recording</h4>
                    <p className="text-muted-foreground">Automatic audio/video recording during emergencies</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-destructive/10 to-accent/10 rounded-2xl p-8 text-center">
                <AlertTriangle className="h-20 w-20 text-destructive mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-foreground mb-4">Emergency Mode</h3>
                <p className="text-muted-foreground mb-6">Activate with a single touch when you need immediate help</p>
                <Button size="lg" variant="destructive" className="w-full">
                  <Phone className="mr-2 h-5 w-5" />
                  Emergency Alert
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Building Safer Communities</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of community members working together to create safer neighborhoods through technology and collaboration.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Crime Analytics</CardTitle>
                <CardDescription>
                  View real-time statistics and trends to understand safety patterns in your area
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Community Watch</CardTitle>
                <CardDescription>
                  Connect with verified neighborhood watch groups and community safety initiatives
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Authority Partnership</CardTitle>
                <CardDescription>
                  Direct integration with local law enforcement and emergency services
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary to-accent rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-6">Ready to Make Your Community Safer?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join Local Guard Connect today and be part of the solution. Together, we can build safer, 
              more connected communities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                Download App
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Local Guard Connect</span>
            </div>
            <p className="text-muted-foreground text-center md:text-right">
              © 2024 Local Guard Connect. Building safer communities through technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;