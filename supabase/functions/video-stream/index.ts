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
    const { videoChunk, location, emergencyType = 'general' } = body;

    if (!videoChunk) {
      return new Response(
        JSON.stringify({ error: 'No video data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received video chunk from user ${user.id}:`, {
      chunkSize: videoChunk.length,
      location: location,
      emergencyType: emergencyType,
      timestamp: new Date().toISOString()
    });

    // Convert base64 video chunk to blob for storage
    const videoBuffer = Uint8Array.from(atob(videoChunk), c => c.charCodeAt(0));
    
    // Generate filename for this chunk
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `emergency-${user.id}-${timestamp}.webm`;
    
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

    // Log emergency video reception to database
    const { error: logError } = await supabase
      .from('emergency_logs')
      .insert({
        user_id: user.id,
        emergency_type: emergencyType,
        video_path: uploadData.path,
        location_data: location,
        chunk_size: videoBuffer.length,
        status: 'received'
      });

    if (logError) {
      console.warn('Failed to log emergency:', logError);
    }

    // In a real emergency system, you would:
    // 1. Alert emergency services immediately
    // 2. Send notifications to emergency contacts
    // 3. Store location for dispatch
    // 4. Queue video for immediate review by authorities

    // Simulate emergency response
    console.log(`🚨 EMERGENCY ALERT: User ${user.id} activated emergency recording`);
    console.log(`📍 Location:`, location);
    console.log(`📹 Video chunk stored at: ${uploadData.path}`);

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'received',
        message: 'Emergency video chunk processed successfully',
        timestamp: new Date().toISOString(),
        videoPath: uploadData.path,
        chunkSize: videoBuffer.length,
        emergencyId: `EMG-${user.id}-${Date.now()}`
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