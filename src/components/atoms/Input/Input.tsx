import React, { type InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
    return (
        <input
            className={`${styles.input} ${error ? styles.error : ''} ${className}`}
            {...props}
        />
    );
};
