import { useEffect, useState } from 'react';
import { apiFetch } from "@/lib/api";
import { flushQueuedReports, queueReport, reportFormData } from '@/lib/offlineReports';
import { compressEvidence } from '@/lib/compressImage';

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
  jurisdiction?: { region?: string; division?: string; subdivision?: string; council?: string; quarter?: string; landmark?: string };
  sensitive?: boolean;
  contactPreference?: string;
  safeContactTime?: string;
}

export const useReportPopup = () => {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const flush = () => void flushQueuedReports();
    window.addEventListener('online', flush);
    flush();
    return () => window.removeEventListener('online', flush);
  }, []);

  const openReportPopup = () => {
    setSubmitError(null);
    setIsReportOpen(true);
  };

  const closeReportPopup = () => {
    setIsReportOpen(false);
  };

  const handleReportSubmit = async (report: ReportData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const optimizedReport = { ...report, files: await compressEvidence(report.files) };
      if (!navigator.onLine) {
        const queued = await queueReport(optimizedReport);
        return { success: true, queued: true, recoveryCode: queued.recoveryCode };
      }
      const result = await apiFetch<{ report: { reference?: string }; recoveryCode?: string }>('/reports', { method: 'POST', body: reportFormData(optimizedReport) });
      if (result.recoveryCode) {
        sessionStorage.setItem('lastAnonymousRecoveryCode', result.recoveryCode);
        sessionStorage.setItem('lastAnonymousReference', result.report.reference || '');
      }
      return { success: true, recoveryCode: result.recoveryCode, reference: result.report.reference };
    } catch (error) {
      if (error instanceof TypeError || (error as { status?: number }).status === undefined) {
        const queued = await queueReport({ ...report, files: await compressEvidence(report.files) });
        return { success: true, queued: true, recoveryCode: queued.recoveryCode };
      }
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
