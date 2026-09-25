import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Users, Phone, Eye, Lock, MessageCircle, FileText, UserCheck, Clock, BarChart3, Heart, Camera, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReportPopup } from "@/components/reports/ReportPopup";
import { useReportPopup } from "@/hooks/useReportPopup";

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();
  const {
    isReportOpen,
    openReportPopup,
    closeReportPopup,
    handleReportSubmit,
  } = useReportPopup();

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
      title: "Privacy-Aware Incident Map",
      description: "View delayed, resolved, non-sensitive incidents with approximate locations"
    },
    {
      icon: AlertTriangle,
      title: "Emergency Panic Button",
      description: "Queue GPS and private evidence for dispatch, with official call fallbacks"
    },
    {
      icon: Eye,
      title: "Anonymous Reporting",
      description: "Report crimes safely without revealing your identity"
    },
    {
      icon: Heart,
      title: "GBV Support Module",
      description: "Protected reporting for gender-based violence with controlled referral workflows"
    },
    {
      icon: Users,
      title: "Verified Safety Partners",
      description: "Connect reports to approved agencies, councils, NGOs, and community groups"
    },
    {
      icon: Lock,
      title: "Private Evidence Vault",
      description: "Evidence is access-controlled and separated from the public safety map"
    },
    {
      icon: MessageCircle,
      title: "Bilingual Access",
      description: "Use core reporting and safety flows in English or French"
    }
  ];

  const stats = [
    { number: "EN / FR", label: "Bilingual Access", icon: FileText },
    { number: "Offline", label: "Queued Reporting", icon: UserCheck },
    { number: "10", label: "Cameroon Regions", icon: Users },
    { number: "Private", label: "Sensitive Evidence", icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
     {/* Hero Section */}
     <section className="relative overflow-hidden">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
          {/* Animated gradient orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 10}s`,
                }}
              ></div>
            ))}
          </div>
          
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        </div>
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 backdrop-blur-sm bg-background/50">
              🛡️ Protecting Communities Together
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your Safety is Our 
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Priority</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Report crimes, stay informed, and build safer communities with our comprehensive crime reporting platform. 
              Anonymous reporting, offline queuing, local safety notices, and official emergency call options—all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                onClick={openReportPopup}
              >
                <AlertTriangle className="mr-2 h-5 w-5" />
                Report Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary/5 backdrop-blur-sm hover:scale-105 transition-all duration-300"
                onClick={() => window.location.href = '/map'}
              >
                <MapPin className="mr-2 h-5 w-5" />
                View Crime Map
              </Button>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100vh) translateX(20px);
              opacity: 0;
            }
          }
          
          .animate-float {
            animation: float linear infinite;
          }
          
          .bg-grid-pattern {
            background-image: 
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px);
            background-size: 4rem 4rem;
          }
        `}</style>
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
            <h2 className="text-4xl font-bold text-foreground mb-4">How CrimeX Works</h2>
            <p className="text-xl text-muted-foreground">Clear, privacy-conscious reporting in three steps</p>
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
                Authorized operators triage reports and can assign them to a verified partner where an operational agreement exists.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">3. Act</h3>
              <p className="text-muted-foreground leading-relaxed">
                Follow your case status and receive updates. Connected responders record acknowledgement and action in the case timeline.
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
              <h2 className="text-4xl font-bold text-foreground mb-6">Emergency Assistance Tools</h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                CrimeX can queue an emergency record with your permission, capture location and private evidence, notify enabled trusted contacts, and keep official Cameroon numbers visible. A queued alert is not confirmation that an authority has received it.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Phone className="h-6 w-6 text-destructive mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Emergency Queue and Call Fallback</h4>
                    <p className="text-muted-foreground">Queue details for connected responders and call the appropriate official number directly</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-6 w-6 text-destructive mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Automatic Location Sharing</h4>
                    <p className="text-muted-foreground">GPS coordinates are attached after you grant browser permission</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Camera className="h-6 w-6 text-destructive mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Auto-Recording</h4>
                    <p className="text-muted-foreground">Private recording starts only after camera and microphone permission</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-destructive/10 to-accent/10 rounded-2xl p-8 text-center">
                <AlertTriangle className="h-20 w-20 text-destructive mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-foreground mb-4">Emergency Mode</h3>
                <p className="text-muted-foreground mb-6">Activate with a single touch when you need immediate help</p>
                <Button asChild size="lg" variant="destructive" className="w-full">
                  <a href="tel:117">
                  <Phone className="mr-2 h-5 w-5" />
                  Call Police 117
                  </a>
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
              Share verified local information, follow reported cases, and work with participating safety organizations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Crime Analytics</CardTitle>
                <CardDescription>
                  Authorized teams can review aggregate patterns from submitted reports by status, category, and region
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
                  Assign cases only to verified organizations configured for the relevant jurisdiction
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
              Join CrimeX today and be part of the solution. Together, we can build safer, 
              more connected communities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90" onClick={openReportPopup}>
                Report an Incident
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white bg-white/10" onClick={() => window.location.href = '/track'}>
                Track a Report
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      
      {/* Report Popup */}
      <ReportPopup
        isOpen={isReportOpen}
        onClose={closeReportPopup}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
};

export default Index;
