'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope, Lock, Mail, ArrowRight, User } from 'lucide-react';

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const extractLastName = (fullName?: string, rawEmail?: string): string => {
    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && last.length > 0) return last.charAt(0).toUpperCase() + last.slice(1);
    }
    if (rawEmail && rawEmail.includes('@')) {
      const username = rawEmail.split('@')[0];
      const parts = username.split(/[._\-+]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart) return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
    }
    return 'Doctor';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Incorrect email or password. Please try again.');
      }

      if (data.role !== 'DOCTOR' && data.role !== 'ADMIN') {
        throw new Error('This account is not registered as a Doctor. Please use the Patient login page.');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      if (data.full_name) {
        localStorage.setItem('doctor_name', data.full_name);
      }

      const lastName = extractLastName(data.full_name, email);
      localStorage.setItem('user_last_name', lastName);

      router.push('/doctor');
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        setError('Unable to connect to backend server. Please check your connection.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8">

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-sky-700 text-white rounded-2xl shadow-sm">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome Doctor</h2>
            <p className="text-slate-500 text-sm">Sign in to your clinical workspace</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Doctor Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@mediinterpret.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {loading ? 'Signing in...' : 'Sign In as Doctor'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm">
          <span className="text-slate-500">New doctor? </span>
          <Link href="/doctor/register" className="text-sky-700 font-bold hover:underline">
            Doctor Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
