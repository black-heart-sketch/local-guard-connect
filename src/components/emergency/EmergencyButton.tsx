import { AlertCircle, AlertTriangle, Camera, MapPin, Mic, Phone, Shield, Square, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createEmergencyRecordingStream } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type StreamUpload = Awaited<ReturnType<typeof createEmergencyRecordingStream>>;

function message(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Unexpected recording error';
}

const EmergencyButton = () => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState('Location not requested');
  const [transferStatus, setTransferStatus] = useState('');
  const [streamedBytes, setStreamedBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<StreamUpload | null>(null);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const finalizingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localSegmentsRef = useRef<Blob[]>([]);

  const stopTracks = () => {
    const active = mediaStreamRef.current;
    active?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    setMediaStream(null);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const finishTransfer = async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    try {
      await writeChainRef.current;
      const upload = uploadRef.current;
      if (upload) {
        await upload.writer.close();
        const result = await upload.completed;
        setTransferStatus(`Private stream saved (${formatBytes(result.size)})`);
      }
      toast({ title: 'Recording stopped', description: 'Camera and microphone are off. The emergency remains queued until a responder acknowledges it.' });
    } catch (reason) {
      setError(message(reason));
      toast({ title: 'Stream transfer ended with an error', description: message(reason), variant: 'destructive' });
    } finally {
      uploadRef.current = null;
      recorderRef.current = null;
      writeChainRef.current = Promise.resolve();
      finalizingRef.current = false;
      setStopping(false);
      setDuration(0);
    }
  };

  const getLocation = () => new Promise<{ latitude: number; longitude: number; accuracy?: number } | undefined>(resolve => {
    if (!navigator.geolocation) { setLocationStatus('Location unavailable'); resolve(undefined); return; }
    setLocationStatus('Getting GPS location…');
    navigator.geolocation.getCurrentPosition(position => {
      setLocationStatus(`GPS obtained (±${Math.round(position.coords.accuracy)} m)`);
      resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
    }, () => { setLocationStatus('Location permission unavailable'); resolve(undefined); }, { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 });
  });

  const startRecording = async () => {
    if (recording || stopping || countdown !== null) return;
    setError(null); setTransferStatus(''); setStreamedBytes(0); setDuration(0); localSegmentsRef.current = [];
    try {
      for (let remaining = 3; remaining > 0; remaining -= 1) {
        setCountdown(remaining);
        navigator.vibrate?.(150);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(0);
      const [stream, location] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }),
        getLocation(),
      ]);
      mediaStreamRef.current = stream;
      setMediaStream(stream);

      const nextSessionId = `emergency_${Date.now()}_${crypto.randomUUID()}`;
      const upload = await createEmergencyRecordingStream({ recordingSessionId: nextSessionId, type: 'panic_button', location });
      uploadRef.current = upload;
      setSessionId(nextSessionId);
      setTransferStatus('Encrypted transport open — streaming to private storage');
      writeChainRef.current = Promise.resolve();

      const preferredType = 'video/webm;codecs=vp9,opus';
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(preferredType) ? preferredType : 'video/webm',
        videoBitsPerSecond: 1_000_000,
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (!event.data.size || !uploadRef.current) return;
        localSegmentsRef.current.push(event.data);
        setStreamedBytes(total => total + event.data.size);
        writeChainRef.current = writeChainRef.current.then(async () => {
          const bytes = new Uint8Array(await event.data.arrayBuffer());
          await uploadRef.current?.writer.write(bytes);
        });
      };
      recorder.onerror = () => { setError('Media recorder failed'); stopRecording(); };
      recorder.onstop = () => { void finishTransfer(); };
      recorder.start(1000);
      setRecording(true);
      setCountdown(null);
      timerRef.current = setInterval(() => setDuration(value => value + 1), 1000);
      toast({ title: 'Emergency recording started', description: 'A single live stream is being transferred to private CrimeX storage. Call an official number if danger is immediate.' });
    } catch (reason) {
      stopTracks();
      setCountdown(null); setRecording(false); setStopping(false); setError(message(reason));
      try { await uploadRef.current?.writer.abort(reason); } catch { /* transport already closed */ }
      uploadRef.current = null;
      toast({ title: 'Could not start recording', description: message(reason), variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (stopping) return;
    setStopping(true);
    setRecording(false);
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.requestData(); } catch { /* some browsers do not allow requestData during shutdown */ }
      recorder.stop();
    } else {
      void finishTransfer();
    }
    // Release camera and microphone immediately; transfer finalization continues separately.
    stopTracks();
  };

  const downloadLocalCopy = () => {
    if (!localSegmentsRef.current.length) return;
    const url = URL.createObjectURL(new Blob(localSegmentsRef.current, { type: 'video/webm' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `emergency-recording-${Date.now()}.webm`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => () => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* already stopping */ } }
    stopTracks();
    void uploadRef.current?.writer.abort('Component closed');
  }, []);

  return <div className="fixed bottom-6 right-6 z-50" data-testid="emergency-recorder">
    {error && <div className="absolute bottom-24 right-0 flex w-80 gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-red-700 shadow-xl"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="font-medium">Recording problem</p><p className="text-xs">{error}</p></div></div>}

    {(recording || stopping) && <div className="absolute bottom-24 right-0 w-80 rounded-xl border-l-4 border-red-500 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between"><span className="flex items-center text-sm font-bold text-red-600"><span className="mr-2 h-3 w-3 animate-pulse rounded-full bg-red-500" />EMERGENCY ACTIVE</span><span className="font-mono font-bold">{formatDuration(duration)}</span></div>
      <div className="relative mb-3 h-32 overflow-hidden rounded-lg bg-slate-900">{mediaStream && <video autoPlay muted playsInline ref={node => { if (node) node.srcObject = mediaStream; }} className="h-full w-full object-cover" />}<span className="absolute left-2 top-2 flex items-center rounded bg-red-600 px-2 py-1 text-xs text-white"><Video className="mr-1 h-3 w-3" />LIVE</span><Mic className="absolute right-2 top-2 h-4 w-4 text-white" /></div>
      <div className="space-y-2 text-xs"><p className="flex items-center text-orange-700"><MapPin className="mr-2 h-4 w-4" />{locationStatus}</p><p className="flex items-center text-blue-700"><Shield className="mr-2 h-4 w-4" />{stopping ? 'Closing stream and saving final bytes…' : transferStatus}</p><p>{formatBytes(streamedBytes)} transferred through one live request</p>{sessionId && <p className="truncate text-slate-500">Session: {sessionId.split('_').pop()}</p>}</div>
    </div>}

    {!recording && !stopping && transferStatus && <div className="absolute bottom-24 right-0 w-80 rounded-lg bg-white p-3 text-xs shadow-xl"><p className="text-green-700">{transferStatus}</p>{localSegmentsRef.current.length > 0 && <button className="mt-2 flex items-center text-blue-700" onClick={downloadLocalCopy}><Camera className="mr-1 h-3 w-3" />Download local copy</button>}</div>}

    <div className="relative" onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
      {(recording || countdown !== null) && <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-60" />}
      <Button onClick={recording ? stopRecording : () => void startRecording()} disabled={stopping || countdown !== null} className="relative h-20 w-20 rounded-full border-4 border-white bg-red-600 p-0 text-white shadow-2xl hover:bg-red-700">
        {stopping ? <span className="text-xs font-bold">STOPPING</span> : recording ? <span className="flex flex-col items-center"><Square className="h-8 w-8 fill-current" /><span className="text-xs font-bold">STOP</span></span> : countdown !== null ? <span className="text-2xl font-bold">{countdown}</span> : <span className="flex flex-col items-center"><AlertTriangle className="h-8 w-8" /><span className="text-xs font-bold">EMERGENCY</span></span>}
      </Button>
      {expanded && !recording && !stopping && countdown === null && <div className="absolute bottom-full right-0 mb-4 w-72 rounded-xl border bg-white p-4 shadow-2xl"><p className="mb-2 flex items-center font-bold"><Shield className="mr-2 h-5 w-5 text-red-500" />Emergency recording</p><p className="text-sm text-slate-600">Starts one continuous private upload after camera, microphone, and location permissions. Stopping turns the camera and microphone off immediately.</p><p className="mt-3 border-t pt-3 text-xs text-slate-500"><Phone className="mr-1 inline h-3 w-3" />Police 117 · Gendarmerie 113 · Fire 118 · SAMU 119</p></div>}
    </div>
  </div>;
};

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default EmergencyButton;
