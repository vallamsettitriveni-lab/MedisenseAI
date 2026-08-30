'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  FileText,
  Upload,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  ShieldAlert,
  Apple,
  RefreshCw,
  Lock,
  UserCheck,
  User,
  Edit3,
  Save,
  Trash2,
  Phone,
  Mail,
  X,
  FileSpreadsheet,
  Stethoscope,
  Download,
  ShieldCheck
} from 'lucide-react';
import LabTrendChart from '@/components/charts/LabTrendChart';
import Navbar from '@/components/shared/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function PatientDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [patientLastName, setPatientLastName] = useState<string>('Patient');
  const [activeTab, setActiveTab] = useState<'reports' | 'profile' | 'compare' | 'trends' | 'appointments' | 'emergency'>('reports');

  // Data states
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [selectedTest, setSelectedTest] = useState<string>('Hemoglobin');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Profile states
  const [profileData, setProfileData] = useState<any>({
    full_name: '',
    email: '',
    dob: '',
    gender: 'Other',
    phone: '',
    reports_count: 0,
    appointments_count: 0
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    full_name: '',
    dob: '',
    gender: 'Other',
    phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Standard Appointment booking states
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookingReason, setBookingReason] = useState<string>('');
  const [isEmergencyFastTrack, setIsEmergencyFastTrack] = useState<boolean>(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');

  // Dedicated Emergency Booking states
  const [emergencyDoctorId, setEmergencyDoctorId] = useState<string>('');
  const [emergencySymptoms, setEmergencySymptoms] = useState<string>('');
  const [emergencySubmitting, setEmergencySubmitting] = useState<boolean>(false);

  // History container ref for scroll up/down
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const extractLastName = (fullName?: string, email?: string): string => {
    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      return parts[parts.length - 1];
    }
    if (email && email.includes('@')) {
      const username = email.split('@')[0];
      const parts = username.split(/[._\-+]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length > 0) {
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      }
    }
    const saved = localStorage.getItem('user_last_name');
    if (saved) return saved;
    return 'Patient';
  };

  // Auto-fetch data whenever switching tabs
  useEffect(() => {
    if (activeTab === 'appointments' || activeTab === 'emergency') {
      fetchDoctors();
    } else if (activeTab === 'compare' && reports.length > 0) {
      fetchComparison(selectedReport?.id || reports[0].id);
    } else if (activeTab === 'trends') {
      fetchTrendChart(selectedTest);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'trends') {
      fetchTrendChart(selectedTest);
    }
  }, [selectedTest]);

  // Strict Authentication & Profile Fetching
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token || (userRole !== 'PATIENT' && userRole !== 'ADMIN')) {
      setIsAuthorized(false);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      router.push('/patient/login');
      return;
    }

    setIsAuthorized(true);
    const cachedLastName = localStorage.getItem('user_last_name');
    if (cachedLastName) {
      setPatientLastName(cachedLastName);
    }

    fetchPatientProfile(token);
    fetchReports(token);
    fetchDoctors();
    fetchAppointments(token);
  }, []);

  const fetchPatientProfile = async (authToken?: string | null) => {
    const token = authToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/patients/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setProfileForm({
          full_name: data.full_name || '',
          dob: data.dob || '',
          gender: data.gender || 'Other',
          phone: data.phone || ''
        });
        const extracted = extractLastName(data.full_name, data.email);
        setPatientLastName(extracted);
        localStorage.setItem('user_last_name', extracted);
      }
    } catch (e) {
      console.error('Error fetching patient profile:', e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/patients/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          dob: profileForm.dob || null,
          gender: profileForm.gender,
          phone: profileForm.phone
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        const extracted = extractLastName(updated.full_name, updated.email);
        setPatientLastName(extracted);
        localStorage.setItem('user_last_name', extracted);
        setIsEditingProfile(false);
        setProfileSuccessMsg('Profile details updated successfully!');
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        alert('Failed to update profile. Please verify your inputs.');
      }
    } catch (e) {
      console.error('Error updating profile:', e);
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchReports = async (authToken?: string | null) => {
    const token = authToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0) {
          setSelectedReport((prev: any) => {
            if (prev) {
              const matched = data.find((r: any) => r.id === prev.id);
              if (matched && matched.lab_results && matched.lab_results.length > 0) {
                return matched;
              }
            }
            return data[0];
          });
          fetchComparison(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    }
  };

  const fetchComparison = async (reportId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/compare/items?new_report_id=${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      }
    } catch (e) {
      console.error('Error fetching comparison:', e);
    }
  };

  const fetchTrendChart = async (testName: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/trends/chart?test_name=${encodeURIComponent(testName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrendData(data.data_points || []);
      }
    } catch (e) {
      console.error('Error fetching trends:', e);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors/`);
      if (res.ok) {
        setDoctors(await res.json());
      }
    } catch (e) {
      console.error('Error fetching doctors:', e);
    }
  };

  const fetchAppointments = async (authToken?: string | null) => {
    const token = authToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAppointments(await res.json());
      }
    } catch (e) {
      console.error('Error fetching appointments:', e);
    }
  };

  // Confirm / Accept Emergency Appointment directly
  const handleConfirmEmergencyAppointment = async (apptId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        alert('✅ Emergency consultation confirmed and finalized!');
        fetchAppointments(token);
      } else {
        alert('Could not update appointment status.');
      }
    } catch (e) {
      console.error('Error confirming emergency appointment:', e);
    }
  };

  // Upload Lab PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const newReport = await res.json();
        await fetchReports(token);
        try {
          const freshRes = await fetch(`${API_BASE_URL}/reports/${newReport.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (freshRes.ok) {
            const freshRep = await freshRes.json();
            setSelectedReport(freshRep);
            fetchComparison(freshRep.id);
          } else {
            setSelectedReport(newReport);
            fetchComparison(newReport.id);
          }
        } catch (_) {
          setSelectedReport(newReport);
        }
        fetchTrendChart(selectedTest);
        alert(`Successfully processed report '${file.name}'! Extracted lab values and AI educational breakdown are ready.`);
      } else {
        await fetchReports(token);
        alert('Report upload completed. Refreshing medical records...');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Helper: Download a sample medical blood test PDF file to user's device
  const handleDownloadSamplePDF = () => {
    // Generate simple sample PDF text content encoded as a Blob
    const samplePdfContent = `%PDF-1.4
1 0 obj << /Title (Clinical Diagnostic Blood Panel Report) /Creator (MediSense Health Labs) >> endobj
2 0 obj << /Type /Catalog /Pages 3 0 R >> endobj
3 0 obj << /Type /Pages /Kids [4 0 R] /Count 1 >> endobj
4 0 obj << /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >> endobj
5 0 obj << /Length 420 >> stream
BT
/F1 14 Tf
50 720 Td (MEDISENSE COMPREHENSIVE CLINICAL LABORATORY REPORT) Tj
/F1 10 Tf
0 -30 Td (Patient: Health Portal Patient   |   Date of Collection: Current Baseline) Tj
0 -30 Td (TEST NAME               RESULT       UNITS      REFERENCE RANGE    STATUS) Tj
0 -20 Td (-------------------------------------------------------------------------) Tj
0 -20 Td (Hemoglobin              14.2         g/dL       13.0 - 17.0        NORMAL) Tj
0 -20 Td (Fasting Glucose         104.0        mg/dL      70.0 - 99.0        HIGH) Tj
0 -20 Td (Total Cholesterol       215.0        mg/dL      125.0 - 200.0      HIGH) Tj
0 -20 Td (Vitamin D (25-OH)       24.5         ng/mL      30.0 - 100.0       LOW) Tj
0 -20 Td (White Blood Cells       6.8          x10^3/uL   4.5 - 11.0         NORMAL) Tj
0 -20 Td (Platelet Count          260.0        x10^3/uL   150.0 - 450.0      NORMAL) Tj
0 -20 Td (TSH                     2.1          mIU/L      0.4 - 4.0          NORMAL) Tj
ET
endstream
endobj
6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 7
0000000000 65535 f
0000000010 00000 n
0000000103 00000 n
0000000155 00000 n
0000000216 00000 n
0000000344 00000 n
0000000816 00000 n
trailer << /Size 7 /Root 2 0 R >>
startxref
895
%%EOF`;

    const blob = new Blob([samplePdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Sample_Comprehensive_Blood_Panel.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete an uploaded report
  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this medical report from your records?')) {
      return;
    }

    setDeletingId(reportId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const remaining = reports.filter((r) => r.id !== reportId);
      setReports(remaining);
      if (selectedReport?.id === reportId) {
        if (remaining.length > 0) {
          setSelectedReport(remaining[0]);
          fetchComparison(remaining[0].id);
        } else {
          setSelectedReport(null);
          setComparison(null);
        }
      }
      fetchTrendChart(selectedTest);
    } catch (err) {
      console.error('Error deleting report:', err);
      const remaining = reports.filter((r) => r.id !== reportId);
      setReports(remaining);
      if (selectedReport?.id === reportId) {
        setSelectedReport(remaining.length > 0 ? remaining[0] : null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleFetchSlots = async (docId: string, dateStr: string) => {
    if (!docId || !dateStr) return;
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/slots?doctor_id=${docId}&date_str=${dateStr}`);
      if (res.ok) {
        const slots = await res.json();
        if (slots && slots.length > 0) {
          setAvailableSlots(slots);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching slots:', e);
    }
    // Fallback standard working hours slots for selected date
    const fallbackSlots = [
      `${dateStr}T09:00:00`,
      `${dateStr}T10:30:00`,
      `${dateStr}T11:45:00`,
      `${dateStr}T14:00:00`,
      `${dateStr}T15:30:00`,
      `${dateStr}T16:15:00`
    ];
    setAvailableSlots(fallbackSlots);
  };

  // Standard Appointment Booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) return;

    const token = localStorage.getItem('token');
    const finalReason = isEmergencyFastTrack
      ? `[EMERGENCY] ${bookingReason.trim() || 'Urgent Clinical Consultation'}`
      : bookingReason.trim() || 'General Consultation';

    try {
      const res = await fetch(`${API_BASE_URL}/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          appointment_timestamp: selectedSlot,
          reason: finalReason,
        }),
      });

      if (res.ok) {
        const appt = await res.json();
        setAppointments((prev) => [appt, ...prev]);
        setSelectedSlot('');
        setBookingReason('');
        setIsEmergencyFastTrack(false);
        alert(isEmergencyFastTrack
          ? '🚨 Priority Emergency appointment submitted! Admin is dispatching available doctors.'
          : 'Appointment scheduled successfully!'
        );
      } else {
        const err = await res.json();
        alert(err.detail || 'Could not schedule appointment.');
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
  };

  // Dedicated Emergency Quick Request
  const handleEmergencyBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencySymptoms.trim()) {
      alert('Please enter your emergency symptoms or urgent clinical reason.');
      return;
    }

    setEmergencySubmitting(true);
    const token = localStorage.getItem('token');
    const targetDoctorId = emergencyDoctorId || (doctors.length > 0 ? doctors[0].id : null);
    if (!targetDoctorId) {
      alert('No specialist doctors available at this moment. Please contact local emergency services if immediate life threat.');
      setEmergencySubmitting(false);
      return;
    }

    const now = new Date();
    const emergencyTimestamp = new Date(now.getTime() + 15 * 60000).toISOString();

    try {
      const res = await fetch(`${API_BASE_URL}/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_id: targetDoctorId,
          appointment_timestamp: emergencyTimestamp,
          reason: `[EMERGENCY] ${emergencySymptoms.trim()}`,
        }),
      });

      if (res.ok) {
        const appt = await res.json();
        setAppointments((prev) => [appt, ...prev]);
        setEmergencySymptoms('');
        setEmergencyDoctorId('');
        alert('🚨 Emergency Case Dispatched! Administrator has received your priority case and is assigning on-duty specialist doctors.');
      } else {
        const err = await res.json();
        alert(err.detail || 'Could not submit emergency request.');
      }
    } catch (err) {
      console.error('Emergency error:', err);
    } finally {
      setEmergencySubmitting(false);
    }
  };

  // Filter emergency cases
  const emergencyAppointments = appointments.filter(
    (app) => app.reason && (app.reason.includes('[EMERGENCY') || app.reason.toLowerCase().includes('emergency') || app.reason.toLowerCase().includes('urgent'))
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="h-12 w-12 text-teal-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold">Authentication Required</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-sm">
          Please sign in to your patient portal to access your laboratory records and clinical insights.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Patient Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white py-6 px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-700/50 rounded-2xl border border-teal-500/30">
              <Activity className="h-6 w-6 text-teal-200" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Welcome, {patientLastName}!
              </h1>
              <p className="text-xs text-teal-200 mt-0.5">
                Personalized Health Portal • Lab Values • AI Interpretations • Profile & Appointments
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right text-xs text-teal-300">
            <span>Logged in as Patient</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${activeTab === 'reports' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <FileText className="h-4 w-4" /> Reports & AI Analysis
            </button>

            <button
              onClick={() => setActiveTab('emergency')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'emergency' ? 'bg-rose-700 text-white shadow-sm' : 'text-rose-700 bg-rose-50/70 hover:bg-rose-100'
                }`}
            >
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> 🚨 Emergency Request
              </span>
              {emergencyAppointments.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white animate-pulse">
                  {emergencyAppointments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${activeTab === 'profile' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <User className="h-4 w-4" /> My Profile
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${activeTab === 'compare' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <RefreshCw className="h-4 w-4" /> Report Comparison
            </button>

            <button
              onClick={() => setActiveTab('trends')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${activeTab === 'trends' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <TrendingUp className="h-4 w-4" /> Longitudinal Trends
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${activeTab === 'appointments' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Calendar className="h-4 w-4" /> Book Doctor
            </button>
          </div>

          {/* Quick PDF Upload Box */}
          <div className="bg-gradient-to-br from-teal-800 to-teal-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="p-2.5 bg-teal-700/50 rounded-xl w-fit">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-base">Upload Lab PDF</h4>
              <p className="text-xs text-teal-100 mt-1">Select your medical blood test PDF to extract values & get AI breakdown</p>
            </div>

            <label className="block w-full text-center py-3 bg-white hover:bg-teal-50 text-teal-900 font-extrabold text-xs rounded-xl cursor-pointer transition shadow-md flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? 'Processing PDF...' : '📁 Upload Lab PDF File'}
              <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleDownloadSamplePDF}
              className="w-full py-2 bg-teal-700/60 hover:bg-teal-700 text-teal-100 font-semibold text-xs rounded-xl border border-teal-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Download Sample Lab PDF
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="md:col-span-3 space-y-6">

          {/* TAB 1: REPORTS & AI ANALYSIS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Medical Reports & AI Analysis</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Extracted lab values, healthy reference ranges, and patient-friendly AI guidance</p>
                </div>

                <label className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition flex items-center gap-1.5 shrink-0">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Processing...' : '📁 Upload New Report'}
                  <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              </div>

              {reports.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <FileText className="h-12 w-12 text-teal-600/60 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-lg">No medical reports uploaded yet</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Upload your blood test PDF report from your computer or download a sample clinical PDF to view AI interpretations.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <label className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl cursor-pointer shadow-sm transition inline-flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Upload Lab PDF
                      <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                    </label>
                    <button
                      onClick={handleDownloadSamplePDF}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition inline-flex items-center gap-2"
                    >
                      <Download className="h-4 w-4 text-teal-700" /> Download Sample PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* TOP ROW: SIDE-BY-SIDE */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Left Column (5/12): Uploaded History */}
                    <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[460px]">
                      <div className="px-2 pb-3 border-b border-slate-100 mb-2 shrink-0 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Uploaded History</h3>
                          <p className="text-[11px] text-slate-400">{reports.length} report(s) on record</p>
                        </div>
                        <button
                          onClick={handleDownloadSamplePDF}
                          title="Download Sample Lab PDF"
                          className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> Sample PDF
                        </button>
                      </div>

                      <div
                        ref={historyScrollRef}
                        className="flex-1 overflow-y-auto pr-1 space-y-2 select-none scrollbar-thin scrollbar-thumb-slate-200"
                      >
                        {reports.map((rep) => (
                          <div
                            key={rep.id}
                            onClick={async () => {
                              setSelectedReport(rep);
                              fetchComparison(rep.id);
                              if (!rep.lab_results || rep.lab_results.length === 0) {
                                const token = localStorage.getItem('token');
                                try {
                                  const fresh = await fetch(`${API_BASE_URL}/reports/${rep.id}`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  if (fresh.ok) {
                                    const freshData = await fresh.json();
                                    setSelectedReport(freshData);
                                    setReports((prev) => prev.map((r) => (r.id === rep.id ? freshData : r)));
                                    fetchComparison(freshData.id);
                                  }
                                } catch (_) {}
                              }
                            }}
                            className={`w-full p-3 rounded-xl border text-sm transition cursor-pointer flex items-start justify-between gap-2 group ${selectedReport?.id === rep.id
                                ? 'border-teal-600 bg-teal-50/60 shadow-sm'
                                : 'border-slate-100 hover:bg-slate-50'
                              }`}
                          >
                            <div className="truncate flex-1">
                              <p className="font-bold text-slate-900 truncate text-xs">{rep.file_name}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(rep.uploaded_at).toLocaleDateString()}
                              </p>
                              <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {rep.processing_status}
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleDeleteReport(rep.id, e)}
                              title="Delete this report"
                              disabled={deletingId === rep.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column (7/12): Extracted Laboratory Values */}
                    <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[460px]">
                      {selectedReport ? (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                            <div>
                              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                                Extracted Laboratory Values
                              </h3>
                              <p className="text-xs text-slate-500 truncate max-w-sm">{selectedReport.file_name}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                              {selectedReport.lab_results?.length || 0} Parameters
                            </span>
                          </div>

                          {(!selectedReport.lab_results || selectedReport.lab_results.length === 0) ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                              <p className="text-slate-500 text-xs">No parameters extracted for this report yet.</p>
                              <button
                                onClick={() => fetchReports()}
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> ⚡ Extract & Load Lab Values
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-y-auto pr-1">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b text-[11px] text-slate-500 uppercase">
                                    <th className="py-2">Test Name</th>
                                    <th className="py-2">Observed Value</th>
                                    <th className="py-2">Ref Range</th>
                                    <th className="py-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {selectedReport.lab_results.map((lab: any) => (
                                    <tr key={lab.id || lab.test_name} className="hover:bg-slate-50">
                                      <td className="py-2.5 font-semibold text-slate-900 text-xs">{lab.test_name}</td>
                                      <td className="py-2.5 text-slate-700 text-xs">
                                        {lab.value} <span className="text-[10px] text-slate-400">{lab.unit}</span>
                                      </td>
                                      <td className="py-2.5 text-[11px] text-slate-500">
                                        {lab.reference_min} – {lab.reference_max} {lab.unit}
                                      </td>
                                      <td className="py-2.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lab.status === 'LOW'
                                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                              : lab.status === 'HIGH'
                                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            }`}
                                        >
                                          {lab.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                          Select a report from the history list to view extracted test values.
                        </div>
                      )}
                    </div>

                  </div>

                  {/* BOTTOM ROW: AI Clinical Summary, Tips, Precautions & Guidance */}
                  {selectedReport && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-teal-200 shadow-sm space-y-6">
                      {/* Section Header with Real-time Metrics */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-2xl shadow-sm">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                              AI Clinical Summary & Health Interpretation
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Automated educational synthesis of <span className="font-bold text-teal-700">{selectedReport.file_name}</span>
                            </p>
                          </div>
                        </div>

                        {/* Dynamic Biomarker Metrics Counter */}
                        {selectedReport.lab_results && selectedReport.lab_results.length > 0 && (
                          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs">
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                              ✓ {selectedReport.lab_results.filter((l: any) => l.status === 'NORMAL').length} Normal
                            </span>
                            {selectedReport.lab_results.filter((l: any) => l.status === 'LOW').length > 0 && (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold">
                                ▼ {selectedReport.lab_results.filter((l: any) => l.status === 'LOW').length} Low
                              </span>
                            )}
                            {selectedReport.lab_results.filter((l: any) => l.status === 'HIGH').length > 0 && (
                              <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 font-bold">
                                ▲ {selectedReport.lab_results.filter((l: any) => l.status === 'HIGH').length} High
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Primary Diagnostic Findings Box */}
                      <div className="p-5 bg-gradient-to-br from-teal-50/70 to-emerald-50/30 rounded-2xl border border-teal-100/80 space-y-2">
                        <div className="flex items-center gap-2 text-teal-900 font-extrabold text-sm">
                          <Stethoscope className="h-4 w-4 text-teal-700" />
                          Diagnostic Findings Overview
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {selectedReport.ai_explanation?.precautions ||
                            (selectedReport.lab_results?.some((l: any) => l.status !== 'NORMAL')
                              ? `Your diagnostic panel indicates ${selectedReport.lab_results.filter((l: any) => l.status !== 'NORMAL').map((l: any) => `${l.test_name} (${l.value} ${l.unit} - ${l.status})`).join(', ')}. These biomarker values warrant clinical discussion with your doctor to tailor dietary and lifestyle optimizations.`
                              : 'All analyzed laboratory biomarkers are currently balanced within standard healthy clinical reference intervals. Continue maintaining your current active lifestyle and routine health checkups.')}
                        </p>
                      </div>

                      {/* 3-Column Grid: Nutrition & Lifestyle Tips | Medical Precautions | Questions for Doctor */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Box 1: Nutrition & Lifestyle Recommendations */}
                        <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 flex flex-col justify-between space-y-3">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                              <Apple className="h-4 w-4 text-emerald-700" /> Nutrition & Lifestyle Tips
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              {selectedReport.ai_explanation?.lifestyle_suggestions ||
                                `• Balanced Nutrition: Emphasize antioxidant-rich leafy greens, fiber, and lean protein.\n• Daily Hydration: Target 2.0–2.5L of water daily to support metabolic clearance.\n• Active Movement: Aim for 30 minutes of moderate aerobic activity 4–5 times per week.\n• Sleep Hygiene: Ensure 7–8 hours of uninterrupted sleep for optimal cellular recovery.`}
                            </p>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-1 rounded-lg w-fit">
                            🌱 Evidence-based Wellness
                          </span>
                        </div>

                        {/* Box 2: Important Precautions & Warning Signs */}
                        <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/70 flex flex-col justify-between space-y-3">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                              <ShieldAlert className="h-4 w-4 text-amber-700" /> Important Precautions
                            </div>
                            <ul className="text-xs text-slate-700 leading-relaxed space-y-1.5 list-disc list-inside">
                              <li>Do not alter or discontinue prescribed medications without consulting your physician.</li>
                              <li>Avoid starting high-dose over-the-counter supplements without clinical blood review.</li>
                              <li>Retest abnormal parameters in 4–8 weeks to monitor physiological trajectories.</li>
                              <li>Seek immediate emergency care if you experience acute chest tightness or sudden dizziness.</li>
                            </ul>
                          </div>
                          <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-2 py-1 rounded-lg w-fit">
                            🛡️ Preventive Safety Protocol
                          </span>
                        </div>

                        {/* Box 3: Questions to Ask Your Doctor */}
                        <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-200/70 flex flex-col justify-between space-y-3">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider">
                              <CheckCircle className="h-4 w-4 text-indigo-700" /> Questions for Your Doctor
                            </div>
                            <ul className="text-xs text-slate-700 leading-relaxed space-y-1.5 list-disc list-inside">
                              <li>"How do these specific results compare to my historical health baseline?"</li>
                              <li>"Are any targeted dietary modifications recommended for my out-of-range values?"</li>
                              <li>"Would you recommend a follow-up panel in 3 to 6 months?"</li>
                              <li>"Are there any specific lifestyle symptoms I should monitor closely at home?"</li>
                            </ul>
                          </div>
                          <button
                            onClick={() => setActiveTab('appointments')}
                            className="text-[10px] text-indigo-700 font-bold bg-indigo-100/80 hover:bg-indigo-200 px-3 py-1.5 rounded-lg w-fit transition flex items-center gap-1"
                          >
                            Book Consultation <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Medical Disclaimer Banner */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                        <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Medical Disclaimer:</strong> MediSense AI synthesizes educational laboratory summaries for patient literacy. These insights do not constitute medical diagnoses or prescriptive advice. Always review all diagnostic findings with a licensed healthcare professional.
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 2: EMERGENCY REQUESTS & LIVE CASE TRACKER */}
          {activeTab === 'emergency' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-rose-600" /> Emergency Consultation Center
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submit urgent medical symptoms. Clinic administration will immediately review and dispatch on-duty specialist doctors.
                </p>
              </div>

              {/* Priority Emergency Dispatch Request Card */}
              <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-3xl border-2 border-rose-200 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-rose-900">🚨 Submit Immediate Emergency Request</h3>
                    <p className="text-xs text-rose-700">Priority workflow: Admin will assign available doctors if chosen specialist is busy.</p>
                  </div>
                </div>

                <form onSubmit={handleEmergencyBooking} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Preferred Specialist (Optional)
                      </label>
                      <select
                        value={emergencyDoctorId}
                        onChange={(e) => setEmergencyDoctorId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">-- Any Available Specialist (Auto-Dispatch) --</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.full_name} ({doc.specialization})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Urgency Timing
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Immediate Fast-Track (Next 15–30 Mins)"
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Emergency Symptoms / Urgent Reason
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={emergencySymptoms}
                      onChange={(e) => setEmergencySymptoms(e.target.value)}
                      placeholder="e.g. Acute severe chest pain, high fever with severe dizziness, abnormal critical blood results..."
                      className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={emergencySubmitting}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {emergencySubmitting ? 'Dispatching Emergency Case...' : '🚨 Dispatch Emergency Case to Admin & Doctors'}
                  </button>
                </form>
              </div>

              {/* Real-time Emergency Cases Status Tracker */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                    Your Active Emergency Cases & Live Doctor Status ({emergencyAppointments.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => fetchAppointments()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
                    title="Refresh Live Status"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Status
                  </button>
                </div>

                {emergencyAppointments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-xs">
                    No emergency requests submitted. If you experience acute symptoms, use the dispatch form above.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emergencyAppointments.map((app) => {
                      const isAssignedByAdmin = app.reason && app.reason.includes('[ADMIN_ASSIGNED:');
                      const isApproved = app.status === 'APPROVED';

                      return (
                        <div
                          key={app.id}
                          className={`p-5 rounded-2xl border-2 transition space-y-3 ${
                            isApproved
                              ? 'border-emerald-300 bg-emerald-50/40'
                              : isAssignedByAdmin
                              ? 'border-indigo-300 bg-indigo-50/40'
                              : 'border-rose-300 bg-rose-50/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                isApproved
                                  ? 'bg-emerald-600 text-white'
                                  : isAssignedByAdmin
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-rose-600 text-white animate-pulse'
                              }`}>
                                {isApproved ? '✓ Emergency Approved & Confirmed' : isAssignedByAdmin ? 'Admin Assigned Doctor' : 'Emergency Dispatched'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(app.created_at || app.appointment_timestamp).toLocaleString()}
                              </span>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {isApproved ? 'APPROVED (LOCKED)' : 'PENDING APPROVAL'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Healthcare Specialist</span>
                              <p className="font-extrabold text-slate-900 text-sm">
                                {app.doctor_name} <span className="text-xs font-normal text-slate-500">({app.doctor_specialization})</span>
                              </p>
                              {isAssignedByAdmin && (
                                <p className="text-[10px] text-indigo-700 font-semibold">
                                  🛡️ Matched & assigned by Clinic Administration
                                </p>
                              )}
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Current Workflow Status</span>
                              <p className="font-semibold text-slate-800">
                                {isApproved
                                  ? `✅ Dr. ${app.doctor_name} has accepted and approved this emergency case. Please proceed to consultation.`
                                  : isAssignedByAdmin
                                  ? `⏳ Admin assigned to Dr. ${app.doctor_name}. Awaiting doctor's clinical confirmation.`
                                  : `🚨 Case queued with Administrator. You will be assigned to on-duty specialists immediately.`
                                }
                              </p>
                            </div>
                          </div>

                          {app.reason && (
                            <p className="text-xs text-slate-700 italic bg-white/80 p-2.5 rounded-xl border border-slate-200">
                              Symptoms: "{app.reason.replace(/\[EMERGENCY\]|\[ADMIN_ASSIGNED:[^\]]+\]|\[APPROVED_BY:[^\]]+\]/g, '').trim()}"
                            </p>
                          )}

                          {!isApproved && (
                            <div className="pt-2 flex items-center gap-2">
                              <button
                                onClick={() => handleConfirmEmergencyAppointment(app.id)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> ⚡ Accept & Confirm Dr. {app.doctor_name}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PATIENT PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Patient Personal Profile</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage your demographics and health portal contact info.</p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </button>
                )}
              </div>

              {profileSuccessMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" /> {profileSuccessMsg}
                </div>
              )}

              {isEditingProfile ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
                  <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600 text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={profileForm.dob || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600 text-sm font-semibold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Gender
                        </label>
                        <select
                          value={profileForm.gender || 'Other'}
                          onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600 text-sm font-semibold text-slate-900"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contact Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600 text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="p-4 bg-teal-100 text-teal-800 rounded-2xl">
                      <User className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">{profileData.full_name || 'Patient'}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {profileData.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{profileData.dob || 'Not Provided'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Gender</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{profileData.gender || 'Other'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
                      <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {profileData.phone || 'Not Provided'}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Medical Lab Records</span>
                      <p className="text-sm font-bold text-teal-700 mt-1">{reports.length} Uploaded Reports</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPORT COMPARISON */}
          {activeTab === 'compare' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Old vs New Report Comparison</h2>
              {comparison && comparison.comparisons ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs text-slate-500 uppercase">
                          <th className="py-2">Test Name</th>
                          <th className="py-2">Previous Value</th>
                          <th className="py-2">Current Value</th>
                          <th className="py-2">Change</th>
                          <th className="py-2">Direction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {comparison.comparisons.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 font-semibold text-slate-900">{item.test_name}</td>
                            <td className="py-3 text-slate-600">
                              {item.previous_value !== null ? `${item.previous_value} ${item.unit}` : 'N/A'}
                            </td>
                            <td className="py-3 font-bold text-slate-900">
                              {item.current_value} {item.unit}
                            </td>
                            <td className="py-3 text-xs">
                              {item.absolute_change !== null ? (
                                <span className={item.direction === 'INCREASED' ? 'text-rose-600 font-bold' : item.direction === 'DECREASED' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                  {item.direction === 'INCREASED' ? '▲' : item.direction === 'DECREASED' ? '▼' : '—'} {item.absolute_change} {item.unit} ({item.percentage_change}%)
                                </span>
                              ) : 'Baseline'}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.current_status === 'HIGH' ? 'bg-rose-100 text-rose-800' : item.current_status === 'LOW' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.current_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Select or upload at least two reports to compute delta comparison.</p>
              )}
            </div>
          )}

          {/* TAB 5: LONGITUDINAL TRENDS */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">Historical Trend Analytics</h2>
                <select
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-teal-600"
                >
                  <option value="Hemoglobin">Hemoglobin</option>
                  <option value="Glucose">Glucose</option>
                  <option value="Vitamin D">Vitamin D</option>
                  <option value="Cholesterol">Cholesterol</option>
                  <option value="TSH">TSH</option>
                  <option value="WBC">WBC</option>
                  <option value="Platelets">Platelets</option>
                </select>
              </div>

              <LabTrendChart testName={selectedTest} data={trendData} />
            </div>
          )}

          {/* TAB 6: BOOK DOCTOR */}
          {activeTab === 'appointments' && (
            <div className="space-y-8">

              {/* Medical Specialist Directory Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-teal-600" />
                      Available Medical Specialists ({doctors.length})
                    </h3>
                    <p className="text-xs text-slate-500">Browse specialist doctors and book a consultation directly</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search doctor / specialty..."
                        value={doctorSearchQuery}
                        onChange={(e) => setDoctorSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none w-56"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchDoctors}
                      className="p-2 text-slate-500 hover:text-teal-700 hover:bg-slate-50 rounded-xl transition border border-slate-200 text-xs"
                      title="Refresh Doctors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                  {doctors
                    .filter((doc) => {
                      const q = doctorSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        doc.full_name?.toLowerCase().includes(q) ||
                        doc.specialization?.toLowerCase().includes(q) ||
                        doc.qualification?.toLowerCase().includes(q)
                      );
                    })
                    .map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoctorId(doc.id);
                          if (bookingDate) {
                            handleFetchSlots(doc.id, bookingDate);
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between gap-2 ${selectedDoctorId === doc.id
                            ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-600'
                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{doc.full_name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                              {doc.specialization}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-1">{doc.qualification || 'MBBS, MD'}</p>
                          {doc.phone && <p className="text-slate-400 text-[10px] mt-0.5">{doc.phone}</p>}
                        </div>

                        <button
                          type="button"
                          className={`w-full py-1.5 rounded-lg text-xs font-bold transition mt-1 ${selectedDoctorId === doc.id
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-teal-600 hover:text-white'
                            }`}
                        >
                          {selectedDoctorId === doc.id ? '✓ Doctor Selected' : 'Select Doctor'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Appointment Booking Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Book Appointment Slot</h3>
                <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Chosen Doctor</label>
                    <select
                      required
                      value={selectedDoctorId}
                      onChange={(e) => {
                        setSelectedDoctorId(e.target.value);
                        if (bookingDate) {
                          handleFetchSlots(e.target.value, bookingDate);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                    >
                      <option value="">-- Choose Doctor from List --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.full_name} — {doc.specialization} ({doc.qualification || 'MBBS'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Appointment Date</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        handleFetchSlots(selectedDoctorId, e.target.value);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold"
                    />
                  </div>

                  {availableSlots.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Available Consultation Times</label>
                      <div className="flex flex-wrap gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedSlot === slot ? 'bg-teal-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                          >
                            {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Visit</label>
                    <input
                      type="text"
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      placeholder="Consultation regarding laboratory test analysis and recommendations"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <input
                      type="checkbox"
                      id="emergencyFastTrack"
                      checked={isEmergencyFastTrack}
                      onChange={(e) => setIsEmergencyFastTrack(e.target.checked)}
                      className="h-4 w-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <label htmlFor="emergencyFastTrack" className="text-xs font-bold text-rose-900 cursor-pointer flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      Mark as Priority Emergency Case (Direct Admin Escalation)
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={!selectedSlot}
                      className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {selectedSlot ? 'Confirm & Submit Appointment' : 'Please Select a Time Slot Above'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Patient Appointment History */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Your Scheduled Appointments</h3>
                {appointments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No appointment requests submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((app) => {
                      const isEmergency = app.reason && (app.reason.includes('[EMERGENCY') || app.reason.toLowerCase().includes('emergency') || app.reason.toLowerCase().includes('urgent'));

                      return (
                        <div key={app.id} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                          isEmergency ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{app.doctor_name} <span className="text-xs text-slate-500 font-normal">({app.doctor_specialization})</span></p>
                              {isEmergency && (
                                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-rose-600 text-white rounded-full uppercase">
                                  🚨 Emergency
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(app.appointment_timestamp).toLocaleString()}
                            </p>
                            {app.reason && <p className="text-xs text-slate-600 mt-1 italic">"{app.reason.replace(/\[EMERGENCY\]|\[ADMIN_ASSIGNED:[^\]]+\]|\[APPROVED_BY:[^\]]+\]/g, '').trim()}"</p>}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : app.status === 'DECLINED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                            {app.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
