import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SendEmail from '../sendEmail/SendEmail.tsx';
import VerifyOtp from '../verifyOTP/VerifyOtp.tsx';
import ResetPassword from '../resetPassword/ResetPassword.tsx';
import { postSendEmail } from '../../../api/sendEmail/SendEmail.api';
import { postVerifyOTP } from '../../../api/verifyOTP/VerifyOTP.api';
import { postResetPassword } from '../../../api/resetPassword/ResetPassword.api';
import '../login/login.css'
import logo from '../../../assets/logo.png';

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);



  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await postSendEmail({ email });
      setSuccess(response.data.message);
      setStep('otp');
    } catch (err: any) {
      console.error('Send OTP Error:', err);

      if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please check if the backend server is running.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Please ensure the backend is running on http://localhost:8089');
      } else if (err.response) {
        // Server responded with error
        const errorMessage = err.response.data?.statusMessage
          || err.response.data?.message
          || `Server error: ${err.response.status}`;
        setError(errorMessage);
      } else {
        setError('Failed to send OTP. Please ensure the backend server is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await postVerifyOTP({ email, otp });
      setSuccess(response.statusMessage);
      setStep('reset');
    } catch (err: any) {
      console.error('Verify OTP Error:', err);

      if (err.response) {
        const errorMessage = err.response.data?.statusMessage
          || err.response.data?.message
          || 'Invalid OTP. Please try again.';
        setError(errorMessage);
      } else {
        setError('Failed to verify OTP. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');

    setIsLoading(true);
    try {
      const response = await postSendEmail({ email });
      setSuccess(response.data.message);
    } catch (err: any) {
      console.error('Resend OTP Error:', err);

      if (err.response) {
        const errorMessage = err.response.data?.statusMessage
          || err.response.data?.message
          || 'Failed to resend OTP. Please try again.';
        setError(errorMessage);
      } else {
        setError('Failed to resend OTP. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await postResetPassword({
        email,
        newPassword,
        confirmPassword,
      });
      setSuccess(response.statusMessage || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      console.error('Reset Password Error:', err);

      if (err.response) {
        const errorMessage = err.response.data?.statusMessage
          || err.response.data?.message
          || 'Failed to reset password. Please try again.';
        setError(errorMessage);
      } else {
        setError('Failed to reset password. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className='login-card'>
        <div className='logo-section'>
          <div className="logo">
            <img src={logo} alt="Mr. PHO" style={{ width: '100px', height: '250px', objectFit: 'contain' }} />
          </div>

          {step === 'email' && (
            <>
              <h1 className='title'>Enter Your Registered Email</h1>
              <p className='subtitle'>We'll send you a verification code</p>
            </>
          )}

          {step === 'otp' && (
            <>
              <p className='subtitle'>Enter the 6-digit code sent to your email</p>
            </>
          )}

          {step === 'reset' && (
            <>
              <h1 className='title'>Reset Password</h1>
              <p className='subtitle'>Create a new secure password</p>
            </>
          )}
        </div>

        {/* Error/Success */}
        {error && <div className='error-message'>{error}</div>}
        {success && <div className='success-message'>{success}</div>}

        {/* Steps */}
        {step === 'email' && (
          <SendEmail
            email={email}
            setEmail={setEmail}
            onSendOtp={handleSendOtp}
            isLoading={isLoading}
          />
        )}

        {step === 'otp' && (
          <VerifyOtp
            email={email}
            otp={otp}
            setOtp={setOtp}
            onVerifyOtp={handleVerifyOtp}
            onResend={handleResendOtp}
            isLoading={isLoading}
          />
        )}

        {step === 'reset' && (
          <ResetPassword
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={() => setShowNewPassword(prev => !prev)}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={() => setShowConfirmPassword(prev => !prev)}
            onResetPassword={handleResetPassword}
            isLoading={isLoading}
          />
        )}

        <div className='back-to-login'>
          <Link to="/" className='back-link'>
            ← Back to Login
          </Link>
        </div>

        <div className='footer'>
          <p className='footer-text'>
            Powered by <span className='footer-highlight'>Mr.PHO</span>
          </p>
        </div>
      </div>
    </div>
  );
}
