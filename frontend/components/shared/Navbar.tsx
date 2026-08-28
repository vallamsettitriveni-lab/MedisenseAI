'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Activity, User, Stethoscope, Shield, LogOut } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    setRole(savedRole);
  }, []);

  const handleLogout = () => {
    const currentRole = role;
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_last_name');

    if (currentRole === 'DOCTOR') {
      router.push('/doctor/login');
    } else if (currentRole === 'ADMIN') {
      router.push('/admin/login');
    } else {
      router.push('/patient/login');
    }
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 bg-teal-600 text-white rounded-xl shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">MediSense AI</span>
        </Link>

        {/* Role-Based Nav Links */}
        <div className="flex items-center gap-2">
          {/* Patient link: visible ONLY to PATIENT */}
          {role === 'PATIENT' && (
            <Link
              href="/patient"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                pathname === '/patient'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User className="h-4 w-4" /> Patient Dashboard
            </Link>
          )}

          {/* Doctor link: visible ONLY to DOCTOR */}
          {role === 'DOCTOR' && (
            <Link
              href="/doctor"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                pathname === '/doctor'
                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="h-4 w-4" /> Doctor Workspace
            </Link>
          )}

          {/* Admin link: visible ONLY to ADMIN */}
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                pathname === '/admin'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Shield className="h-4 w-4" /> Admin Center
            </Link>
          )}

          {role ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition ml-2"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/patient/login"
                className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition"
              >
                Patient Log In
              </Link>
              <Link
                href="/doctor/login"
                className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition"
              >
                Doctor Log In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
