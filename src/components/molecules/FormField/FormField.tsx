import React from 'react';
import { Label } from '../../atoms/Label/Label';
import { Input } from '../../atoms/Input/Input';
import styles from './FormField.module.css';

interface FormFieldProps extends Omit<React.ComponentProps<typeof Input>, 'error'> {
    label: string;
    error?: string;
    required?: boolean;
    rightElement?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    error,
    required,
    rightElement,
    id,
    className = '',
    ...props
}) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className={`${styles.formField} ${className}`}>
            <Label htmlFor={inputId} required={required}>{label}</Label>
            <div className={styles.inputWrapper}>
                <Input
                    id={inputId}
                    error={!!error}
                    className={rightElement ? styles.inputWithElement : ''}
                    {...props}
                />
                {rightElement && (
                    <div className={styles.rightElement}>
                        {rightElement}
                    </div>
                )}
            </div>
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
};
