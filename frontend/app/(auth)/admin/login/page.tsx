'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@medisense.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Extra frontend check: only admin@medisense.com or admin@mediinterpret.com is accepted
    if (email !== 'admin@medisense.com' && email !== 'admin@mediinterpret.com') {
      setError('Invalid Admin credentials. Access restricted to authorized system administrator.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Admin authentication failed.');
      }

      if (data.role !== 'ADMIN') {
        throw new Error('Access denied. Account is not registered as System Administrator.');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      router.push('/admin');
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        setError('Unable to connect to backend server. Please make sure backend is running on port 8000.');
      } else {
        setError(err.message || 'Admin authentication failed. Please check your password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
      <div className="bg-slate-900 rounded-3xl border border-indigo-900/50 shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Admin Portal</h2>
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mt-0.5">
              System Control & Verification
            </p>
          </div>
        </div>

        <div className="mb-6 p-3 bg-indigo-950/60 border border-indigo-800/40 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>Restricted Portal. Authorized System Admin credentials only.</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/80 text-rose-200 text-xs font-semibold rounded-xl border border-rose-800/50">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mediinterpret.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating Admin...' : 'Authenticate & Access Admin Center'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800 pt-4 text-xs text-slate-500">
          <Link href="/" className="hover:text-indigo-400 transition">
            ← Return to Main Portal Home
          </Link>
        </div>
      </div>
    </div>
  );
}
