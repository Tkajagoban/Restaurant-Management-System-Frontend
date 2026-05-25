import React from 'react';
import { FiLock } from 'react-icons/fi';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import styles from './ResetPassword.module.css';

interface Props {
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: () => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: () => void;
  onResetPassword: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

export default function ResetPassword({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onResetPassword,
  isLoading = false,
}: Props) {
  return (
    <form onSubmit={onResetPassword} className={styles.form}>
      <div className={styles['form-group']}>
        <label className={styles['form-label']}>New Password</label>
        <div className={styles['input-wrapper']}>
          <span className={styles['input-icon']}><FiLock size={18} /></span>
          <input
            type={showNewPassword ? 'text' : 'password'}
            className={`${styles['input-field']} ${styles['password-input']}`}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <button
            type="button"
            className={styles['password-toggle']}
            onClick={setShowNewPassword}
            disabled={isLoading}
          >
            {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
          </button>
        </div>
      </div>

      <div className={styles['form-group']}>
        <label className={styles['form-label']}>Confirm Password</label>
        <div className={styles['input-wrapper']}>
          <span className={styles['input-icon']}><FiLock size={18} /></span>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            className={`${styles['input-field']} ${styles['password-input']}`}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <button
            type="button"
            className={styles['password-toggle']}
            onClick={setShowConfirmPassword}
            disabled={isLoading}
          >
            {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className={styles['login-btn']}
        disabled={isLoading}
      >
        {isLoading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
