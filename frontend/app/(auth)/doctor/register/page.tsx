'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope, Lock, Mail, Phone, Award, ArrowRight, Eye, EyeOff, CheckCircle2, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function DoctorRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [specialization, setSpecialization] = useState('General Medicine');
  const [qualification, setQualification] = useState('MBBS, MD');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role: 'DOCTOR',
          full_name: fullName.startsWith('Dr.') ? fullName.trim() : `Dr. ${fullName.trim()}`,
          phone: phone.trim() || undefined,
          specialization: specialization.trim(),
          qualification: qualification.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed.');
      }

      // Registration successful and pending admin approval
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl w-fit mx-auto">
            <Clock className="h-10 w-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Registration Submitted!</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your medical specialist profile has been created and is currently <strong className="text-amber-700">pending Super Admin approval</strong>.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 text-left space-y-1.5">
            <div className="font-semibold text-slate-700">Doctor Profile Summary:</div>
            <div><strong>Name:</strong> {fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`}</div>
            <div><strong>Specialization:</strong> {specialization}</div>
            <div><strong>Status:</strong> Pending Admin Verification</div>
          </div>
          <p className="text-xs text-slate-500">
            Once the Administrator approves your account from the Admin Command Center, you can sign in directly.
          </p>
          <div className="pt-2">
            <Link
              href="/doctor/login"
              className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              Go to Doctor Login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-sky-700 text-white rounded-2xl shadow-sm">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Doctor Registration</h2>
            <p className="text-slate-500 text-sm">Join our medical specialist panel</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Doctor Full Name (e.g. Dr. Robert Chen)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Robert Chen"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 text-sm"
            />
          </div>

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
                placeholder="doctor@hospital.org"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password (Min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Specialization
              </label>
              <input
                type="text"
                required
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Cardiology"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Qualification
              </label>
              <input
                type="text"
                required
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="MBBS, MD"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {loading ? 'Submitting Registration...' : 'Complete Doctor Registration'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm">
          <span className="text-slate-500">Already registered? </span>
          <Link href="/doctor/login" className="text-sky-700 font-bold hover:underline">
            Doctor Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
