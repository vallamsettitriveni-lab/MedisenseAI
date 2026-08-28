'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@medisense.com');
  const [password, setPassword] = useState('AdminPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot / Reset Password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('admin@medisense.com');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Extra frontend check: only admin@medisense.com or admin@mediinterpret.com is accepted
    if (email.toLowerCase() !== 'admin@medisense.com' && email.toLowerCase() !== 'admin@mediinterpret.com') {
      setError('Invalid Admin credentials. Access restricted to authorized system administrator.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
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
        setError('Unable to connect to backend server. Please check connection.');
      } else {
        setError(err.message || 'Admin authentication failed. Please check your password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
          new_password: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update password.');
      }

      setResetSuccess('Admin password updated successfully!');
      setPassword(resetNewPassword);
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess('');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Could not reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 relative">
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
                placeholder="admin@medisense.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Admin Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetError('');
                  setResetSuccess('');
                  setShowResetModal(true);
                }}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Reset Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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

      {/* Reset Admin Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-indigo-800/60 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset Admin Password</h3>
                <p className="text-xs text-slate-400">Set a new password for your admin account</p>
              </div>
            </div>

            {resetError && (
              <div className="mb-3 p-3 bg-rose-950/80 text-rose-200 text-xs rounded-xl border border-rose-800/50">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-3 p-3 bg-emerald-950/80 text-emerald-200 text-xs rounded-xl border border-emerald-800/50 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@medisense.com"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  New Admin Password (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new admin password"
                    className="w-full px-3.5 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-200"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  {resetLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
