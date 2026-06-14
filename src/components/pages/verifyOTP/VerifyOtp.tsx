import React from 'react';
// Uses shared login.css for consistent auth styling; background controlled in Login.tsx
import { MdDialpad } from 'react-icons/md';
import '../login/login.css'

interface Props {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onResend: () => void;
  isLoading?: boolean;
}

export default function VerifyOtp({ email, otp, setOtp, onVerifyOtp, onResend, isLoading }: Props) {
  return (
    <form onSubmit={onVerifyOtp} className={'form'}>
      <div className={'form-group'}>
        <label className={'form-label'}>Enter 6-Digit OTP</label>
        <div className={'input-wrapper'}>
          <span className={'input-icon'}><MdDialpad size={18} /></span>
          <input
            type="text"
            className={`input-field otp-input`}
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            required
          />
        </div>
        <p className={'info-text'}>OTP sent to {email}</p>
      </div>

      <button type="submit" className={'login-btn'} disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify'}
      </button>

      <button type="button" className={'resend-btn'} onClick={onResend} disabled={isLoading}>
        Resend OTP
      </button>
    </form>
  );
}
