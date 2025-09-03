import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Filter, Clock, AlertTriangle, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface CrimeMapProps {
  isAdmin?: boolean;
  selectedReports?: Report[];
  onReportSelect?: (report: Report) => void;
}

const CrimeMap: React.FC<CrimeMapProps> = ({ 
  isAdmin = false, 
  selectedReports = [],
  onReportSelect 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const { toast } = useToast();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('all');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (selectedReports.length > 0) {
      setReports(selectedReports);
      setFilteredReports(selectedReports);
      setLoading(false);
    } else {
      fetchReports();
    }
  }, [selectedReports]);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, crimeTypeFilter]);

  useEffect(() => {
    if (filteredReports.length > 0) {
      updateMapMarkers();
    }
  }, [filteredReports]);

  useEffect(() => {
    initializeMap();
    getUserLocation();
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          
          if (map.current) {
            // Add user location marker
            const userIcon = L.divIcon({
              html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              className: 'user-location-marker'
            });
            
            L.marker(coords, { icon: userIcon })
              .addTo(map.current)
              .bindPopup('Your Location')
              .openPopup();
              
            // Center map on user location if no reports
            if (filteredReports.length === 0) {
              map.current.setView(coords, 13);
            }
          }
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current, {
      center: [0.3476, 32.5825], // Default to Kampala, Uganda
      zoom: 10,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add markers layer group
    markersRef.current.addTo(map.current);
  };

  const fetchReports = async () => {
    try {
      const query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      // For public view, only show resolved reports
      if (!isAdmin) {
        query.eq('status', 'resolved');
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.crime_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (crimeTypeFilter !== 'all') {
      filtered = filtered.filter(report => report.crime_type === crimeTypeFilter);
    }

    setFilteredReports(filtered);
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'pending': return '#eab308'; // yellow
      case 'in_progress': return '#3b82f6'; // blue
      case 'resolved': return '#22c55e'; // green
      case 'rejected': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    const validReports = filteredReports.filter(report => {
      if (!report.coordinates) return false;
      const coords = typeof report.coordinates === 'string' 
        ? JSON.parse(report.coordinates) 
        : report.coordinates;
      return coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';
    });

    if (validReports.length === 0) return;

    // Add markers for each report
    validReports.forEach(report => {
      const coords = typeof report.coordinates === 'string' 
        ? JSON.parse(report.coordinates) 
        : report.coordinates;

      const color = getMarkerColor(report.status);
      
      // Create custom marker icon
      const markerIcon = L.divIcon({
        html: `
          <div style="
            background-color: ${color}; 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px; 
              height: 8px; 
              background-color: white; 
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: 'custom-marker'
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: markerIcon })
        .bindPopup(`
          <div class="p-2 min-w-[250px]">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-semibold text-sm">${report.crime_type}</h3>
              <span class="px-2 py-1 rounded text-xs text-white" style="background-color: ${color}">
                ${report.status.replace('_', ' ')}
              </span>
            </div>
            <div class="space-y-1 text-xs text-gray-600">
              <div class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                </svg>
                ${report.location}
              </div>
              <div class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                </svg>
                ${new Date(report.created_at).toLocaleDateString()}
              </div>
            </div>
            <p class="text-xs mt-2 text-gray-700 line-clamp-3">${report.description}</p>
            ${isAdmin ? `
              <button 
                onclick="window.selectReport('${report.id}')"
                class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              >
                View Details
              </button>
            ` : ''}
          </div>
        `);

      marker.addTo(markersRef.current);
    });

    // Fit map to show all markers
    if (validReports.length > 0) {
      const group = L.featureGroup(markersRef.current.getLayers());
      map.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Global function for popup buttons
  useEffect(() => {
    (window as any).selectReport = (reportId: string) => {
      const report = reports.find(r => r.id === reportId);
      if (report && onReportSelect) {
        onReportSelect(report);
      }
    };
    
    return () => {
      delete (window as any).selectReport;
    };
  }, [reports, onReportSelect]);

  const getUniqueValues = (field: keyof Report) => {
    return [...new Set(reports.map(report => String(report[field])))].filter(Boolean);
  };

  return (
    <div className="flex h-full">
      {/* Filters Panel - Left Side */}
      <div className="w-80 bg-background border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Crime Map {!isAdmin && '(Public View)'}
          </h2>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing resolved crime reports in your area
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold">{filteredReports.length}</div>
              <div className="text-xs text-muted-foreground">Visible</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold">{reports.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Crime Type</label>
            <Select value={crimeTypeFilter} onValueChange={setCrimeTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crime Types</SelectItem>
                {getUniqueValues('crime_type').map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setCrimeTypeFilter('all');
            }}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>

        {/* Legend */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium mb-3">Legend</h3>
          <div className="space-y-2">
            {isAdmin ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Resolved</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span>Rejected</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Crime Reports</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Your Location</span>
            </div>
          </div>
        </div>

        {/* Report List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3">
              Reports ({filteredReports.length})
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No reports found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReports.slice(0, 20).map((report) => (
                  <div
                    key={report.id}
                    className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (map.current && report.coordinates) {
                        const coords = typeof report.coordinates === 'string' 
                          ? JSON.parse(report.coordinates) 
                          : report.coordinates;
                        if (coords.lat && coords.lng) {
                          map.current.setView([coords.lat, coords.lng], 16);
                        }
                      }
                      if (onReportSelect) {
                        onReportSelect(report);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getMarkerColor(report.status) }}
                      ></div>
                      <span className="text-sm font-medium">{report.crime_type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {report.location}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {filteredReports.length > 20 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    Showing first 20 reports
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map - Right Side */}
      <div className="flex-1 relative">
        <div 
          ref={mapContainer} 
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="bg-background p-4 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrimeMap;