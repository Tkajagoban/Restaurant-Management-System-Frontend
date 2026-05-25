import { useState, useEffect } from 'react';
import { Button } from '../../atoms/Button/Button';
import { Pagination } from '../../molecules/Pagination/Pagination';
import { FormField } from '../../molecules/FormField/FormField';
import { DataTable, type Column } from '../../organisms/DataTable/DataTable';
import { Modal } from '../../organisms/Modal/Modal';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { useAuth } from '../../../contexts/AuthContext';
import { usePrivilege } from '../../../hooks/usePrivilege';
import emailSettingsApi, { type EmailSettingsRequest } from '../../../api/emailSettings/EmailSetting.api';
import styles from './EmailSettings.module.css';

interface AxiosError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

interface EmailConfig {
  id: string;
  displayName: string;
  sentEmail: string;
  hostName: string;
  port: string;
  protocol: string;
  password: string;
  ccEnabled: boolean;
  ccEmails: string;
}

interface EmailSettingResponse {
  id: string;
  displayName: string;
  sentEmail: string;
  hostName: string;
  port: number;
  protocol: string;
  ccMailAddress: string;
}

const initialEmailConfigs: EmailConfig[] = [];

const ITEMS_PER_PAGE = 5;

function EmailSettings() {
  const { isAuthenticated } = useAuth();
  const { canWrite, canMaintain } = usePrivilege('Email Settings');
  const [showPassword, setShowPassword] = useState(false);
  const [configs, setConfigs] = useState<EmailConfig[]>(initialEmailConfigs);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: '', sentEmail: '', hostName: '', port: '587', protocol: 'SMTP', password: '', ccEnabled: false, ccEmails: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
  const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');

  // Load email settings from API on mount
  useEffect(() => {
    if (!isAuthenticated) {
      console.warn('User is not authenticated. Please log in first.');
      return;
    }

    const loadEmailSettings = async () => {
      setIsLoading(true);
      try {
        const response = await emailSettingsApi.getAllEmailSettings();
        console.log('API Response:', response);

        // Handle both array and object responses
        let settingsArray: EmailSettingResponse[] = [];
        if (Array.isArray(response)) {
          settingsArray = response as EmailSettingResponse[];
        } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as { data: EmailSettingResponse[] }).data)) {
          settingsArray = (response as { data: EmailSettingResponse[] }).data;
        } else {
          console.error('Unexpected response format:', response);
        }

        const mappedConfigs: EmailConfig[] = settingsArray.map(setting => ({
          id: setting.id,
          displayName: setting.displayName,
          sentEmail: setting.sentEmail,
          hostName: setting.hostName,
          port: (setting.port || '').toString(),
          protocol: setting.protocol,
          password: '',
          ccEnabled: !!setting.ccMailAddress,
          ccEmails: setting.ccMailAddress,
        }));
        setConfigs(mappedConfigs);
      } catch (error) {
        console.error('Failed to load email settings:', error);
        // Do not use mock data if API fails
      } finally {
        setIsLoading(false);
      }
    };

    loadEmailSettings();
  }, [isAuthenticated]);

  const totalPages = Math.ceil(configs.length / ITEMS_PER_PAGE);
  const paginatedData = configs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) newErrors.displayName = 'Display Name is required';
    if (!formData.sentEmail.trim()) newErrors.sentEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.sentEmail)) newErrors.sentEmail = 'Invalid email format';
    if (!formData.hostName.trim()) newErrors.hostName = 'Host Name is required';
    if (!formData.port.trim()) newErrors.port = 'Port is required';
    else if (!/^\d+$/.test(formData.port)) newErrors.port = 'Port must be numeric';
    if (!formData.protocol) newErrors.protocol = 'Protocol is required';
    if (!editingId && !formData.password.trim()) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!isAuthenticated) {
      setConfirmTitle('Error');
      setConfirmMessage('You must be logged in to save email settings');
      setConfirmShowSuccess(false);
      setConfirmOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      // Prepare API request body
      const apiData: EmailSettingsRequest = {
        displayName: formData.displayName,
        sentEmail: formData.sentEmail,
        hostName: formData.hostName,
        port: parseInt(formData.port),
        protocol: formData.protocol.toLowerCase(),
        password: formData.password,
        ccMailAddress: formData.ccEnabled ? formData.ccEmails : '',
      };

      if (editingId) {
        // Update existing email settings
        const updated = await emailSettingsApi.updateEmailSettings(editingId, apiData);
        setConfigs(prev => prev.map(c => c.id === editingId
          ? {
            id: c.id,
            displayName: updated.displayName,
            sentEmail: updated.sentEmail,
            hostName: updated.hostName,
            port: (updated.port || '').toString(),
            protocol: updated.protocol,
            password: '',
            ccEnabled: !!updated.ccMailAddress,
            ccEmails: updated.ccMailAddress,
          }
          : c
        ));
      } else {
        // Create new email settings
        const created = await emailSettingsApi.createEmailSettings(apiData);
        const newConfig: EmailConfig = {
          id: created.id,
          displayName: created.displayName,
          sentEmail: created.sentEmail,
          hostName: created.hostName,
          port: (created.port || '').toString(),
          protocol: created.protocol,
          password: '',
          ccEnabled: !!created.ccMailAddress,
          ccEmails: created.ccMailAddress,
        };
        setConfigs(prev => [newConfig, ...prev]);
      }

      closeModal();

      // show consistent success popup
      setConfirmTitle('Success');
      setConfirmMessage(editingId ? 'Updated successfully' : 'Created successfully');
      setConfirmShowSuccess(true);
    } catch (error: unknown) {
      let errorMessage = 'Failed to save email settings. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosErr = error as AxiosError;
        if (axiosErr.response?.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else {
          errorMessage = axiosErr.response?.data?.message || errorMessage;
        }
      }
      console.error('Failed to save email settings:', error);
      setConfirmTitle('Error');
      setConfirmMessage(errorMessage);
      setConfirmShowSuccess(false);
      setConfirmOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ displayName: '', sentEmail: '', hostName: '', port: '587', protocol: 'SMTP', password: '', ccEnabled: false, ccEmails: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (config: EmailConfig) => {
    setEditingId(config.id);
    setFormData({
      displayName: config.displayName, sentEmail: config.sentEmail, hostName: config.hostName,
      port: config.port, protocol: config.protocol, password: '', ccEnabled: config.ccEnabled, ccEmails: config.ccEmails
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    // open confirm modal
    setConfirmTitle('Confirm Delete');
    setConfirmMessage('Are you sure you want to delete this email configuration?');
    setConfirmConfirmText('Delete');
    setConfirmShowSuccess(false);
    setConfirmAction(() => async () => {
      if (!isAuthenticated) {
        setConfirmTitle('Error');
        setConfirmMessage('You must be logged in to delete email settings');
        setConfirmShowSuccess(false);
        setConfirmOpen(true);
        return;
      }

      setIsLoading(true);
      try {
        await emailSettingsApi.deleteEmailSettings(id);
        setConfigs(prev => prev.filter(c => c.id !== id));

        setConfirmMessage('Deleted successfully');
        setConfirmTitle('Success');
        setConfirmShowSuccess(true);
      } catch (error: unknown) {
        let errorMessage = 'Failed to delete email settings. Please try again.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'response' in error) {
          const axiosErr = error as AxiosError;
          if (axiosErr.response?.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
          } else {
            errorMessage = axiosErr.response?.data?.message || errorMessage;
          }
        }
        console.error('Failed to delete email settings:', error);
        setConfirmTitle('Error');
        setConfirmMessage(errorMessage);
        setConfirmShowSuccess(false);
        setConfirmOpen(true);
      } finally {
        setIsLoading(false);
      }
    });

    setConfirmOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const columns: Column<EmailConfig>[] = [
    { header: 'Display Name', accessor: 'displayName' },
    { header: 'Sent Email', accessor: 'sentEmail' },
    { header: 'Host Name', accessor: 'hostName' },
    { header: 'Port', accessor: 'port' },
    { header: 'Protocol', accessor: 'protocol' },
    {
      header: 'Actions', accessor: (c) => (
        <div className={styles.actions}>
          <button className={styles.actionBtn} title="Edit" onClick={() => openEditModal(c)} disabled={!canWrite} style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}><FiEdit size={20} aria-hidden="true" /></button>
          <button className={styles.actionBtn} title="Delete" onClick={() => handleDelete(c.id)} disabled={!canMaintain} style={{ opacity: !canMaintain ? 0.5 : 1, pointerEvents: !canMaintain ? 'none' : 'auto' }}><MdDelete size={20} aria-hidden="true" /></button>
        </div>
      )
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Email Settings</h1>
        <Button
          onClick={openAddModal}
          disabled={isLoading || configs.length >= 1 || !canWrite}
          title={configs.length >= 1 ? "Only one email configuration is allowed" : ""}
          style={{ opacity: (isLoading || configs.length >= 1 || !canWrite) ? 0.5 : 1, pointerEvents: (isLoading || configs.length >= 1 || !canWrite) ? 'none' : 'auto' }}
        >
          + Add Email Settings
        </Button>
      </div>


      <DataTable columns={columns} data={paginatedData} keyExtractor={(c) => c.id} />
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Email Settings' : 'Add Email Settings'}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField label="Display Name" name="displayName" required value={formData.displayName} onChange={(e) => setFormData(p => ({ ...p, displayName: e.target.value }))} error={errors.displayName} />
          <FormField label="Sent Email" name="sentEmail" type="email" required value={formData.sentEmail} onChange={(e) => setFormData(p => ({ ...p, sentEmail: e.target.value }))} error={errors.sentEmail} />

          <div className={styles.formRow}>
            <FormField label="Host Name" name="hostName" required value={formData.hostName} onChange={(e) => setFormData(p => ({ ...p, hostName: e.target.value }))} error={errors.hostName} />
            <FormField label="Port" name="port" required value={formData.port} onChange={(e) => setFormData(p => ({ ...p, port: e.target.value }))} error={errors.port} disabled={true} />
          </div>

          <div className={styles.formRow}>
            <FormField label="Protocol" name="protocol" value="SMTP" disabled={true} />
            <FormField
              label="Email Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required={!editingId}
              value={formData.password}
              onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
              error={errors.password}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    color: '#6b7280'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              }
            />

          </div>

          <div className={styles.ccToggle}>
            <input type="checkbox" id="ccEnabled" checked={formData.ccEnabled} onChange={(e) => setFormData(p => ({ ...p, ccEnabled: e.target.checked }))} />
            <label htmlFor="ccEnabled">Enable Carbon Copy (CC)</label>
          </div>

          {formData.ccEnabled && (
            <FormField label="CC Email Addresses" name="ccEmails" placeholder="Enter CC emails, comma separated" value={formData.ccEmails} onChange={(e) => setFormData(p => ({ ...p, ccEmails: e.target.value }))} />
          )}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : (editingId ? 'Update' : 'Save')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmShowSuccess(false); }}
        title={confirmTitle}
        message={confirmMessage}
        showSuccess={confirmShowSuccess}
        confirmText={confirmConfirmText}
        onConfirm={confirmAction}
      />
    </div>
  );
}

export default EmailSettings;
