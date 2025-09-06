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
  const [chunkCount, setChunkCount] = useState(0);
  const [totalUploadSize, setTotalUploadSize] = useState(0);
  const [lastChunkTime, setLastChunkTime] = useState<number | null>(null);
  
  const chunks = useRef<Blob[]>([]);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadInterval = useRef<NodeJS.Timeout | null>(null);
  const currentLocation = useRef<GeolocationPosition | null>(null);
  const sessionStartTime = useRef<number | null>(null);
  const [savedChunks, setSavedChunks] = useState<Blob[]>([]);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [isFirstChunk, setIsFirstChunk] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const recordingSessionIdRef = useRef<string | null>(null);
  const isFirstChunkRef = useRef<boolean>(true);

  const downloadRecording = () => {
    if (savedChunks.length === 0) {
      logEvent('DOWNLOAD_FAILED_NO_CHUNKS');
      toast({
        title: "Download Failed",
        description: "No recording data available to download",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
  
    logEvent('DOWNLOAD_START', { chunkCount: savedChunks.length });
    
    const blob = new Blob(savedChunks, { type: "video/webm;codecs=vp9,opus" });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  
    URL.revokeObjectURL(url);
    
    logEvent('DOWNLOAD_COMPLETE', { 
      blobSize: blob.size,
      fileName: a.download 
    });
    
    toast({
      title: "Recording Downloaded",
      description: `File saved as ${a.download}`,
      duration: 3000,
    });
  };
  
  // Enhanced logging function
  const logEvent = (event: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const sessionTime = sessionStartTime.current ? Date.now() - sessionStartTime.current : 0;
    console.log(`[EMERGENCY] ${timestamp} (+${sessionTime}ms) ${event}:`, data || '');
  };

  // Send video chunk to server with session-based concatenation
  const sendVideoChunk = async (videoBlob: Blob, chunkIndex: number) => {
    if (!user) {
      logEvent('ERROR: No user authenticated for chunk upload');
      handleRecordingError('User not authenticated');
      return;
    }

    if (!recordingSessionIdRef.current) {
      logEvent('ERROR: No recording session ID available');
      handleRecordingError('Recording session not initialized');
      return;
    }

    const chunkStartTime = Date.now();
    logEvent('CHUNK_UPLOAD_START', {
      chunkIndex,
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      userId: user.id
    });

    try {
      // Convert blob to base64 using ArrayBuffer approach for better reliability
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          logEvent('CHUNK_READ_COMPLETE', {
            chunkIndex,
            resultType: typeof arrayBuffer,
            arrayBufferLength: arrayBuffer?.byteLength || 0,
            originalBlobSize: videoBlob.size
          });

          if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
            throw new Error('FileReader result is not an ArrayBuffer');
          }

          if (arrayBuffer.byteLength === 0) {
            throw new Error('ArrayBuffer is empty');
          }

          // Convert ArrayBuffer to base64
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
          }
          const base64Video = btoa(binaryString);

          if (!base64Video || base64Video.length === 0) {
            throw new Error('Base64 conversion resulted in empty string');
          }
          
          logEvent('BASE64_CONVERSION_SUCCESS', {
              chunkIndex,
            base64Length: base64Video.length,
            originalSize: videoBlob.size,
            compressionRatio: (base64Video.length / videoBlob.size).toFixed(2)
            });
          
          // Prepare payload with session-based concatenation
          const payload = {
            videoChunk: base64Video, // Use the properly converted base64
            chunkIndex,
            chunkSize: videoBlob.size,
            userId: user.id,
            recordingSessionId: recordingSessionIdRef.current, // Session ID to group chunks
            isFirstChunk: isFirstChunkRef.current, // Flag to indicate if this is the first chunk
            timestamp: new Date().toISOString(),
            location: currentLocation.current ? {
              latitude: currentLocation.current.coords.latitude,
              longitude: currentLocation.current.coords.longitude,
              accuracy: currentLocation.current.coords.accuracy,
              timestamp: currentLocation.current.timestamp
            } : null,
            emergencyType: 'panic_button'
          };
          

          logEvent('CHUNK_UPLOAD_PAYLOAD_READY', {
            chunkIndex,
            payloadKeys: Object.keys(payload),
            base64VideoLength: base64Video.length,
            hasLocation: !!payload.location,
            recordingSessionId: recordingSessionIdRef.current,
            isFirstChunk: isFirstChunkRef.current
          });

          // Send to Supabase function
          const uploadStartTime = Date.now();
          const { data, error } = await supabase.functions.invoke('video-stream', {
            body: payload
          });

          const uploadDuration = Date.now() - uploadStartTime;

          if (error) {
            logEvent('CHUNK_UPLOAD_ERROR', {
              chunkIndex,
              error: error.message,
              errorDetails: error,
              uploadDuration
            });
            throw error;
          } else {
            logEvent('CHUNK_UPLOAD_SUCCESS', {
              chunkIndex,
              response: data,
              uploadDuration,
              totalDuration: Date.now() - chunkStartTime
            });
            
            // Update UI state
            setChunkCount(prev => prev + 1);
            setTotalUploadSize(prev => prev + videoBlob.size);
            setLastChunkTime(Date.now());
            setUploadStatus(`Chunk ${chunkIndex}: ${(videoBlob.size / 1024).toFixed(1)}KB uploaded`);
            
            // Mark subsequent chunks as not first
            if (isFirstChunkRef.current) {
              setIsFirstChunk(false);
              isFirstChunkRef.current = false;
            }
          }
        } catch (processError) {
          logEvent('CHUNK_PROCESSING_ERROR', {
            chunkIndex,
            error: processError.message,
            stack: processError.stack
          });
          handleRecordingError(`Chunk ${chunkIndex} failed: ${processError.message}`, false);
        }
      };

      reader.onerror = (readerError) => {
        logEvent('FILEREADER_ERROR', {
          chunkIndex,
          error: readerError,
          readerState: reader.readyState
        });
        handleRecordingError(`Failed to read chunk ${chunkIndex}`, false);
      };

      reader.onloadstart = () => {
        logEvent('FILEREADER_START', { chunkIndex });
      };

      reader.readAsArrayBuffer(videoBlob);

    } catch (error) {
      logEvent('CHUNK_UPLOAD_EXCEPTION', {
        chunkIndex,
        error: error.message,
        stack: error.stack
      });
      handleRecordingError(`Chunk upload failed: ${error.message}`, false);
    }
  };

  // Handle recording errors - don't stop recording for individual chunk failures
  const handleRecordingError = (errorMessage: string, isCritical: boolean = false) => {
    logEvent('RECORDING_ERROR_HANDLER', { errorMessage, isRecording, isCritical });
    
    if (isCritical) {
    setError(errorMessage);
    
    if (isRecording) {
        logEvent('STOPPING_RECORDING_DUE_TO_CRITICAL_ERROR');
      stopRecording();
    }

    toast({
      title: "Emergency Recording Error",
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    });
    } else {
      // For non-critical errors (like individual chunk failures), just log and continue
      logEvent('NON_CRITICAL_ERROR_CONTINUING', { errorMessage });
      
      toast({
        title: "Upload Warning",
        description: `Some chunks failed to upload, but recording continues: ${errorMessage}`,
        variant: "default",
        duration: 3000,
      });
    }
  };

  // Enhanced location sharing with better error handling
  const shareLocation = async () => {
    logEvent('LOCATION_SHARING_START');
    setLocationStatus('Getting location...');
    
    if (!navigator.geolocation) {
      logEvent('GEOLOCATION_NOT_SUPPORTED');
      setLocationStatus('Geolocation not supported');
      setTimeout(() => setLocationSent(true), 1000);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    };

    logEvent('GEOLOCATION_REQUEST_START', options);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.current = position;
        logEvent('LOCATION_SUCCESS', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setLocationStatus('GPS location obtained');
        setLocationSent(true);
      },
      (geoError) => {
        logEvent('LOCATION_ERROR', {
          code: geoError.code,
          message: geoError.message
        });
        setLocationStatus(`Location error: ${geoError.message}`);
        setTimeout(() => setLocationSent(true), 1000);
      },
      options
    );
  };

  const startRecording = async () => {
    sessionStartTime.current = Date.now();
    logEvent('RECORDING_START_REQUESTED', { userId: user?.id });
    

    if (!user) {
      const errorMsg = 'Please log in to use emergency features';
      logEvent('RECORDING_START_FAILED_NO_USER');
      setError(errorMsg);
      return;
    }

    try {
      // Generate unique session ID for this recording
      const sessionId = `emergency_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setRecordingSessionId(sessionId);
      recordingSessionIdRef.current = sessionId;
      setIsFirstChunk(true);
      isFirstChunkRef.current = true;
      
      logEvent('RECORDING_SESSION_CREATED', { sessionId });
      
      // Reset state
      setError(null);
      setChunkCount(0);
      setTotalUploadSize(0);
      setLastChunkTime(null);

      logEvent('COUNTDOWN_START');
      setCountdown(3);
      
      // Enhanced countdown with vibration and audio cues
      for (let i = 3; i > 0; i--) {
        logEvent('COUNTDOWN_TICK', { remaining: i });
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCountdown(i - 1);
      }
      
      logEvent('COUNTDOWN_COMPLETE');
      
      // Share location and notify emergency contacts
      shareLocation();
      setEmergencyContacted(true);
      
      logEvent('REQUESTING_MEDIA_DEVICES');
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
      
      logEvent('MEDIA_STREAM_OBTAINED', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        streamId: mediaStream.id
      });
      
      setStream(mediaStream);
      
      // Check MediaRecorder support
      const mimeType = 'video/webm;codecs=vp9';
      const isSupported = MediaRecorder.isTypeSupported(mimeType);
      
      logEvent('MEDIARECORDER_SETUP', {
        mimeTypeSupported: isSupported,
        mimeType: mimeType
      });

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: isSupported ? mimeType : 'video/webm',
        videoBitsPerSecond: 1000000 // 1 Mbps
      });
      
      setMediaRecorder(recorder);
      chunks.current = [];
      let chunkIndex = 0;
      
      // Handle data available - send chunks to server in real-time
      recorder.ondataavailable = (e) => {
        const chunkTime = Date.now();
        const currentChunkIndex = chunkIndex++;
        
        if (e.data.size > 0) {
            chunks.current.push(e.data);
            setSavedChunks(prev => [...prev, e.data]); // ✅ keep locally
          
        const timeSinceStart = sessionStartTime.current ? chunkTime - sessionStartTime.current : 0;
        
        logEvent('CHUNK_AVAILABLE', {
            chunkIndex: currentChunkIndex,
          dataSize: e.data.size,
          timeSinceStart,
          timeSinceLastChunk: lastChunkTime ? chunkTime - lastChunkTime : 0
        });

          // Send chunk to server with error handling
          sendVideoChunk(e.data, currentChunkIndex).catch((error) => {
            logEvent('CHUNK_SEND_FAILED', {
              chunkIndex: currentChunkIndex,
              error: error.message
            });
            // Don't stop recording for individual chunk failures
          });
        } else {
          logEvent('EMPTY_CHUNK_RECEIVED', { chunkIndex: currentChunkIndex });
        }
      };
      // Set up event handlers before starting
      recorder.onstart = () => {
        logEvent('MEDIARECORDER_STARTED');
      };

      recorder.onstop = () => {
        logEvent('MEDIARECORDER_STOPPED', {
          totalChunks: chunks.current.length,
          totalSize: chunks.current.reduce((sum, chunk) => sum + chunk.size, 0)
        });
      };

      recorder.onerror = (event) => {
        logEvent('MEDIARECORDER_ERROR', { error: event });
        handleRecordingError('MediaRecorder error occurred', true);
      };
      
      // Start recording and send chunks every 2 seconds
      logEvent('STARTING_MEDIARECORDER', { timeslice: 2000 });
      recorder.start(2000);
      setIsRecording(true);
      setCountdown(null);

      // ⏱️ Auto-download after 5 seconds for testing
      setTimeout(() => {
        if (isRecording && savedChunks.length > 0) {
          logEvent('AUTO_DOWNLOAD_TRIGGER');
          downloadRecording();
        }
      }, 5000);
      
      // Show success message
      toast({
        title: "Emergency Recording Started",
        description: "Video is being streamed to emergency services",
        duration: 3000,
      });
      
      logEvent('RECORDING_STARTED_SUCCESSFULLY');
      
      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      logEvent('RECORDING_START_ERROR', {
        error: err.message,
        stack: err.stack,
        name: err.name
      });
      
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Camera/microphone permission denied. Please allow access and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera/microphone found. Please connect a device and try again.'
        : `Could not access camera/microphone: ${err.message}`;
      
      handleRecordingError(errorMessage, true);
      setCountdown(null);
    }
  };
  
  const stopRecording = () => {
    setIsStopping(true);
    logEvent('STOP_RECORDING_CALLED', {
      mediaRecorderState: mediaRecorder?.state,
      hasStream: !!stream,
      recordingDuration
    });
    
    // Stop the media recorder first
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      logEvent('STOPPING_MEDIARECORDER');
      try {
        mediaRecorder.stop();
        logEvent('MEDIARECORDER_STOPPED_SUCCESSFULLY');
      } catch (error) {
        logEvent('ERROR_STOPPING_MEDIARECORDER', { error: error.message });
      }
    }
    
    // Stop all tracks to release camera/microphone
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      logEvent('STOPPING_MEDIA_TRACKS', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length
      });

      // Stop each track individually with error handling
      stream.getTracks().forEach(track => {
        try {
          track.stop();
          logEvent('TRACK_STOPPED', { 
            kind: track.kind, 
            label: track.label,
            state: track.readyState 
          });
        } catch (error) {
          logEvent('ERROR_STOPPING_TRACK', { 
            kind: track.kind, 
            error: error.message 
          });
        }
      });
      
      // Clear the stream reference
      setStream(null);
      logEvent('STREAM_CLEARED');
    } else {
      logEvent('NO_STREAM_TO_STOP');
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
    setIsStopping(false);
    setMediaRecorder(null);
    setRecordingDuration(0);
    setLocationSent(false);
    setLocationStatus('');
    setEmergencyContacted(false);
    setUploadStatus('');
    setChunkCount(0);
    setTotalUploadSize(0);
    setLastChunkTime(null);
    setRecordingSessionId(null);
    recordingSessionIdRef.current = null;
    setIsFirstChunk(true);
    isFirstChunkRef.current = true;
    currentLocation.current = null;
    sessionStartTime.current = null;
    
    // Show completion message
    toast({
      title: "Emergency Recording Stopped",
      description: `Recording completed: ${chunkCount} chunks uploaded`,
      duration: 5000,
    });
    
    logEvent('RECORDING_SESSION_ENDED', {
      sessionId: recordingSessionIdRef.current,
      totalChunks: chunkCount,
      totalSize: totalUploadSize,
      duration: recordingDuration
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  useEffect(() => {
    return () => {
      logEvent('COMPONENT_CLEANUP');
      
      // Stop media recorder if active
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
          logEvent('CLEANUP_MEDIARECORDER_STOPPED');
        } catch (error) {
          logEvent('CLEANUP_ERROR_STOPPING_MEDIARECORDER', { error: error.message });
        }
      }
      
      // Stop all media tracks to release camera/microphone
      if (stream) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
            logEvent('CLEANUP_TRACK_STOPPED', { kind: track.kind });
          } catch (error) {
            logEvent('CLEANUP_ERROR_STOPPING_TRACK', { 
              kind: track.kind, 
              error: error.message 
            });
          }
        });
        logEvent('CLEANUP_STREAM_RELEASED');
      }
      
      // Clear all intervals
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        logEvent('CLEANUP_DURATION_INTERVAL_CLEARED');
      }
      
      if (uploadInterval.current) {
        clearInterval(uploadInterval.current);
        logEvent('CLEANUP_UPLOAD_INTERVAL_CLEARED');
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
              {isStopping && (
                <div className="flex items-center text-yellow-600 text-xs">
                  <div className="h-4 w-4 mr-2 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Stopping recording and releasing camera...</span>
                  <div className="ml-auto w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                </div>
              )}
              {uploadStatus && (
                <div className="flex items-center text-green-600 text-xs">
                  <Shield className="h-4 w-4 mr-2" />
                  <span>{uploadStatus}</span>
                  <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
              {/* Upload Statistics */}
              {chunkCount > 0 && (
                <div className="flex items-center text-purple-600 text-xs">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span>Chunks: {chunkCount} | Size: {formatBytes(totalUploadSize)}</span>
                </div>
              )}
              
              {/* Session ID Display */}
              {recordingSessionId && (
                <div className="flex items-center text-slate-500 text-xs">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>
                  <span className="truncate">Session: {recordingSessionId.split('_').pop()}</span>
                </div>
              )}
              
              {/* Manual Download Button for Testing */}
              {savedChunks.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <button
                    onClick={downloadRecording}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center"
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Download Recording ({savedChunks.length} chunks)
                  </button>
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
              onClick={() => {
                logEvent('STOP_BUTTON_CLICKED');
                stopRecording();
              }}
              disabled={isStopping}
              className={`h-20 w-20 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-2xl transform hover:scale-110 transition-all duration-200 flex flex-col items-center justify-center border-4 border-white ${
                isStopping ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isStopping ? (
                <>
                  <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold mt-1">STOPPING</span>
                </>
              ) : (
                <>
                  <Square className="h-8 w-8 fill-current" />
                  <span className="text-xs font-bold mt-1">STOP</span>
                </>
              )}
            </Button>
            
            {/* Pulsing Border */}
            <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-pulse"></div>
          </div>
        ) : (
          /* Emergency Activation Button */
          <div className="relative">
            <Button
              onClick={() => {
                logEvent('EMERGENCY_BUTTON_CLICKED', { 
                  isRecording, 
                  countdown, 
                  hasUser: !!user 
                });
                if (!isRecording && countdown === null) {
                  startRecording();
                }
              }}
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
      <style>{`
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