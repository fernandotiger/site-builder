import { useEffect, useState} from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [status, setStatus] = useState<Status>('loading');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    authClient.verifyEmail({query: { token }})
        .then((res) => {
            if (res.error) {
                setStatus('error');
                setMessage(res.error.message || 'Email verification failed. Please try again.');
            } else {
                setStatus('success');
                setTimeout(() => { navigate('/auth/signin');}, 3000);
            }
        })
        .catch((err) => {
            setStatus('error');
            setMessage(err.message || 'An unexpected error occurred. Please try again.');
        });
    }, []);

    return (
        <div className="max-w-md mx-auto mt-24 text-center px-4">
            {status === 'loading' && (
                <>
                    <div className="text-5xl mb-6 animate-spin">⏳</div>
                    <p className="text-gray-500">Please wait while we verify your email address.</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <div className="text-5xl mb-6">✅</div>
                    <h1 className="text-2xl font-bold mb-2 text-gray-900">Email Verified Successfully!</h1>
                    <p className="text-gray-500">You will be redirected to the login page shortly.</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <div className="text-5xl mb-6">❌</div>
                    <h1 className="text-2xl font-bold mb-6">Verification Failed: {message}</h1>
                    <a href="/auth/sign-up" className="text-blue-500 hover:underline">Go back to Sign Up</a>
                </>
            )}
            </div>
    );
}