import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../../atoms/Button/Button';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onClose: () => void;
    onConfirm?: () => Promise<void> | void;
    showSuccess?: boolean; // when true, modal shows success state
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title = 'Confirm',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onClose,
    onConfirm,
    showSuccess = false,
}) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setLoading(false);
            setSuccess(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!onConfirm) return;
        try {
            setLoading(true);
            await onConfirm();
            setLoading(false);
            setSuccess(true);
        } catch (err) {
            setLoading(false);
            // keep modal open on error; calling component can handle errors
        }
    };

    // If parent wants to show success explicitly, keep that in sync
    useEffect(() => {
        if (showSuccess) setSuccess(true);
    }, [showSuccess]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div style={{ minHeight: 80 }}>
                {!success && onConfirm ? (
                    <>
                        <p>{message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                            <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
                            <Button onClick={handleConfirm} disabled={loading}>{loading ? 'Please wait...' : confirmText}</Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p style={{ whiteSpace: 'pre-line', textAlign: 'center', fontSize: '1rem' }}>{message || (success ? 'Success' : '')}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                            <Button onClick={onClose}>OK</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ConfirmModal;
