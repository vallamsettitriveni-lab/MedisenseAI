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
  FileSpreadsheet
} from 'lucide-react';
import LabTrendChart from '@/components/charts/LabTrendChart';
import Navbar from '@/components/shared/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function PatientDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [patientLastName, setPatientLastName] = useState<string>('Patient');
  const [activeTab, setActiveTab] = useState<'reports' | 'profile' | 'compare' | 'trends' | 'appointments'>('reports');

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

  // Appointment booking states
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookingReason, setBookingReason] = useState<string>('');

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

  const fetchPatientProfile = async (authToken?: string) => {
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

  const fetchReports = async (authToken?: string) => {
    const token = authToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0) {
          setSelectedReport(data[0]);
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

  const fetchAppointments = async (authToken?: string) => {
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
        setSelectedReport(newReport);
        setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
        fetchComparison(newReport.id);
        fetchTrendChart(selectedTest);
        alert(`Successfully processed report '${file.name}'! Lab values and AI summary generated.`);
      } else {
        alert('Report parsing failed. Please check the PDF format.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  // Delete an uploaded report
  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this medical report? All extracted lab values will be permanently removed.')) {
      return;
    }

    setDeletingId(reportId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
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
      } else {
        alert('Could not delete report.');
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFetchSlots = async (docId: string, dateStr: string) => {
    if (!docId || !dateStr) return;
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/slots?doctor_id=${docId}&date_str=${dateStr}`);
      if (res.ok) {
        setAvailableSlots(await res.json());
      }
    } catch (e) {
      console.error('Error fetching slots:', e);
    }
  };

  // Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) return;

    const token = localStorage.getItem('token');
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
          reason: bookingReason,
        }),
      });
      if (res.ok) {
        alert('Appointment request submitted successfully!');
        setSelectedSlot('');
        setBookingReason('');
        await fetchAppointments();
      } else {
        const data = await res.json();
        alert(`Booking error: ${data.detail}`);
      }
    } catch (e) {
      console.error('Booking error:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'trends' && isAuthorized) {
      fetchTrendChart(selectedTest);
    }
  }, [activeTab, selectedTest, isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="h-12 w-12 text-teal-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold">Authentication Required</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-sm">
          You must log in with valid Patient credentials to access this dashboard. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Patient Welcome Greeting Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-950 text-white py-6 px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600/50 rounded-2xl border border-teal-500/30">
              <UserCheck className="h-6 w-6 text-teal-200" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Welcome, {patientLastName}!</h1>
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
              <p className="text-xs text-teal-100 mt-1">Extract test values & AI educational summary</p>
            </div>
            <label className="block w-full text-center py-2.5 bg-white text-teal-900 font-bold text-xs rounded-xl cursor-pointer hover:bg-teal-50 transition shadow-sm">
              {uploading ? 'Processing PDF...' : 'Select PDF File'}
              <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="md:col-span-3 space-y-6">

          {/* TAB 1: REPORTS & AI ANALYSIS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Medical Reports & AI Analysis</h2>

              {reports.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-700 text-lg">No medical reports uploaded yet</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Upload your blood test PDF report using the sidebar button to extract structured laboratory values and AI summaries.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* TOP ROW: SIDE-BY-SIDE (Left: Uploaded History with Up/Down Drop, Right: Extracted Lab Values) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Left Column (5/12): Uploaded History with fixed height, Drag/Scroll Up-Down & Delete */}
                    <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[460px]">

                      {/* Header */}
                      <div className="px-2 pb-3 border-b border-slate-100 mb-2 shrink-0">
                        <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Uploaded History</h3>
                        <p className="text-[11px] text-slate-400">{reports.length} report(s) on record</p>
                      </div>

                      {/* Scrollable / Page-moveable Container */}
                      <div
                        ref={historyScrollRef}
                        className="flex-1 overflow-y-auto pr-1 space-y-2 select-none scrollbar-thin scrollbar-thumb-slate-200"
                      >
                        {reports.map((rep) => (
                          <div
                            key={rep.id}
                            onClick={() => {
                              setSelectedReport(rep);
                              fetchComparison(rep.id);
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

                            {/* Delete Button for each report */}
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

                    {/* Right Column (7/12): Extracted Laboratory Values side-by-side */}
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
                              {selectedReport.lab_results?.length || 0} Test Parameters
                            </span>
                          </div>

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
                                {selectedReport.lab_results?.map((lab: any) => (
                                  <tr key={lab.id} className="hover:bg-slate-50">
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
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                          Select a report from the upload history to view extracted values.
                        </div>
                      )}
                    </div>

                  </div>

                  {/* BOTTOM ROW: AI Educational Summary & Guidance (Down of Extracted Laboratory Values) */}
                  {selectedReport && selectedReport.ai_explanation && (
                    <div className="bg-white p-6 rounded-2xl border border-teal-200 shadow-sm space-y-5">
                      <div className="flex items-center gap-2 text-teal-800 font-bold border-b border-slate-100 pb-3">
                        <Sparkles className="h-5 w-5 text-teal-600" />
                        <h3 className="text-lg">AI Educational Summary & Guidance</h3>
                      </div>

                      <div className="p-4 bg-teal-50/40 rounded-xl text-sm leading-relaxed text-slate-700 whitespace-pre-line border border-teal-100">
                        {selectedReport.ai_explanation.precautions}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                            <Apple className="h-4 w-4" /> Nutrition & Lifestyle Recommendations
                          </div>
                          <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                            {selectedReport.ai_explanation.lifestyle_suggestions}
                          </p>
                        </div>

                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-2">
                          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                            <ShieldAlert className="h-4 w-4" /> Patient Precautions & Doctor Questions
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Always consult your physician for personalized medical advice. Use these educational findings to ask targeted questions during your clinical appointments.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY PROFILE (VIEW & EDIT PATIENT REGISTRATION DETAILS) */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Patient Profile & Registration Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View your registration details and update your personal health information.
                  </p>
                </div>

                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    <Edit3 className="h-4 w-4" /> Edit Profile Details
                  </button>
                )}
              </div>

              {profileSuccessMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" /> {profileSuccessMsg}
                </div>
              )}

              {isEditingProfile ? (
                /* Edit Profile Form */
                <div className="bg-white p-8 rounded-2xl border border-teal-200 shadow-md max-w-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-teal-600" /> Edit Registration Information
                    </h3>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
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

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address (Registered Account)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profileData.email || ''}
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Account login email cannot be modified.</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
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
                /* View Profile Card */
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

          {/* TAB 3: REPORT COMPARISON */}
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
                                <span className={item.absolute_change > 0 ? 'text-blue-600 font-semibold' : 'text-slate-600'}>
                                  {item.absolute_change > 0 ? `+${item.absolute_change}` : item.absolute_change} ({item.percentage_change}%)
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.direction === 'INCREASED' ? 'bg-sky-100 text-sky-800' : item.direction === 'DECREASED' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                {item.direction}
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

          {/* TAB 4: LONGITUDINAL TRENDS */}
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

          {/* TAB 5: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Book Doctor Appointment</h3>
                <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Doctor</label>
                    <select
                      required
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="">-- Choose Doctor --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.full_name} ({doc.specialization})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        handleFetchSlots(selectedDoctorId, e.target.value);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  {availableSlots.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Available Time Slot</label>
                      <div className="flex flex-wrap gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedSlot === slot ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      placeholder="Consultation regarding abnormal lab values"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={!selectedSlot}
                      className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      Submit Appointment Request
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Your Scheduled Appointments</h3>
                {appointments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No appointment requests submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((app) => (
                      <div key={app.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{app.doctor_name} <span className="text-xs text-slate-500 font-normal">({app.doctor_specialization})</span></p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(app.appointment_timestamp).toLocaleString()}
                          </p>
                          {app.reason && <p className="text-xs text-slate-600 mt-1 italic">"{app.reason}"</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : app.status === 'DECLINED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                          {app.status}
                        </span>
                      </div>
                    ))}
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
