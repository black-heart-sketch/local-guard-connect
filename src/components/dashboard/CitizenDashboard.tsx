import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportPopup } from '@/components/reports/ReportPopup';
import EmergencyButton from '@/components/emergency/EmergencyButton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, MapPin, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';

interface Report {
  id: string;
  crime_type: string;
  location: string;
  status: string;
  created_at: string;
  description: string;
}

export function CitizenDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportPopup, setShowReportPopup] = useState(false);

  useEffect(() => {
    fetchUserReports();
  }, [user]);

  const handleReportSubmit = async (reportData: {
    crimeType: string;
    location: string;
    description: string;
    files: File[];
    isAnonymous: boolean;
    coordinates?: { latitude: number; longitude: number };
  }) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          crime_type: reportData.crimeType,
          location: reportData.location,
          description: reportData.description,
          attachments: [] as any,
          is_anonymous: reportData.isAnonymous,
          user_id: reportData.isAnonymous ? null : user?.id || null,
          user_email: reportData.isAnonymous ? null : user?.email || null,
          coordinates: reportData.coordinates || null,
        } as any);

      if (error) throw error;
      
      fetchUserReports();
      return { success: true };
    } catch (error: any) {
      console.error('Error submitting report:', error);
      return { success: false };
    }
  };

  const fetchUserReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch your reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome, {profile?.full_name || 'Citizen'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Report crimes and track your submissions
              </p>
            </div>
            <div className="flex gap-4">
              <EmergencyButton />
              <Button onClick={() => setShowReportPopup(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.filter(r => r.status === 'pending').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.filter(r => r.status === 'resolved').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Reports</CardTitle>
            <CardDescription>
              Track the status of your submitted crime reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by submitting your first crime report
                </p>
                <Button onClick={() => setShowReportPopup(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {report.crime_type}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {report.location}
                        </div>
                      </div>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Submitted: {formatDate(report.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <ReportPopup
        isOpen={showReportPopup}
        onClose={() => setShowReportPopup(false)}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}