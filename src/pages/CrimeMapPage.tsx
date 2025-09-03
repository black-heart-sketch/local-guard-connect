import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import CrimeMap from '@/components/map/CrimeMap';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, User, Mail, FileText, X, Image, File, ExternalLink } from 'lucide-react';

interface Report {
  id: string;
  crime_type: string;
  location: string;
  status: string;
  created_at: string;
  description: string;
  user_email: string | null;
  is_anonymous: boolean;
  coordinates: any;
  attachments: any;
}

interface FileAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
  path?: string;
}

const CrimeMapPage = () => {
  const { user, profile, loading } = useAuth();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'police';

  const handleReportSelect = (report: Report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
    setIsDetailModalOpen(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isAdmin ? 'Admin Crime Map' : 'Public Crime Map'}
                </h1>
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? 'Monitor and manage crime reports with location data' 
                    : 'View resolved crime reports in your area'
                  }
                </p>
              </div>
              {profile && (
                <Badge variant="secondary" className="text-sm">
                  {profile.role?.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <CrimeMap 
            isAdmin={isAdmin} 
            onReportSelect={handleReportSelect}
          />
        </div>
      </main>

      {/* Report Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">
                  Report Details
                </DialogTitle>
                <Badge className={getStatusColor(selectedReport?.status || '')}>
                  {selectedReport?.status?.replace('_', ' ')}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeReportDetails}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Complete report information and attachments
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Basic Information */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Crime Type</label>
                        <p className="text-lg font-semibold">{selectedReport.crime_type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <p>{selectedReport.location}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date Reported</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p>{formatDate(selectedReport.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <Badge className={getStatusColor(selectedReport.status)}>
                          {selectedReport.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {!selectedReport.is_anonymous && selectedReport.user_email && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Contact</label>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <p>{selectedReport.user_email}</p>
                          </div>
                        </div>
                      )}
                      {selectedReport.is_anonymous && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Reporter</label>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="outline">Anonymous</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Description</label>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedReport.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attachments */}
              {Array.isArray(selectedReport.attachments) && selectedReport.attachments.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-4 block">
                        Attachments ({selectedReport.attachments.length})
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedReport.attachments.map((attachment: FileAttachment, index: number) => (
                          <div key={index} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex-shrink-0">
                                  {getFileIcon(attachment.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.size)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="flex-shrink-0"
                              >
                                <a 
                                  href={attachment.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </Button>
                            </div>
                            {attachment.type.startsWith('image/') && (
                              <div className="mt-3">
                                <img 
                                  src={attachment.url} 
                                  alt={attachment.name}
                                  className="w-full h-32 object-cover rounded border"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Coordinates (for admin view) */}
              {isAdmin && selectedReport.coordinates && (
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Coordinates</label>
                      <div className="bg-muted/30 p-3 rounded font-mono text-sm">
                        {typeof selectedReport.coordinates === 'string' 
                          ? selectedReport.coordinates 
                          : JSON.stringify(selectedReport.coordinates, null, 2)
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default CrimeMapPage;