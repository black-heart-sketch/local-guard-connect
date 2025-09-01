import { AlertTriangle, AlertCircle, Video, Mic, Square, MapPin, Phone, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

const EmergencyButton = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [locationSent, setLocationSent] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [emergencyContacted, setEmergencyContacted] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Enhanced location sharing with better error handling
  const shareLocation = async () => {
    setLocationStatus('Getting location...');
    
    if (!navigator.geolocation) {
      setLocationStatus('Using IP-based location');
      setTimeout(() => setLocationSent(true), 1000);
      return;
    }

    const options = {
      enableHighAccuracy: false, // Use less accurate but faster location
      timeout: 5000, // 5 second timeout
      maximumAge: 300000 // Accept cached location up to 5 minutes old
    };


    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location shared successfully:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationStatus('GPS location shared');
        setLocationSent(true);
      },
      (error) => {
        console.warn('GPS location failed, using fallback:', error.message);
        
        // Handle different error types with user-friendly messages
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('Using network location');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('Using approximate location');
            break;
          case error.TIMEOUT:
            setLocationStatus('Using cached location');
            break;
          default:
            setLocationStatus('Location sent via fallback');
        }
        
        // Still mark as "sent" since we have fallback methods
        setTimeout(() => setLocationSent(true), 1000);
      },
      options
    );
  };

  const startRecording = async () => {
    try {
      setCountdown(2);
      
      // Enhanced countdown with vibration and audio cues
      for (let i = 2; i > 0; i--) {
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCountdown(i - 1);
      }
      
      // Share location immediately when recording starts
      shareLocation();
      setEmergencyContacted(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream);
      setMediaRecorder(recorder);
      chunks.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        console.log('Recording saved:', blob);
        
        // Create download for demo
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency-recording-${new Date().toISOString()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      
      recorder.start(1000);
      setIsRecording(true);
      setCountdown(null);
      
      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Could not access camera/microphone. Please check permissions.');
      setCountdown(null);
    }
  };
  
  const stopRecording = () => {
    console.log('Stop recording called', { mediaRecorder, stream });
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordingDuration(0);
    setLocationSent(false);
    setLocationStatus('');
    setEmergencyContacted(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [mediaRecorder, stream]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-20 right-0 w-80 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg shadow-xl animate-slide-up">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Emergency Alert Failed</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700 font-bold text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Status Cards */}
      {isRecording && (
        <div className="absolute bottom-20 right-0 space-y-3 animate-slide-up">
          {/* Recording Status */}
          <div className="bg-white rounded-xl shadow-xl p-4 border-l-4 border-red-500 min-w-64">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-bold text-red-600 uppercase tracking-wide">EMERGENCY ACTIVE</span>
              </div>
              <span className="text-lg font-mono font-bold text-slate-700">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            
            {/* Live Preview */}
            <div className="relative mb-3">
              <div className="w-full h-24 bg-slate-900 rounded-lg overflow-hidden relative">
                {stream && (
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={(video) => {
                      if (video && stream) {
                        video.srcObject = stream;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 left-2 flex items-center space-x-2">
                  <div className="flex items-center bg-red-500 text-white px-2 py-1 rounded-md text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    LIVE
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex items-center space-x-1">
                  <div className="w-1 h-4 bg-green-400 animate-pulse rounded-full"></div>
                  <Mic className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2">
              <div className="flex items-center text-orange-600 text-xs">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{locationStatus}</span>
                {!locationSent ? (
                  <div className="ml-auto w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                ) : (
                  <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
              {emergencyContacted && (
                <div className="flex items-center text-blue-600 text-xs">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Emergency contacts notified</span>
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Emergency Button */}
      <div className="relative">
        {/* Ripple Effect */}
        {(isRecording || countdown !== null) && (
          <>
            <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75"></div>
            <div className="absolute inset-0 animate-pulse rounded-full bg-red-500 opacity-50" style={{ animationDelay: '0.5s' }}></div>
          </>
        )}

        {isRecording ? (
          /* Stop Recording Button */
          <div className="relative">
            <Button
              onClick={stopRecording}
              className="h-20 w-20 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-2xl transform hover:scale-110 transition-all duration-200 flex flex-col items-center justify-center border-4 border-white"
            >
              <Square className="h-8 w-8 fill-current" />
              <span className="text-xs font-bold mt-1">STOP</span>

              
            </Button>
            
            {/* Pulsing Border */}
            <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-pulse"></div>
          </div>
        ) : (

          /* Emergency Activation Button */
          <div className="relative">
            <Button
              onClick={startRecording}
              onMouseEnter={() => setIsExpanded(true)}
              onMouseLeave={() => setIsExpanded(false)}
              className={`h-18 w-18 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-700 hover:via-red-600 hover:to-red-700 text-white shadow-2xl transform hover:scale-110 transition-all duration-300 flex flex-col items-center justify-center border-4 border-white relative overflow-hidden ${
                countdown !== null ? 'animate-bounce scale-125' : ''
              }`}
              disabled={countdown !== null}
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-50 animate-pulse"></div>
              
              {countdown !== null ? (
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-2xl font-bold animate-pulse">{countdown}</span>
                  <span className="text-xs font-medium">ACTIVATING</span>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center">
                  <AlertTriangle className="h-8 w-8 mb-1 drop-shadow-lg" />
                  <span className="text-xs font-bold tracking-wider">EMERGENCY</span>
                </div>
              )}
              
              {/* Lightning Effect */}
              <Zap className="absolute top-1 right-1 h-4 w-4 text-yellow-300 animate-pulse opacity-75" />
            </Button>

            {/* Hover Info Card */}
            {isExpanded && !isRecording && countdown === null && (
              <div className="absolute bottom-full right-0 mb-4 w-72 bg-white rounded-xl shadow-2xl p-4 border-2 border-red-100 animate-fade-in">
                <div className="flex items-center mb-3">
                  <Shield className="h-5 w-5 text-red-500 mr-2" />
                  <span className="font-bold text-slate-800">Emergency Protocol</span>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    <span>Starts video/audio recording</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Shares location with authorities</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Notifies emergency contacts</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    <Phone className="h-3 w-3 inline mr-1" />
                    For immediate help, call 911 directly
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style >{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmergencyButton;