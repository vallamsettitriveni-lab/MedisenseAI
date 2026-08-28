'use client';

import React from 'react';
import Link from 'next/link';
import { User, Stethoscope, ArrowRight, Activity, Shield } from 'lucide-react';

export default function LoginChoicePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-8 text-center">
        
        <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl w-fit mx-auto mb-4">
          <Activity className="h-7 w-7" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900">Sign In to Your Account</h2>
        <p className="text-slate-500 text-sm mt-1 mb-8">
          Please select your portal to continue
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          
          {/* Patient Card */}
          <Link
            href="/patient/login"
            className="p-6 rounded-2xl border-2 border-teal-200 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-500 transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 bg-teal-600 text-white rounded-xl w-fit mb-3">
                <User className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Patient</h3>
              <p className="text-xs text-slate-600 mt-1">
                Access your blood test reports, AI analyses, and appointments.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-teal-700 font-bold text-xs group-hover:gap-2 transition-all">
              Sign In as Patient <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          {/* Doctor Card */}
          <Link
            href="/doctor/login"
            className="p-6 rounded-2xl border-2 border-sky-200 bg-sky-50/40 hover:bg-sky-50 hover:border-sky-500 transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 bg-sky-700 text-white rounded-xl w-fit mb-3">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Doctor</h3>
              <p className="text-xs text-slate-600 mt-1">
                Access clinical workspace, patient roster, and schedules.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sky-700 font-bold text-xs group-hover:gap-2 transition-all">
              Sign In as Doctor <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/patient/register" className="text-teal-700 font-semibold hover:underline">
            Register as Patient
          </Link>
          <Link href="/doctor/register" className="text-sky-700 font-semibold hover:underline">
            Register as Doctor
          </Link>
          <Link href="/admin/login" className="text-indigo-700 font-semibold hover:underline">
            Admin Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
