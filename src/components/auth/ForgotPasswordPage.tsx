import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { ArrowLeft, Mail } from 'lucide-react';

const schema = z.object({ email: z.string().email('Invalid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await authApi.resetPassword(data.email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
          {sent ? (
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto text-primary-500 mb-4" />
              <h2 className="text-lg font-semibold mb-2">Check your email</h2>
              <p className="text-gray-600 text-sm">We sent a password reset link to your email address.</p>
              <Link to="/login" className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">Reset your password</h2>
              <p className="text-gray-500 text-sm mb-4">Enter your email and we'll send you a reset link.</p>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-600 text-white py-2 px-4 rounded-xl hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <Link to="/login" className="mt-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
