'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/auth.store';
import { isValidEmail } from '@/lib/utils';
import { apiClient } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Reset password state (shown after receiving token)
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.email || !formData.password) {
      setValidationError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    try {
      await login(formData.email, formData.password);
      router.push('/dashboard');
    } catch (err) {
      // Error already set in store
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail || !isValidEmail(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await apiClient.forgotPassword(forgotEmail) as any;
      setForgotSuccess(res.message || 'If the email exists, a reset link has been sent.');
      // If the backend returns a resetToken (dev mode), show the reset form
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setShowReset(true);
        setShowForgot(false);
      }
    } catch (e: any) {
      setForgotError(e?.response?.data?.message || 'Failed to process request');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const res = await apiClient.resetPassword(resetToken, newPassword) as any;
      setResetSuccess(res.message || 'Password reset successfully');
      setTimeout(() => {
        setShowReset(false);
        setForgotSuccess('');
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (e: any) {
      setResetError(e?.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">D&apos;Lifestyle</h1>
        <p className="text-center text-gray-600 mb-8">Admin Portal</p>

        {/* Login Form */}
        {!showForgot && !showReset && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || validationError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error || validationError}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(formData.email); setForgotError(''); setForgotSuccess(''); }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {showForgot && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-800">Reset Password</h2>
            <p className="text-sm text-gray-600 text-center">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            {forgotError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                {forgotSuccess}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={forgotLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowForgot(false); setForgotError(''); setForgotSuccess(''); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50"
              >
                Back to Login
              </button>
              <button
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        )}

        {/* Reset Password Form */}
        {showReset && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-800">Set New Password</h2>

            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                {resetSuccess}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setResetError(''); }}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={resetLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setResetError(''); }}
                placeholder="Repeat new password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={resetLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowReset(false); setResetToken(''); setResetError(''); setResetSuccess(''); setShowForgot(true); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Log in with your admin credentials to access the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
