import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, MapPin, FileText, AlertTriangle, X, Loader2, CheckCircle, User, UserCog, UserX, AlertCircle as AlertCircleIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const crimeTypes = [
  "Theft",
  "Vandalism", 
  "Assault",
  "Burglary",
  "Robbery",
  "Suspicious Activity",
  "Domestic Violence",
  "Drug Activity",
  "Fraud/Scam",
  "Missing Person",
  "Other"
];

interface ReportPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: {
    crimeType: string;
    location: string;
    description: string;
    files: File[];
    isAnonymous: boolean;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }) => Promise<{ success: boolean }>;
}

export const ReportPopup = ({ isOpen, onClose, onSubmit }: ReportPopupProps) => {
  const { toast } = useToast();
  const [crimeType, setCrimeType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showAnonymityPrompt, setShowAnonymityPrompt] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow for closing animation
      const timer = setTimeout(() => {
        setCrimeType("");
        setLocation("");
        setDescription("");
        setFiles([]);
        setCoordinates(null);
        setLocationStatus('idle');
        setSubmitError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Check file sizes (limit to 10MB per file)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crimeType || !location || !description) return;
    
    // Show anonymity prompt before submitting
    setShowAnonymityPrompt(true);
  };

  const confirmSubmit = async (isAnonymous: boolean) => {
    setShowAnonymityPrompt(false);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await onSubmit({
        crimeType,
        location,
        description,
        files,
        isAnonymous,
        coordinates
      });

      if (result.success) {
        toast({
          title: "Report Submitted",
          description: isAnonymous 
            ? "Your anonymous report has been submitted successfully."
            : "Your report has been submitted successfully.",
          variant: "default",
        });
        onClose();
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitError("Failed to submit report. Please try again.");
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSubmit = () => {
    setShowAnonymityPrompt(false);
  };

  // Enhanced location fetching with reverse geocoding simulation
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationStatus('loading');
    setCoordinates(null);

    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation. Please enter your location manually.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      setLocationStatus('error');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Use cached location if less than 1 minute old
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Simulate reverse geocoding (in real app, use Google Maps API, OpenStreetMap, etc.)
          // For demo, we'll create a readable address
          const readableAddress = await simulateReverseGeocode(latitude, longitude);
          setLocation(readableAddress);
          setLocationStatus('success');
          
          console.log('Location obtained:', {
            coords: { latitude, longitude },
            accuracy: position.coords.accuracy,
            address: readableAddress
          });
        } catch (error) {
          // Fallback to coordinates if reverse geocoding fails
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLocationStatus('success');
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationStatus('error');
        
        let errorMessage = "Unable to retrieve your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }
        
        alert(errorMessage + " Please enter the location manually.");
      },
      options
    );
    
    setIsGettingLocation(false);
  };

  // Simulate reverse geocoding (replace with real API in production)
  const simulateReverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This is a mock - in real app, use:
    // - Google Maps Geocoding API
    // - OpenStreetMap Nominatim
    // - MapBox Geocoding API
    
    // Mock address based on Yaoundé coordinates (since you're in Cameroon)
    const mockAddresses = [
      "123 Avenue Kennedy, Yaoundé, Centre Region, Cameroon",
      "456 Rue de la Réunification, Yaoundé, Centre Region, Cameroon", 
      "789 Boulevard du 20 Mai, Yaoundé, Centre Region, Cameroon",
      "321 Avenue Charles de Gaulle, Yaoundé, Centre Region, Cameroon"
    ];
    
    return mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
  };

  const getLocationButtonContent = () => {
    if (isGettingLocation) {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Getting location...
        </>
      );
    }
    
    if (locationStatus === 'success') {
      return (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          Location obtained
        </>
      );
    }
    
    return (
      <>
        <MapPin className="h-3 w-3" />
        Use my current location
      </>
    );
  };

  return (
    <>
      {/* Anonymity Prompt Dialog */}
      <Dialog open={showAnonymityPrompt} onOpenChange={setShowAnonymityPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-500" />
              Submit Report
            </DialogTitle>
            <DialogDescription>
              How would you like to submit this report?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-left p-6 h-auto"
                onClick={() => confirmSubmit(false)}
                disabled={isSubmitting}
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Submit with my account</p>
                    <p className="text-sm text-muted-foreground">
                      Your name and contact information will be attached to the report.
                    </p>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start text-left p-6 h-auto"
                onClick={() => confirmSubmit(true)}
                disabled={isSubmitting}
              >
                <div className="flex items-center gap-3">
                  <UserX className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Submit anonymously</p>
                    <p className="text-sm text-muted-foreground">
                      Your identity will not be shared with authorities.
                    </p>
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={cancelSubmit}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Report Form */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            File a Crime Report
          </DialogTitle>
          <DialogDescription>
            Provide details about the incident. All information will be kept confidential and secure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Crime Type */}
          <div className="space-y-2">
            <Label htmlFor="crimeType" className="text-sm font-medium">
              Type of Incident *
            </Label>
            <select
              id="crimeType"
              value={crimeType}
              onChange={(e) => setCrimeType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              required
            >
              <option value="">Select incident type</option>
              {crimeTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="location" className="text-sm font-medium">
                Location *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className={`text-xs h-auto p-2 hover:bg-primary/10 transition-colors ${
                  locationStatus === 'success' ? 'text-green-600' : 'text-primary'
                }`}
              >
                {getLocationButtonContent()}
              </Button>
            </div>
            <Input
              id="location"
              placeholder="Enter location, address, or landmark"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="transition-colors focus:ring-2 focus:ring-primary"
              required
            />
            {locationStatus === 'loading' && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Obtaining your location...
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of the incident including when it happened, who was involved, and any other relevant details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="transition-colors focus:ring-2 focus:ring-primary resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/1000 characters
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Attachments (Photos/Videos/Audio)
            </Label>
            <div className="flex flex-col gap-3">
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="relative group flex items-center justify-between p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          {file.type.startsWith('image/') ? '🖼️' : 
                           file.type.startsWith('video/') ? '🎥' : 
                           file.type.startsWith('audio/') ? '🎵' : '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors py-6"
              >
                <FileText className="h-5 w-5 mr-2" />
                {files.length > 0 ? `Add More Files (${files.length} selected)` : 'Add Evidence Files'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Maximum file size: 10MB per file. Supported formats: Images, Videos, Audio
              </p>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !crimeType || !location || !description}
              className="px-6 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start gap-2">
              <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ReportPopup;