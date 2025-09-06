import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Play, Download, MapPin, Calendar, Filter, Eye, AlertTriangle, User } from 'lucide-react';

interface EmergencyLog {
  id: string;
  user_id: string;
  emergency_type: string;
  status: string;
  location_data: any;
  video_path: string | null;
  recording_session_id: string | null;
  chunk_count: number;
  chunk_size: number;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    phone: string;
  };
}

export function EmergencyLogsViewer() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmergencyLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmergencyLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EmergencyLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emergencyTypeFilter, setEmergencyTypeFilter] = useState('all');

  useEffect(() => {
    fetchEmergencyLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, statusFilter, emergencyTypeFilter]);

  const fetchEmergencyLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select(`
          *,
          user_profile:profiles!emergency_logs_user_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch emergency logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.emergency_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.recording_session_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.user_profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    if (emergencyTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.emergency_type === emergencyTypeFilter);
    }

    setFilteredLogs(filtered);
  };

  const openLogDetails = (log: EmergencyLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const closeLogDetails = () => {
    setSelectedLog(null);
    setIsDetailModalOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEmergencyTypeColor = (type: string) => {
    switch (type) {
      case 'general':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'fire':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'police':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUniqueValues = (field: keyof EmergencyLog) => {
    return [...new Set(logs.map(log => String(log[field])))].filter(Boolean);
  };

  const downloadVideo = async (videoPath: string) => {
    if (!videoPath) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('emergency-videos')
        .download(videoPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = videoPath.split('/').pop() || 'emergency_video.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download video',
        variant: 'destructive',
      });
    }
  };

  const stats = {
    total: logs.length,
    received: logs.filter(l => l.status === 'received').length,
    processing: logs.filter(l => l.status === 'processing').length,
    completed: logs.filter(l => l.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Emergency Video Logs</h2>
        <p className="text-muted-foreground">View and manage emergency video recordings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emergencies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.received}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={emergencyTypeFilter} onValueChange={setEmergencyTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {getUniqueValues('emergency_type').map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Video Logs</CardTitle>
          <CardDescription>
            Click on any log to view detailed information and watch the emergency video
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No emergency logs found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || emergencyTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No emergency videos have been recorded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-border rounded-lg p-6 hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => openLogDetails(log)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                          Emergency {log.emergency_type}
                        </h3>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        <Badge className={getEmergencyTypeColor(log.emergency_type)}>
                          {log.emergency_type}
                        </Badge>
                        {log.video_path && (
                          <Badge variant="outline" className="text-xs">
                            Video Available
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4 mr-1" />
                        {log.user_profile?.full_name || 'Unknown User'}
                        {log.user_profile?.phone && (
                          <span className="ml-2">• {log.user_profile.phone}</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(log.created_at)}
                        <span className="ml-4">
                          Session: {log.recording_session_id || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogDetails(log);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {log.video_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVideo(log.video_path!);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Chunks:</span> {log.chunk_count}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span> {formatFileSize(log.chunk_size || 0)}
                    </div>
                    {log.location_data && (
                      <div>
                        <span className="text-muted-foreground">Location:</span> Available
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Log Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the emergency recording
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Emergency Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> {selectedLog.emergency_type}</div>
                    <div><span className="text-muted-foreground">Status:</span> {selectedLog.status}</div>
                    <div><span className="text-muted-foreground">Session ID:</span> {selectedLog.recording_session_id || 'N/A'}</div>
                    <div><span className="text-muted-foreground">Recorded:</span> {formatDate(selectedLog.created_at)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">User Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {selectedLog.user_profile?.full_name || 'Unknown'}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {selectedLog.user_profile?.phone || 'N/A'}</div>
                    <div><span className="text-muted-foreground">User ID:</span> {selectedLog.user_id}</div>
                  </div>
                </div>
              </div>

              {/* Video Information */}
              {selectedLog.video_path && (
                <div>
                  <h4 className="font-medium mb-2">Video Information</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Chunks:</span> {selectedLog.chunk_count}</div>
                    <div><span className="text-muted-foreground">Size:</span> {formatFileSize(selectedLog.chunk_size || 0)}</div>
                    <div><span className="text-muted-foreground">Path:</span> {selectedLog.video_path}</div>
                  </div>
                  <div className="mt-4">
                    <Button onClick={() => downloadVideo(selectedLog.video_path!)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Video
                    </Button>
                  </div>
                </div>
              )}

              {/* Location Information */}
              {selectedLog.location_data && (
                <div>
                  <h4 className="font-medium mb-2">Location Data</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.location_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}