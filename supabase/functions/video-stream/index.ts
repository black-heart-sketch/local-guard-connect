import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { 
      videoChunk, 
      location, 
      emergencyType = 'general',
      recordingSessionId,
      isFirstChunk = false,
      chunkIndex = 0,
      chunkSize = 0
    } = body;

    if (!videoChunk) {
      return new Response(
        JSON.stringify({ error: 'No video data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recordingSessionId) {
      return new Response(
        JSON.stringify({ error: 'No recording session ID provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received video chunk from user ${user.id}:`, {
      sessionId: recordingSessionId,
      chunkIndex,
      chunkSize: videoChunk.length,
      isFirstChunk,
      location: location,
      emergencyType: emergencyType,
      timestamp: new Date().toISOString()
    });

    // Convert base64 video chunk to buffer
    const videoBuffer = Uint8Array.from(atob(videoChunk), c => c.charCodeAt(0));
    
    // Check if this session already exists in the database
    const { data: existingSession, error: sessionError } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('recording_session_id', recordingSessionId)
      .single();

    let videoPath: string;
    let totalChunkSize: number;

    if (isFirstChunk || !existingSession) {
      // First chunk or new session - create new record
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `emergency-${user.id}-${recordingSessionId}-${timestamp}.webm`;
      
      // Store video chunk in Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('emergency-videos')
        .upload(filename, videoBuffer, {
          contentType: 'video/webm',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Video upload failed:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to store video chunk' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      videoPath = uploadData.path;
      totalChunkSize = videoBuffer.length;

      // Create new emergency log entry
      const { error: logError } = await supabase
        .from('emergency_logs')
        .insert({
          user_id: user.id,
          emergency_type: emergencyType,
          video_path: videoPath,
          location_data: location,
          chunk_size: totalChunkSize,
          recording_session_id: recordingSessionId,
          chunk_count: 1,
          status: 'recording'
        });

      if (logError) {
        console.warn('Failed to log emergency:', logError);
      }

      console.log(`🚨 NEW EMERGENCY SESSION: ${recordingSessionId} started by user ${user.id}`);

    } else {
      // Subsequent chunk - append to existing video file
      try {
        // Download existing video file
        const { data: existingVideo, error: downloadError } = await supabase.storage
          .from('emergency-videos')
          .download(existingSession.video_path);

        if (downloadError) {
          console.error('Failed to download existing video:', downloadError);
          return new Response(
            JSON.stringify({ error: 'Failed to retrieve existing video' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Convert existing video to buffer and concatenate with new chunk
        const existingBuffer = new Uint8Array(await existingVideo.arrayBuffer());
        const concatenatedBuffer = new Uint8Array(existingBuffer.length + videoBuffer.length);
        concatenatedBuffer.set(existingBuffer);
        concatenatedBuffer.set(videoBuffer, existingBuffer.length);

        // Upload concatenated video back to storage
        const { error: updateError } = await supabase.storage
          .from('emergency-videos')
          .update(existingSession.video_path, concatenatedBuffer, {
            contentType: 'video/webm',
            cacheControl: '3600'
          });

        if (updateError) {
          console.error('Failed to update video with new chunk:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to append video chunk' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        videoPath = existingSession.video_path;
        totalChunkSize = existingSession.chunk_size + videoBuffer.length;

        // Update emergency log entry
        const { error: updateLogError } = await supabase
          .from('emergency_logs')
          .update({
            chunk_size: totalChunkSize,
            chunk_count: existingSession.chunk_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('recording_session_id', recordingSessionId);

        if (updateLogError) {
          console.warn('Failed to update emergency log:', updateLogError);
        }

        console.log(`📹 APPENDED chunk ${chunkIndex} to session ${recordingSessionId}`);

      } catch (error) {
        console.error('Error concatenating video chunks:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to concatenate video chunks' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // In a real emergency system, you would:
    // 1. Alert emergency services immediately
    // 2. Send notifications to emergency contacts
    // 3. Store location for dispatch
    // 4. Queue video for immediate review by authorities

    // Simulate emergency response
    console.log(`🚨 EMERGENCY ALERT: User ${user.id} emergency recording session ${recordingSessionId}`);
    console.log(`📍 Location:`, location);
    console.log(`📹 Video stored at: ${videoPath}`);
    console.log(`📊 Total size: ${totalChunkSize} bytes, Chunks: ${chunkIndex + 1}`);

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'received',
        message: isFirstChunk ? 'Emergency recording session started' : 'Video chunk appended successfully',
        timestamp: new Date().toISOString(),
        videoPath: videoPath,
        chunkSize: videoBuffer.length,
        totalSize: totalChunkSize,
        chunkIndex: chunkIndex,
        sessionId: recordingSessionId,
        emergencyId: `EMG-${user.id}-${recordingSessionId}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing emergency video:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});