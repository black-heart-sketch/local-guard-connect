import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database, Json } from '@/types/supabase';

export interface ReportData {
  crimeType: string;
  location: string;
  description: string;
  files: File[];
  isAnonymous: boolean;
  userId?: string;
  userEmail?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

type ReportInsert = Database['public']['Tables']['reports']['Insert'];

export const useReportPopup = () => {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();

  const openReportPopup = () => {
    setSubmitError(null);
    setIsReportOpen(true);
  };

  const closeReportPopup = () => {
    setIsReportOpen(false);
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('report-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('report-attachments')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size
    };
  };

  const handleReportSubmit = async (report: ReportData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Upload files if any
      const attachments = [];
      for (const file of report.files) {
        try {
          const uploadedFile = await uploadFile(file);
          attachments.push(uploadedFile);
        } catch (error) {
          console.error('Error uploading file:', error);
          // Continue with other files even if one fails
        }
      }

      // Create the report data with proper typing
      const reportInsert: ReportInsert = {
        crime_type: report.crimeType,
        location: report.location,
        description: report.description,
        attachments: attachments as Json, // Properly typed for Json
        is_anonymous: report.isAnonymous,
        user_id: report.isAnonymous ? null : (user?.id || null),
        user_email: report.isAnonymous ? null : (user?.email || null),
        coordinates: report.coordinates ? (report.coordinates as Json) : null,
        status: 'pending' as const, // Ensure literal type
      };

      // Insert report into database with explicit typing
      const { error } = await supabase
        .from('reports')
        .insert(reportInsert as any);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit report');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isReportOpen,
    openReportPopup,
    closeReportPopup,
    handleReportSubmit,
    isSubmitting,
    submitError
  };
};

export default useReportPopup;