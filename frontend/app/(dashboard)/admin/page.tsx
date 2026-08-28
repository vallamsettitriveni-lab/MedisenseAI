'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Database,
  ShieldAlert,
  Lock,
  User,
  Stethoscope,
  Clock,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  UserPlus,
  UserX,
  Award,
  RefreshCw
} from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'patients' | 'doctor_directory' | 'emergency' | 'doctor_approvals' | 'appointments' | 'knowledge' | 'audit'
  >('doctor_directory');

  // Data states
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filter states
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);

  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Emergency assignment modal state
  const [assigningApptId, setAssigningApptId] = useState<string | null>(null);
  const [selectedMatchDoctorId, setSelectedMatchDoctorId] = useState<string>('');

  // Knowledge base form
  const [docTitle, setDocTitle] = useState('');
  const [docSource, setDocSource] = useState('Clinical Protocol');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleTriggerSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/seed`, { method: 'POST' });
      if (res.ok) {
        alert('Database initialized and seeded with 20 doctors and admin accounts!');
        await fetchDoctors();
        const token = localStorage.getItem('token');
        if (token) {
          fetchPatients(token);
          fetchAppointments(token);
          fetchAuditLogs(token);
        }
      } else {
        alert('Seeding failed. Please check server logs.');
      }
    } catch (e) {
      console.error('Seed error:', e);
      alert('Could not trigger seed.');
    } finally {
      setSeeding(false);
    }
  };

  // Strict Authentication Guard (ADMIN role only)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token || userRole !== 'ADMIN') {
      setIsAuthorized(false);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      router.push('/admin/login');
      return;
    }

    setIsAuthorized(true);
    fetchPatients(token);
    fetchAppointments(token);
    fetchDoctors();
    fetchAuditLogs(token);
  }, []);

  const fetchPatients = async (authToken?: string) => {
    const token = authToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/patients/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPatients(await res.json());
      }
    } catch (e) {
      console.error('Error fetching patients:', e);
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

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors/?only_approved=false`);
      if (res.ok) {
        setDoctors(await res.json());
      }
    } catch (e) {
      console.error('Error fetching doctors:', e);
    }
  };

  const fetchAuditLogs = async (authToken?: string) => {
    const token = authToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    }
  };

  // Toggle Doctor Approval
  const handleToggleApproval = async (doctorId: string, isApproved: boolean) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctors/${doctorId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_approved: isApproved }),
      });
      if (res.ok) {
        alert(`Doctor account status updated to ${isApproved ? 'Approved' : 'Disabled'}.`);
        fetchDoctors();
      }
    } catch (e) {
      console.error('Error updating doctor approval:', e);
    }
  };

  // Admin Emergency Doctor Matchmaking & Appointment Assignment
  const handleAssignEmergencyDoctor = async (apptId: string) => {
    if (!selectedMatchDoctorId) {
      alert('Please select a doctor to assign to this emergency booking.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/appointments/${apptId}/assign-doctor`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_id: selectedMatchDoctorId,
          status: 'APPROVED',
        }),
      });

      if (res.ok) {
        alert('Emergency appointment successfully assigned and confirmed with the selected doctor!');
        setAssigningApptId(null);
        setSelectedMatchDoctorId('');
        fetchAppointments();
      } else {
        const err = await res.json();
        alert(`Assignment failed: ${err.detail}`);
      }
    } catch (e) {
      console.error('Error assigning emergency doctor:', e);
    }
  };

  // Ingest knowledge base document
  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !docTitle) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIngesting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/knowledge/upload?title=${encodeURIComponent(docTitle)}&source=${encodeURIComponent(docSource)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (res.ok) {
        alert('Document ingested into pgvector knowledge base successfully!');
        setDocTitle('');
        setSelectedFile(null);
      }
    } catch (e) {
      console.error('Ingestion error:', e);
    } finally {
      setIngesting(false);
    }
  };

  // Filtered Patients
  const filteredPatients = patients.filter((p) => {
    const query = patientSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      (p.full_name && p.full_name.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query)) ||
      (p.phone && p.phone.toLowerCase().includes(query))
    );
  });

  // Filtered Doctors (Directory search by Name, ID, Specialization, or Qualification)
  const filteredDoctors = doctors.filter((doc) => {
    const query = doctorSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      (doc.full_name && doc.full_name.toLowerCase().includes(query)) ||
      (doc.id && doc.id.toLowerCase().includes(query)) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(query)) ||
      (doc.qualification && doc.qualification.toLowerCase().includes(query))
    );
  });

  // Pending Doctor Approvals List
  const pendingDoctors = doctors.filter((doc) => !doc.is_approved);

  // Filtered System Appointments
  const filteredAppointments = appointments.filter((app) => {
    const query = appointmentSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (app.patient_name && app.patient_name.toLowerCase().includes(query)) ||
      (app.doctor_name && app.doctor_name.toLowerCase().includes(query)) ||
      (app.doctor_specialization && app.doctor_specialization.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Emergency / Sudden Appointments (Pending or with emergency keywords)
  const emergencyAppointments = appointments.filter(
    (app) => app.status === 'PENDING' || (app.reason && app.reason.toLowerCase().includes('urgent'))
  );

  // Get appointments for selected patient
  const patientAppointments = selectedPatient
    ? appointments.filter((app) => app.patient_id === selectedPatient.id || app.patient_name === selectedPatient.full_name)
    : [];

  // Get appointments for selected doctor
  const doctorAppointments = selectedDoctor
    ? appointments.filter((app) => app.doctor_id === selectedDoctor.id || app.doctor_name === selectedDoctor.full_name)
    : [];

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="h-12 w-12 text-indigo-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold">Admin Authentication Required</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-sm">
          Access restricted to Super Admin. Redirecting to admin login...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white py-6 px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-700/50 rounded-2xl border border-indigo-500/30">
              <Shield className="h-6 w-6 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Admin Command Center</h1>
              <p className="text-xs text-indigo-200 mt-0.5">
                Doctor Directory • Emergency Matchmaker • Doctor Approvals • Patient Directory
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerSeed}
              disabled={seeding}
              className="px-4 py-2 bg-indigo-700/80 hover:bg-indigo-600 border border-indigo-400/40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-200 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding...' : '⚡ Seed Database (20 Doctors)'}
            </button>
            <div className="hidden sm:block text-right text-xs text-indigo-300">
              <span>Super Administrator</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            
            {/* Doctor Directory Tab */}
            <button
              onClick={() => {
                setActiveTab('doctor_directory');
                setSelectedDoctor(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'doctor_directory' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="h-4 w-4" /> Doctor Directory
            </button>

            {/* Emergency & Sudden Bookings Tab */}
            <button
              onClick={() => setActiveTab('emergency')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'emergency' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Emergency Section
              </span>
              {emergencyAppointments.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {emergencyAppointments.length}
                </span>
              )}
            </button>

            {/* Doctor Approvals Queue Tab */}
            <button
              onClick={() => setActiveTab('doctor_approvals')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'doctor_approvals' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Award className="h-4 w-4" /> Doctor Approvals
              </span>
              {pendingDoctors.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {pendingDoctors.length}
                </span>
              )}
            </button>

            {/* Patient Directory Tab */}
            <button
              onClick={() => {
                setActiveTab('patients');
                setSelectedPatient(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'patients' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="h-4 w-4" /> Patient Directory
            </button>

            {/* System Appointments Tab */}
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'appointments' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Calendar className="h-4 w-4" /> System Appointments
            </button>

            {/* RAG Knowledge Base Tab */}
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'knowledge' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Database className="h-4 w-4" /> RAG Knowledge Base
            </button>

            {/* Audit Logs Tab */}
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'audit' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="h-4 w-4" /> System Audit Logs
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="md:col-span-3 space-y-6">

          {/* SECTION 1: DOCTOR DIRECTORY */}
          {activeTab === 'doctor_directory' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Doctor Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspect all clinical specialists, qualifications, positions, and consultation schedules.
                  </p>
                </div>

                {/* Doctor Search Bar (Name or Doctor ID or Specialization) */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search doctor name or ID..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Selected Doctor Detailed View */}
              {selectedDoctor ? (
                <div className="bg-white p-6 rounded-2xl border border-sky-200 shadow-md space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-sky-100 text-sky-800 rounded-2xl">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{selectedDoctor.full_name}</h3>
                        <p className="text-xs font-semibold text-sky-700">{selectedDoctor.specialization}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDoctor(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    >
                      Back to Doctor List
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor ID</span>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">{selectedDoctor.id}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Medical Qualification</span>
                      <p className="text-sm font-bold text-indigo-700 mt-1">{selectedDoctor.qualification || 'MBBS, MD'}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Contact</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{selectedDoctor.phone || 'N/A'}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Verification Status</span>
                      <span
                        className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          selectedDoctor.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {selectedDoctor.is_approved ? 'APPROVED' : 'PENDING APPROVAL'}
                      </span>
                    </div>
                  </div>

                  {/* Doctor's Appointments */}
                  <div className="space-y-4 pt-2">
                    <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-sky-600" /> Consultations & Appointments Schedule
                    </h4>
                    {doctorAppointments.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl border text-center text-slate-500 text-sm">
                        No appointments currently scheduled for this doctor.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {doctorAppointments.map((app) => (
                          <div
                            key={app.id}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                Patient: <span className="text-slate-800">{app.patient_name}</span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(app.appointment_timestamp).toLocaleString()}
                              </p>
                              {app.reason && <p className="text-xs text-slate-600 italic">"{app.reason}"</p>}
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                app.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'DECLINED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Doctor Directory Table */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-6">Doctor Name & ID</th>
                          <th className="py-3 px-6">Specialization / Position</th>
                          <th className="py-3 px-6">Qualification</th>
                          <th className="py-3 px-6">Status</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredDoctors.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                              No doctor matching "{doctorSearch}" found.
                            </td>
                          </tr>
                        ) : (
                          filteredDoctors.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50 transition">
                              <td className="py-4 px-6">
                                <p className="font-bold text-slate-900">{doc.full_name}</p>
                                <p className="text-[10px] font-mono text-slate-400">{doc.id}</p>
                              </td>
                              <td className="py-4 px-6 font-semibold text-sky-700 text-xs">
                                {doc.specialization}
                              </td>
                              <td className="py-4 px-6 text-xs font-bold text-slate-700">
                                {doc.qualification || 'MBBS, MD'}
                              </td>
                              <td className="py-4 px-6">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    doc.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {doc.is_approved ? 'APPROVED' : 'PENDING'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => setSelectedDoctor(doc)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-lg transition"
                                >
                                  Inspect Profile & Schedule <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: EMERGENCY APPOINTMENTS & DOCTOR MATCHMAKER */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-rose-600" /> Emergency & Urgent Bookings
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage sudden patient appointment requests and assign available doctors based on their clinical schedules.
                </p>
              </div>

              {emergencyAppointments.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-lg">No Pending Emergency Cases</h3>
                  <p className="text-slate-500 text-sm">All sudden patient appointment requests have been processed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emergencyAppointments.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white p-6 rounded-2xl border-2 border-rose-100 shadow-sm space-y-4 flex flex-col md:flex-row md:items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase">
                            Emergency Request
                          </span>
                          <span className="text-xs text-slate-400">
                            Booked: {new Date(app.created_at || app.appointment_timestamp).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{app.patient_name}</h4>
                        <p className="text-xs text-slate-600">
                          Requested Date/Time:{' '}
                          <span className="font-bold text-slate-900">{new Date(app.appointment_timestamp).toLocaleString()}</span>
                        </p>
                        {app.reason && (
                          <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                            Urgency / Reason: "{app.reason}"
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          Currently Assigned:{' '}
                          <span className="font-semibold text-slate-800">{app.doctor_name} ({app.doctor_specialization})</span>
                        </p>
                      </div>

                      {/* Admin Doctor Assignment Controls */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-w-xs w-full">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Assign Available Doctor:
                        </label>
                        <select
                          value={assigningApptId === app.id ? selectedMatchDoctorId : ''}
                          onChange={(e) => {
                            setAssigningApptId(app.id);
                            setSelectedMatchDoctorId(e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-sm"
                        >
                          <option value="">-- Choose Doctor from Schedule --</option>
                          {doctors
                            .filter((d) => d.is_approved)
                            .map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.full_name} ({doc.specialization})
                              </option>
                            ))}
                        </select>

                        <button
                          onClick={() => handleAssignEmergencyDoctor(app.id)}
                          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" /> Assign Doctor & Confirm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: DOCTOR ACCOUNT VERIFICATION & APPROVALS */}
          {activeTab === 'doctor_approvals' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-600" /> Doctor Verification & Approvals
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Inspect medical qualifications of newly registered doctors. Only approved doctors can enter the Doctor Workspace.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Doctor Name</th>
                        <th className="py-3 px-4">Qualification</th>
                        <th className="py-3 px-4">Specialization</th>
                        <th className="py-3 px-4">Approval Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {doctors.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-bold text-slate-900">{doc.full_name}</td>
                          <td className="py-4 px-4 text-xs font-bold text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-md w-fit">
                            {doc.qualification || 'MBBS, MD'}
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-slate-700">{doc.specialization}</td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                doc.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {doc.is_approved ? 'APPROVED' : 'PENDING VERIFICATION'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {doc.is_approved ? (
                              <button
                                onClick={() => handleToggleApproval(doc.id, false)}
                                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition flex items-center gap-1 ml-auto"
                              >
                                <UserX className="h-3.5 w-3.5" /> Revoke Approval
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleApproval(doc.id, true)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1 ml-auto"
                              >
                                <UserCheck className="h-3.5 w-3.5" /> Verify & Approve Account
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: PATIENT DIRECTORY (UNCHANGED) */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Patient Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search patients, view profiles, and inspect booked doctor appointments.
                  </p>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search by name, email..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {selectedPatient ? (
                <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-md space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-teal-100 text-teal-800 rounded-2xl">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{selectedPatient.full_name}</h3>
                        <p className="text-xs text-slate-500">{selectedPatient.email || 'No email associated'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    >
                      Back to Directory List
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{selectedPatient.phone || 'N/A'}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Gender / DOB</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        {selectedPatient.gender || 'N/A'} {selectedPatient.dob ? `(${selectedPatient.dob})` : ''}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lab Reports</span>
                      <p className="text-sm font-bold text-teal-700 mt-1">{selectedPatient.reports_count || 0} Uploaded</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Appointments</span>
                      <p className="text-sm font-bold text-sky-700 mt-1">{patientAppointments.length} Booked</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" /> Booked Doctor Appointments
                    </h4>

                    {patientAppointments.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl border text-center text-slate-500 text-sm">
                        No appointment records found for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientAppointments.map((app) => (
                          <div
                            key={app.id}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 text-sm">
                                Assigned Doctor: <span className="text-indigo-700 font-extrabold">{app.doctor_name}</span>{' '}
                                <span className="text-xs text-slate-500 font-normal">({app.doctor_specialization})</span>
                              </p>
                              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {new Date(app.appointment_timestamp).toLocaleString()}
                              </p>
                              {app.reason && (
                                <p className="text-xs text-slate-500 italic">Reason: "{app.reason}"</p>
                              )}
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                app.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'DECLINED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : app.status === 'COMPLETED'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-6">Patient Name</th>
                          <th className="py-3 px-6">Email Address</th>
                          <th className="py-3 px-6">Phone</th>
                          <th className="py-3 px-6">Reports</th>
                          <th className="py-3 px-6">Appointments</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredPatients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                              No patients matching "{patientSearch}" found.
                            </td>
                          </tr>
                        ) : (
                          filteredPatients.map((pat) => (
                            <tr key={pat.id} className="hover:bg-slate-50 transition">
                              <td className="py-4 px-6 font-bold text-slate-900">{pat.full_name}</td>
                              <td className="py-4 px-6 text-slate-600 text-xs">{pat.email || 'N/A'}</td>
                              <td className="py-4 px-6 text-slate-600 text-xs">{pat.phone || 'N/A'}</td>
                              <td className="py-4 px-6 text-xs font-semibold text-teal-700">
                                {pat.reports_count || 0}
                              </td>
                              <td className="py-4 px-6 text-xs font-semibold text-sky-700">
                                {pat.appointments_count || 0}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => setSelectedPatient(pat)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition"
                                >
                                  View Details & Appointments <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: ALL SYSTEM APPOINTMENTS (UNCHANGED) */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">All System Appointments</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspect which doctor each patient booked an appointment with across the entire system.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="DECLINED">Declined</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={appointmentSearch}
                      onChange={(e) => setAppointmentSearch(e.target.value)}
                      placeholder="Doctor or patient..."
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-6">Patient Name</th>
                        <th className="py-3 px-6">Booked Doctor</th>
                        <th className="py-3 px-6">Specialty</th>
                        <th className="py-3 px-6">Date & Time</th>
                        <th className="py-3 px-6">Reason</th>
                        <th className="py-3 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                            No appointments found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50 transition">
                            <td className="py-4 px-6 font-bold text-slate-900">{app.patient_name}</td>
                            <td className="py-4 px-6 font-bold text-indigo-700">{app.doctor_name}</td>
                            <td className="py-4 px-6 text-slate-600 text-xs">{app.doctor_specialization}</td>
                            <td className="py-4 px-6 text-slate-600 text-xs">
                              {new Date(app.appointment_timestamp).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-slate-500 text-xs truncate max-w-xs">
                              {app.reason || '-'}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  app.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : app.status === 'DECLINED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : app.status === 'COMPLETED'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {app.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: RAG KNOWLEDGE BASE (UNCHANGED) */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Ingest RAG Guidelines (pgvector)</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-lg">
                <form onSubmit={handleIngestDocument} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Guideline Title</label>
                    <input
                      type="text"
                      required
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Anemia & Hemoglobin Reference Guidelines"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Source / Citation</label>
                    <input
                      type="text"
                      value={docSource}
                      onChange={(e) => setDocSource(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Guideline Text/MD File</label>
                    <input
                      type="file"
                      required
                      accept=".txt,.md"
                      onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ingesting}
                    className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {ingesting ? 'Ingesting Chunks & Embeddings...' : 'Upload & Ingest to pgvector'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SECTION 7: AUDIT LOGS (UNCHANGED) */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Security & Activity Audit Logs</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500 uppercase">
                        <th className="py-2">Timestamp</th>
                        <th className="py-2">Action</th>
                        <th className="py-2">User ID</th>
                        <th className="py-2">Resource</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 font-semibold text-indigo-700 text-xs">{log.action}</td>
                          <td className="py-3 text-xs text-slate-600">{log.user_id || 'Anonymous'}</td>
                          <td className="py-3 text-xs text-slate-500 truncate max-w-xs">{log.resource || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
