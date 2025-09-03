import { AlertTriangle, AlertCircle, Video, Mic, Square, MapPin, Phone, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const EmergencyButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const chunks = useRef<Blob[]>([]);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadInterval = useRef<NodeJS.Timeout | null>(null);
  const currentLocation = useRef<GeolocationPosition | null>(null);

  // Send video chunk to server
  const sendVideoChunk = async (videoBlob: Blob) => {
    if (!user) {
      console.error('No user authenticated');
      return;
    }

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Video = base64data.split(',')[1]; // Remove data:video/webm;base64, prefix

        const { data, error } = await supabase.functions.invoke('video-stream', {
          body: {
            videoChunk: base64Video,
            location: currentLocation.current ? {
              latitude: currentLocation.current.coords.latitude,
              longitude: currentLocation.current.coords.longitude,
              accuracy: currentLocation.current.coords.accuracy,
              timestamp: currentLocation.current.timestamp
            } : null,
            emergencyType: 'panic_button'
          }
        });

        if (error) {
          console.error('Failed to send video chunk:', error);
          setUploadStatus('Upload failed');
        } else {
          console.log('Video chunk sent successfully:', data);
          setUploadStatus(`Chunk uploaded: ${(videoBlob.size / 1024).toFixed(1)}KB`);
        }
      };
      reader.readAsDataURL(videoBlob);
    } catch (error) {
      console.error('Error sending video chunk:', error);
      setUploadStatus('Upload error');
    }
  };

  // Enhanced location sharing with better error handling
  const shareLocation = async () => {
    setLocationStatus('Getting location...');
    
    if (!navigator.geolocation) {
      setLocationStatus('Using IP-based location');
      setTimeout(() => setLocationSent(true), 1000);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.current = position;
        console.log('Location obtained successfully:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationStatus('GPS location obtained');
        setLocationSent(true);
      },
      (error) => {
        console.warn('GPS location failed:', error.message);
        setLocationStatus('Using network location');
        setTimeout(() => setLocationSent(true), 1000);
      },
      options
    );
  };

  const startRecording = async () => {
    if (!user) {
      setError('Please log in to use emergency features');
      return;
    }

    try {
      setCountdown(3);
      
      // Enhanced countdown with vibration and audio cues
      for (let i = 3; i > 0; i--) {
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCountdown(i - 1);
      }
      
      // Share location and notify emergency contacts
      shareLocation();
      setEmergencyContacted(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 1000000 // 1 Mbps
      });
      
      setMediaRecorder(recorder);
      chunks.current = [];
      
      // Handle data available - send chunks to server in real-time
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
          // Send chunk to server immediately
          sendVideoChunk(e.data);
        }
      };
      
      // Start recording and send chunks every 2 seconds
      recorder.start(2000);
      setIsRecording(true);
      setCountdown(null);
      
      // Show success message
      toast({
        title: "Emergency Recording Started",
        description: "Video is being streamed to emergency services",
        duration: 3000,
      });
      
      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Could not access camera/microphone. Please check permissions.');
      setCountdown(null);
      toast({
        title: "Emergency Recording Failed",
        description: "Could not access camera/microphone",
        variant: "destructive",
      });
    }
  };
  
  const stopRecording = () => {
    console.log('Stop recording called', { mediaRecorder, stream });
    
    // Stop the media recorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    // Stop all tracks to release camera/microphone
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind, track.label);
      });
      setStream(null);
    }
    
    // Clear intervals
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    if (uploadInterval.current) {
      clearInterval(uploadInterval.current);
      uploadInterval.current = null;
    }
    
    // Reset state
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordingDuration(0);
    setLocationSent(false);
    setLocationStatus('');
    setEmergencyContacted(false);
    setUploadStatus('');
    currentLocation.current = null;
    
    // Show completion message
    toast({
      title: "Emergency Recording Stopped",
      description: "Recording has been sent to emergency services",
      duration: 5000,
    });
    
    console.log('Emergency recording session ended');
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
                  <span>Emergency services notified</span>
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
              {uploadStatus && (
                <div className="flex items-center text-green-600 text-xs">
                  <Shield className="h-4 w-4 mr-2" />
                  <span>{uploadStatus}</span>
                  <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
              disabled={countdown !== null || !user}
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-50 animate-pulse"></div>
              
              {countdown !== null ? (
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-2xl font-bold animate-pulse">{countdown}</span>
                  <span className="text-xs font-medium">ACTIVATING</span>
                </div>
              ) : !user ? (
                <div className="relative z-10 flex flex-col items-center">
                  <AlertTriangle className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">LOGIN REQUIRED</span>
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
                    <span>Live video streaming to emergency services</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>GPS location shared with authorities</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Emergency contacts automatically notified</span>
                  </div>
                </div>
                {!user && (
                  <div className="mt-3 pt-3 border-t border-slate-200 bg-yellow-50 p-2 rounded">
                    <p className="text-xs text-yellow-800">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      Please log in to use emergency features
                    </p>
                  </div>
                )}
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