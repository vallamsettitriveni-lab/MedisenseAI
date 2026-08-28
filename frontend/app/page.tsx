'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, Shield, Stethoscope, User, Lock, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header Navigation */}
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 text-white rounded-xl shadow-md">
              <Activity className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">MediSense AI</span>
          </div>

          {/* Dedicated Portal Links */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
            <Link
              href="/patient/login"
              className="px-3 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition"
            >
              Patient Portal
            </Link>
            <Link
              href="/doctor/login"
              className="px-3 py-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition"
            >
              Doctor Portal
            </Link>
            <Link
              href="/admin/login"
              className="px-3 py-1.5 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" /> Non-Diagnostic Educational Decision-Support Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            AI-Powered Medical Report Interpreter & Clinic Management
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Automated PDF parsing, deterministic lab reference-range checks, longitudinal trend analytics, and role-protected appointment management.
          </p>

          {/* Protected Portal Access Cards with Separate Patient/Doctor/Admin Flows */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Patient Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-left flex flex-col justify-between">
              <div>
                <div className="p-3 bg-teal-100 text-teal-800 rounded-xl w-fit mb-4">
                  <User className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Patient Portal</h3>
                <p className="text-slate-600 mt-2 text-sm">
                  Upload PDF lab reports, view deterministic status evaluations, track longitudinal trends, and request appointments.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                <Link
                  href="/patient/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition w-full justify-center"
                >
                  <Lock className="h-3.5 w-3.5" /> Patient Log In
                </Link>
                <Link
                  href="/patient/register"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs rounded-xl transition w-full justify-center"
                >
                  New Patient Register
                </Link>
              </div>
            </div>

            {/* Doctor Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-left flex flex-col justify-between">
              <div>
                <div className="p-3 bg-sky-100 text-sky-800 rounded-xl w-fit mb-4">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Doctor Portal</h3>
                <p className="text-slate-600 mt-2 text-sm">
                  Review patient lab trends, inspect original PDF reports, configure consultation availability, and handle requests.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                <Link
                  href="/doctor/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-sm transition w-full justify-center"
                >
                  <Lock className="h-3.5 w-3.5" /> Doctor Log In
                </Link>
                <Link
                  href="/doctor/register"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold text-xs rounded-xl transition w-full justify-center"
                >
                  Doctor Registration
                </Link>
              </div>
            </div>

            {/* Admin Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-left flex flex-col justify-between">
              <div>
                <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl w-fit mb-4">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Admin Command Center</h3>
                <p className="text-slate-600 mt-2 text-sm">
                  Restricted Administrator portal for doctor verification, RAG knowledge ingestion, and security audit logs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-900 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition w-full justify-center"
                >
                  <Lock className="h-3.5 w-3.5" /> Admin Direct Log In
                </Link>
                <p className="text-[11px] text-slate-400 text-center py-1">
                  Super Admin credentials required
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8 px-6 text-center text-sm text-slate-500">
        <p>© 2026 MediSense AI. Built for Educational & Clinical Decision Support. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
