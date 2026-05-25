import React from 'react';
import { FiMail } from 'react-icons/fi';
import '../login/login.css'

interface Props {
  email: string;
  setEmail: (v: string) => void;
  onSendOtp: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

export default function SendEmail({ email, setEmail, onSendOtp, isLoading }: Props) {
  return (
    <form onSubmit={onSendOtp} className='form'>
      <div className='form-group'>
        <label className='form-label'>Email Address</label>
        <div className='input-wrapper'>
          <span className='input-icon'><FiMail size={18} /></span>
          <input
            type="email"
            className='input-field'
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" className='login-btn' disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send OTP'}
      </button>
    </form>
  );
}
