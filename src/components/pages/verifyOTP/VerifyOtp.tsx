import React from 'react';
import { MdDialpad } from 'react-icons/md';
import styles from './VerifyOtp.module.css';

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
    <form onSubmit={onVerifyOtp} className={styles.form}>
      <div className={styles['form-group']}>
        <label className={styles['form-label']}>Enter 6-Digit OTP</label>
        <div className={styles['input-wrapper']}>
          <span className={styles['input-icon']}><MdDialpad size={18} /></span>
          <input
            type="text"
            className={`${styles['input-field']} ${styles['otp-input']}`}
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            required
          />
        </div>
        <p className={styles['info-text']}>OTP sent to {email}</p>
      </div>

      <button type="submit" className={styles['login-btn']} disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify'}
      </button>

      <button type="button" className={styles['resend-btn']} onClick={onResend} disabled={isLoading}>
        Resend OTP
      </button>
    </form>
  );
}
