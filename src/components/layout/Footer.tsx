import { Shield, Heart, Users, MapPin, Phone, Mail, Facebook, Twitter, Instagram } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-primary/20 rounded-xl backdrop-blur-sm border border-primary/30">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Local Guard Connect
              </span>
            </div>
            <p className="text-slate-300 mb-6 text-lg leading-relaxed max-w-md">
              Empowering communities with cutting-edge technology to create safer neighborhoods. 
              Together, we build a network of protection and trust.
            </p>
            
            {/* Stats */}
            <div className="flex space-x-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Support</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Secure</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">∞</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Anonymous</div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Access</h3>
            <ul className="space-y-3">
              <li>
                <a href="#report" className="text-slate-300 hover:text-primary transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-primary rounded-full mr-3 group-hover:w-2 transition-all duration-200"></span>
                  Report Crime
                </a>
              </li>
              <li>
                <a href="#map" className="text-slate-300 hover:text-primary transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-primary rounded-full mr-3 group-hover:w-2 transition-all duration-200"></span>
                  Crime Map
                </a>
              </li>
              <li>
                <a href="#missing" className="text-slate-300 hover:text-primary transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-primary rounded-full mr-3 group-hover:w-2 transition-all duration-200"></span>
                  Missing Persons
                </a>
              </li>
              <li>
                <a href="#emergency" className="text-slate-300 hover:text-primary transition-colors duration-200 flex items-center group">
                  <span className="w-1 h-1 bg-primary rounded-full mr-3 group-hover:w-2 transition-all duration-200"></span>
                  Emergency Help
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Stay Connected</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-slate-300">
                <Phone className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm">Emergency: 911</span>
              </div>
              <div className="flex items-center text-slate-300">
                <Mail className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm">support@localguard.com</span>
              </div>
              <div className="flex items-center text-slate-300">
                <MapPin className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm">Yaoundé, Cameroon</span>
              </div>
            </div>
            
            {/* Social Icons */}
            <div className="flex space-x-3">
              <a href="#" className="p-2 bg-slate-800 hover:bg-primary transition-colors duration-200 rounded-lg group">
                <Facebook className="h-4 w-4 group-hover:text-white" />
              </a>
              <a href="#" className="p-2 bg-slate-800 hover:bg-primary transition-colors duration-200 rounded-lg group">
                <Twitter className="h-4 w-4 group-hover:text-white" />
              </a>
              <a href="#" className="p-2 bg-slate-800 hover:bg-primary transition-colors duration-200 rounded-lg group">
                <Instagram className="h-4 w-4 group-hover:text-white" />
              </a>
            </div>
          </div>
        </div>

        {/* Mission Statement Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-2xl p-6 mb-8 border border-primary/20 backdrop-blur-sm">
          <div className="flex items-center justify-center text-center">
            <Heart className="h-5 w-5 text-primary mr-3 animate-pulse" />
            <span className="text-slate-200 text-sm font-medium">
              "Every voice matters. Every report counts. Together we make our communities safer."
            </span>
            <Users className="h-5 w-5 text-primary ml-3" />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <p className="text-slate-400 text-sm">
                © {currentYear} Local Guard Connect. Building safer communities through innovation.
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#privacy" className="text-slate-400 hover:text-primary text-sm transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#terms" className="text-slate-400 hover:text-primary text-sm transition-colors duration-200">
                Terms of Service
              </a>
              <a href="#accessibility" className="text-slate-400 hover:text-primary text-sm transition-colors duration-200">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500"></div>
    </footer>
  );
};

export default Footer;