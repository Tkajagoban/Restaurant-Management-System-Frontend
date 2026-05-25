import React, { type LabelHTMLAttributes, type ReactNode } from 'react';
import styles from './Label.module.css';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
    children: ReactNode;
}

export const Label: React.FC<LabelProps> = ({ required, children, className = '', ...props }) => {
    return (
        <label className={`${styles.label} ${className}`} {...props}>
            {children}
            {required && <span className={styles.required}>*</span>}
        </label>
    );
};
