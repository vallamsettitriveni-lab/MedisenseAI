'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  Lock,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  User,
  Phone
} from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { API_BASE_URL } from '@/lib/api';

export default function DoctorDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Dr. Doctor');
  const [activeTab, setActiveTab] = useState<'emergency' | 'appointments' | 'patients' | 'availability'>('appointments');
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');

  // Format clean doctor greeting name (e.g., "Sreeja" -> "Dr. Sreeja", "Dr. Sreeja" -> "Dr. Sreeja")
  const formatDoctorGreeting = (rawName?: string): string => {
    if (!rawName || rawName === 'System Administrator' || rawName === 'Doctor') {
      const cached = localStorage.getItem('doctor_name');
      if (cached && cached !== 'System Administrator') {
        rawName = cached;
      }
    }
    if (!rawName) return 'Dr. Specialist';
    const trimmed = rawName.trim();
    if (trimmed.toLowerCase().startsWith('dr.') || trimmed.toLowerCase().startsWith('dr ')) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return `Dr. ${trimmed}`;
  };

  // Strict Authentication & Profile Fetching
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token || (userRole !== 'DOCTOR' && userRole !== 'ADMIN')) {
      setIsAuthorized(false);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      router.push('/doctor/login');
      return;
    }

    setIsAuthorized(true);
    
    // Initial name from localStorage
    const cachedName = localStorage.getItem('doctor_name');
    if (cachedName && cachedName !== 'System Administrator') {
      setDoctorName(formatDoctorGreeting(cachedName));
    }

    fetchProfile(token);
    fetchAppointments(token);
    fetchPatients(token);
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const profile = await res.json();
        let nameToUse = profile.full_name;
        if (!nameToUse || nameToUse === 'System Administrator') {
          nameToUse = localStorage.getItem('doctor_name') || 'Doctor';
        }
        const formatted = formatDoctorGreeting(nameToUse);
        setDoctorName(formatted);
        localStorage.setItem('doctor_name', formatted);
        setIsApproved(profile.is_approved ?? true);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
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

  const handleUpdateStatus = async (apptId: string, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const handleSetAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: 30,
        }),
      });
      if (res.ok) {
        alert('Availability schedule updated successfully!');
      }
    } catch (e) {
      console.error('Error setting availability:', e);
    }
  };

  // Emergency / Urgent cases assigned to THIS doctor
  const emergencyCases = appointments.filter(
    (app) => (app.reason && app.reason.toLowerCase().includes('urgent')) || (app.status === 'APPROVED' && app.reason)
  );

  // PATIENT ROSTER: Strictly ONLY patients who have booked or been assigned an appointment with THIS doctor
  // Build unique patient map from this doctor's appointments only
  const myDoctorPatientsMap = new Map<string, any>();

  appointments.forEach((app) => {
    const patientKey = app.patient_id || app.patient_name;
    if (!myDoctorPatientsMap.has(patientKey)) {
      // Find matching patient profile from all patients if available for extra contact fields
      const matchedProfile = patients.find(
        (p) => p.id === app.patient_id || p.full_name.toLowerCase() === app.patient_name.toLowerCase()
      );

      myDoctorPatientsMap.set(patientKey, {
        patient_id: app.patient_id,
        full_name: app.patient_name,
        gender: matchedProfile?.gender || 'Not specified',
        phone: matchedProfile?.phone || 'N/A',
        email: matchedProfile?.email || 'N/A',
        latest_appointment: app.appointment_timestamp,
        latest_status: app.status,
        latest_reason: app.reason || 'General Consultation',
        total_appointments: appointments.filter(
          (a) => a.patient_id === app.patient_id || a.patient_name === app.patient_name
        ).length,
      });
    }
  });

  const myDoctorPatientsList = Array.from(myDoctorPatientsMap.values());

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="h-12 w-12 text-sky-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold">Authentication Required</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-sm">
          You must log in with valid Doctor credentials to access this workspace. Redirecting to login...
        </p>
      </div>
    );
  }

  // Account Pending Approval Guard
  if (isApproved === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="p-4 bg-amber-100 text-amber-800 rounded-3xl mb-4 border border-amber-200 shadow-sm">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Doctor Account Pending Approval</h2>
          <p className="text-slate-600 mt-3 text-sm leading-relaxed">
            Welcome, <span className="font-bold text-slate-900">{doctorName}</span>. Your registered medical qualification and credentials are currently undergoing verification by the System Administrator.
          </p>
          <div className="mt-6 p-4 bg-white border border-amber-200 rounded-2xl text-xs text-amber-900 text-left space-y-1">
            <p className="font-bold">Next Steps:</p>
            <p>1. The Administrator will review your specialization and qualification in the Admin Approval queue.</p>
            <p>2. Once approved, your Doctor Workspace will be unlocked automatically upon your next login.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Doctor Welcome Greeting Banner */}
      <div className="bg-gradient-to-r from-sky-800 to-sky-950 text-white py-6 px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-600/50 rounded-2xl border border-sky-500/30">
              <UserCheck className="h-6 w-6 text-sky-200" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Welcome, {doctorName}!
              </h1>
              <p className="text-xs text-sky-200 mt-0.5">
                Clinical Workspace • Assigned Consultations • Doctor Patient Roster • Availability
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right text-xs text-sky-300">
            <span>Healthcare Specialist Workspace</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            
            {/* Standard Appointment Requests Tab */}
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'appointments' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Calendar className="h-4 w-4" /> Appointment Requests
              </span>
              {appointments.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800">
                  {appointments.length}
                </span>
              )}
            </button>

            {/* Emergency Cases Tab */}
            <button
              onClick={() => setActiveTab('emergency')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'emergency' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Emergency Cases
              </span>
              {emergencyCases.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {emergencyCases.length}
                </span>
              )}
            </button>

            {/* Doctor-Specific Patient Roster Tab */}
            <button
              onClick={() => setActiveTab('patients')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'patients' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users className="h-4 w-4" /> My Patient Roster
              </span>
              {myDoctorPatientsList.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800">
                  {myDoctorPatientsList.length}
                </span>
              )}
            </button>

            {/* Manage Availability Schedule */}
            <button
              onClick={() => setActiveTab('availability')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                activeTab === 'availability' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-4 w-4" /> Manage Availability
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="md:col-span-3 space-y-6">

          {/* TAB 1: APPOINTMENT REQUESTS */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Patient Appointment Requests</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Scheduled consultation requests for {doctorName} submitted by patients or assigned by clinic administration.
                </p>
              </div>

              {appointments.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-700 text-lg">No appointments currently scheduled</h3>
                  <p className="text-slate-500 text-sm">When patients book a consultation with you, their requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((app) => (
                    <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{app.patient_name}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Scheduled Slot: <span className="font-semibold text-slate-800">{new Date(app.appointment_timestamp).toLocaleString()}</span>
                        </p>
                        {app.reason && (
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            Reason for Visit: "{app.reason}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'APPROVED')}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'DECLINED')}
                              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {app.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                            className="px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                          >
                            Mark Completed
                          </button>
                        )}
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'DECLINED'
                            ? 'bg-rose-100 text-rose-800'
                            : app.status === 'COMPLETED'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EMERGENCY CASES ASSIGNED BY ADMIN */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-rose-600" /> Admin-Assigned Emergency Cases
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Urgent patient appointments matched and assigned specifically to {doctorName} by the Administrator.
                </p>
              </div>

              {emergencyCases.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-lg">No Pending Emergency Assignments</h3>
                  <p className="text-slate-500 text-sm">You currently have no emergency cases assigned by Admin.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emergencyCases.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white p-6 rounded-2xl border-2 border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase">
                            Admin Assigned Emergency
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(app.appointment_timestamp).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{app.patient_name}</h4>
                        {app.reason && (
                          <p className="text-xs text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-medium">
                            Clinical Reason / Urgency: "{app.reason}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {app.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                          >
                            <CheckCircle className="h-4 w-4" /> Mark Consultation Completed
                          </button>
                        )}
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY PATIENT ROSTER (STRICTLY RESTRICTED TO THIS DOCTOR'S PATIENTS) */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">My Patient Roster</h2>
                <p className="text-xs text-slate-500 mt-1">
                  List of patients who have booked or been assigned an appointment with {doctorName}. Unrelated hospital patients are excluded.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Patient Name</th>
                        <th className="py-3 px-4">Contact Phone</th>
                        <th className="py-3 px-4">Latest Consultation</th>
                        <th className="py-3 px-4">Reason / Notes</th>
                        <th className="py-3 px-4">Total Consults</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {myDoctorPatientsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            No patient records found who have booked an appointment with {doctorName}.
                          </td>
                        </tr>
                      ) : (
                        myDoctorPatientsList.map((pat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{pat.full_name}</td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs flex items-center gap-1 mt-1">
                              <Phone className="h-3.5 w-3.5 text-slate-400" /> {pat.phone}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs">
                              {new Date(pat.latest_appointment).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs truncate max-w-xs">
                              {pat.latest_reason}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-bold text-sky-700">
                              {pat.total_appointments} Appointment(s)
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

          {/* TAB 4: MANAGE AVAILABILITY SCHEDULE */}
          {activeTab === 'availability' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Configure Consultation Hours</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-lg">
                <form onSubmit={handleSetAvailability} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Day of Week</label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value={0}>Monday</option>
                      <option value={1}>Tuesday</option>
                      <option value={2}>Wednesday</option>
                      <option value={3}>Thursday</option>
                      <option value={4}>Friday</option>
                      <option value={5}>Saturday</option>
                      <option value={6}>Sunday</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Save Availability Schedule
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
