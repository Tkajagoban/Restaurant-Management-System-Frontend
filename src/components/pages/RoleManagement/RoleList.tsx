import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../components/atoms/Button/Button';
import { SearchBar } from '../../../components/molecules/SearchBar/SearchBar';
import { Pagination } from '../../../components/molecules/Pagination/Pagination';
import { FormField } from '../../../components/molecules/FormField/FormField';
import { DataTable, type Column } from '../../../components/organisms/DataTable/DataTable';
import { Modal } from '../../../components/organisms/Modal/Modal';
import styles from './RoleList.module.css';
import { getAllRoles, addRole, updateRole, deleteRole, type Role } from '../../../api/roleManagement/RoleManagement.api';
import ConfirmModal from '../../../components/organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import { usePrivilege } from '../../../hooks/usePrivilege';

const ITEMS_PER_PAGE = 5;

export const RoleList: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ roleName: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { canWrite, canMaintain } = usePrivilege('Role Management');
    const restaurantId = '1';

    // confirm modal state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
    const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');

    // Fetch roles on component mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
            if (!token) {
                setError('No authentication token. Please log in.');
                setLoading(false);
                return;
            }

            const response = await getAllRoles(restaurantId);
            console.log('Roles fetched:', response);

            if (response && Array.isArray(response.data)) {
                setRoles(response.data);
            } else if (response && response.data && Array.isArray(response.data)) {
                setRoles(response.data);
            } else if (Array.isArray(response)) {
                setRoles(response);
            } else {
                setError('Unexpected data format');
            }
        } catch (err: any) {
            console.error('Error fetching roles:', err);
            if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('accessToken');
            } else {
                setError(err.message || 'Failed to fetch roles');
            }
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (error: any): string => {
        // Extract error message from backend response
        if (error.response?.data?.data && Array.isArray(error.response.data.data)) {
            const messages = error.response.data.data
                .map((err: any) => err.message)
                .filter(Boolean)
                .join(', ');
            if (messages) return messages;
        }
        // Fallback to status message
        if (error.response?.data?.statusMessage) {
            return error.response.data.statusMessage;
        }
        // Fallback to generic message
        return 'Operation failed';
    };

    const handleAddRole = async () => {
        try {
            setIsSubmitting(true);

            const response = await addRole({ roleName: formData.roleName }, restaurantId);
            console.log('Role added:', response);

            // success popup
            closeModal();
            setConfirmTitle('Success');
            setConfirmMessage('Created successfully');
            setConfirmShowSuccess(true);
            setConfirmOpen(true);

            // Immediately add to local state for quick UI update
            if (response && response.data) {
                setRoles(prev => [response.data, ...prev]);
            }
        } catch (error: any) {
            console.error('Error adding role:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = getErrorMessage(error);
            setErrors(prev => ({ ...prev, roleName: errorMsg }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRole = async () => {
        try {
            if (!editingId) return;
            setIsSubmitting(true);

            const response = await updateRole(editingId, { roleName: formData.roleName, restaurantId });
            console.log('Role updated:', response);

            // Update local state immediately for quick UI update
            setRoles(prev => prev.map(role => role.id === parseInt(editingId) ? response.data : role));

            closeModal();

            // success popup
            setConfirmTitle('Success');
            setConfirmMessage('Updated successfully');
            setConfirmShowSuccess(true);
            setConfirmOpen(true);
        } catch (error: any) {
            console.error('Error updating role:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = getErrorMessage(error);
            setErrors(prev => ({ ...prev, roleName: errorMsg }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRole = async (id: number) => {
        // open confirm modal
        setConfirmTitle('Confirm Delete');
        setConfirmMessage('Are you sure you want to delete this role?');
        setConfirmConfirmText('Delete');
        setConfirmShowSuccess(false);
        setConfirmAction(() => async () => {
            try {
                await deleteRole(String(id));
                console.log('Role deleted:', id);

                // Remove from local state immediately for quick UI update
                setRoles(prev => prev.filter(role => role.id !== id));

                setConfirmTitle('Success');
                setConfirmMessage('Deleted successfully');
                setConfirmShowSuccess(true);
            } catch (error: any) {
                console.error('Error deleting role:', error);
                console.error('Error response:', error.response?.data);
                const errorMsg = getErrorMessage(error);
                setError(errorMsg);

                setConfirmTitle('Error');
                setConfirmMessage(errorMsg);
                setConfirmShowSuccess(false);
                setConfirmOpen(true);
            }
        });

        setConfirmOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        if (editingId) {
            handleUpdateRole();
        } else {
            handleAddRole();
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.roleName.trim()) newErrors.roleName = 'Role Name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ roleName: '' });
        setErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (role: Role) => {
        setEditingId(String(role.id));
        setFormData({ roleName: role.roleName });
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ roleName: '' });
        setErrors({});
    };

    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return roles.filter(r => r.roleName.toLowerCase().includes(query));
    }, [roles, searchQuery]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const columns: Column<Role>[] = [
        { header: 'Role', accessor: (r) => <span className={styles.name}>{r.roleName}</span> },
        // {
        //     header: 'Privileges',
        //     accessor: (row: Role) => (
        //         <div className={styles.privilegesContainer}>
        //             {row.rolePrivileges && Object.entries(row.rolePrivileges).length > 0 ? (
        //                 Object.entries(row.rolePrivileges)
        //                     .filter(([_, value]) => value === 1)
        //                     .map(([key]) => (
        //                         <span key={key} className={styles.privilegeTag}>
        //                             {key}
        //                         </span>
        //                     ))
        //             ) : (
        //                 <span className={styles.noPrivileges}>No privileges assigned</span>
        //             )}
        //         </div>
        //     ),
        // },
        {
            header: 'Actions', accessor: (r) => (
                <div className={styles.actions}>
                    <button
                        className={styles.actionBtn}
                        title="Edit"
                        onClick={() => openEditModal(r)}
                        disabled={!canWrite}
                        style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}
                    >
                        <FiEdit size={20} aria-hidden="true" />
                    </button>
                    <button
                        className={styles.actionBtn}
                        title="Delete"
                        onClick={() => handleDeleteRole(r.id)}
                        disabled={!canMaintain}
                        style={{ opacity: !canMaintain ? 0.5 : 1, pointerEvents: !canMaintain ? 'none' : 'auto' }}
                    >
                        <MdDelete size={20} aria-hidden="true" />
                    </button>
                </div>
            )
        },

    ];

    return (
        <div className={styles.page}>
            {loading && <div className={styles.loading}>Loading roles...</div>}
            {error && <div className={styles.error}>{error}</div>}
            {!loading && !error && (
                <>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Role Management</h1>
                        <Button onClick={openAddModal} disabled={!canWrite} style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}>+ Add Role</Button>
                    </div>
                    <div className={styles.toolbar}>
                        <SearchBar placeholder="Search by Role Name..." onSearch={(val) => { setSearchQuery(val); setCurrentPage(1); }} />
                    </div>

                    {roles && roles.length > 0 ? (
                        <>
                            <DataTable columns={columns} data={paginatedData} keyExtractor={(r) => String(r.id)} />
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </>
                    ) : (
                        <div className={styles.empty}>
                            <p>No roles found. {' '}
                                <Button onClick={openAddModal} style={{ marginTop: '1rem', opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }} disabled={!canWrite}>Create First Role</Button>
                            </p>
                        </div>
                    )}

                    <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Role' : 'Add New Role'}>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <FormField
                                label="Role Name"
                                name="roleName"
                                required
                                value={formData.roleName}
                                onChange={(e) => setFormData(p => ({ ...p, roleName: e.target.value }))}
                                error={errors.roleName}
                                disabled={isSubmitting}
                            />

                            <div className={styles.formActions}>
                                <Button type="button" variant="secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                                </Button>
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
                </>
            )}
        </div>
    );
};

export default RoleList;
