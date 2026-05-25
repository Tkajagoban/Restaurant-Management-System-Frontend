import React, { useState, useEffect } from 'react';
import { Button } from '../../atoms/Button/Button';
import { Label } from '../../atoms/Label/Label';

import { Pagination } from '../../molecules/Pagination/Pagination';
import { FormField } from '../../molecules/FormField/FormField';
import { DataTable, type Column } from '../../organisms/DataTable/DataTable';
import { Modal } from '../../organisms/Modal/Modal';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import styles from './TaxManagement.module.css';
import { createTax, deleteTax, GetTax, updateTax } from '../../../api/taxManagement/TaxManagement.api';
import { usePrivilege } from '../../../hooks/usePrivilege';


interface Tax {
    id: string;
    name: string;
    percentage: number;
    status: 'Active' | 'Inactive';
}

const ITEMS_PER_PAGE = 10;

function TaxManagement() {
    const { canWrite, canMaintain } = usePrivilege('Tax Settings');
    const [taxes, setTaxes] = useState<Tax[]>([]);


    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        percentage: '',
        status: 'Active' as 'Active' | 'Inactive'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    // Confirm modal state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');
    const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);

    const itemsToShow = taxes;

    /**
     * Normalize tax name for duplicate comparison.
     * Removes all spaces and converts to lowercase.
     * e.g., "Service Tax" and "ServiceTax" and "service tax" all become "servicetax"
     */
    const normalizeTaxName = (name: string): string => {
        return name.replace(/\s+/g, '').toLowerCase();
    };

    /**
     * Check if a tax name already exists (normalized comparison).
     * For edit mode, excludes the current tax being edited.
     */
    const isDuplicateTaxName = (name: string, excludeId?: string): boolean => {
        const normalizedInput = normalizeTaxName(name);
        return taxes.some(tax => {
            // Skip the tax being edited
            if (excludeId && tax.id === excludeId) return false;
            return normalizeTaxName(tax.name) === normalizedInput;
        });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        const trimmedName = formData.name.trim();

        if (!trimmedName) {
            newErrors.name = 'Tax Name is required';
        } else if (isDuplicateTaxName(trimmedName, editingId || undefined)) {
            newErrors.name = 'Tax name already exists.';
        }

        if (!formData.percentage.trim()) {
            newErrors.percentage = 'Tax Percentage is required';
        } else {
            const pct = parseFloat(formData.percentage);
            if (isNaN(pct) || pct <= 0 || pct > 100) {
                newErrors.percentage = 'Tax percentage must be greater than 0';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // get all foods 
    const loadTaxes = async () => {
        try {
            const res = await GetTax(currentPage - 1, ITEMS_PER_PAGE);

            const taxList = res.data.content || [];
            const serverTotalPages = res.data.totalPages || 0;
            const serverTotalElements = res.data.totalElements || 0;

            setTaxes(
                taxList.map((t: any) => ({
                    id: String(t.id),
                    name: t.name,
                    percentage: t.percentage,
                    status: t.status ? 'Active' : 'Inactive'
                }))
            );
            setTotalPages(serverTotalPages);
            setTotalItems(serverTotalElements);

        } catch (err) {
            console.error('Failed to load taxes:', err);
            setTaxes([]);
        }
    };

    useEffect(() => {
        loadTaxes();
    }, [currentPage]);

    // create tax handler
    const handleCreateTax = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTax({
                name: formData.name.trim(),
                percentage: Number(formData.percentage),
                status: formData.status === 'Active'
            });

            // close form modal then show consistent success popup
            closeModal();
            setConfirmTitle('Success');
            setConfirmMessage('Created successfully');
            setConfirmShowSuccess(true);
            setConfirmAction(undefined);
            setConfirmConfirmText('Close');
            setConfirmOpen(true);

            // auto close after a short delay


            loadTaxes();

        } catch (err: any) {
            if (err.response?.data?.data?.[0]?.message) {
                setConfirmTitle('Error');
                setConfirmMessage(err.response.data.data[0].message);
                setConfirmShowSuccess(false);
                setConfirmAction(undefined);
                setConfirmConfirmText('Close');
                setConfirmOpen(true);
            } else {
                setConfirmTitle('Error');
                setConfirmMessage('Server error');
                setConfirmShowSuccess(false);
                setConfirmAction(undefined);
                setConfirmConfirmText('Close');
                setConfirmOpen(true);
            }
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ name: '', percentage: '', status: 'Active' });
        setErrors({});
        setIsModalOpen(true);
    };

    // update tax handler
    const handleUpdateTax = async (id: number) => {
        try {
            await updateTax(
                {
                    name: formData.name.trim(),
                    percentage: Number(formData.percentage),
                    status: formData.status === 'Active'
                },
                id
            );

            // close form modal then show consistent success popup
            closeModal();
            setConfirmTitle('Success');
            setConfirmMessage('Updated successfully');
            setConfirmShowSuccess(true);
            setConfirmAction(undefined);
            setConfirmConfirmText('Close');
            setConfirmOpen(true);

            // auto close after a short delay


            loadTaxes();

        } catch (err: any) {
            if (err.response?.data?.data?.[0]?.message) {
                setConfirmTitle('Error');
                setConfirmMessage(err.response.data.data[0].message);
                setConfirmShowSuccess(false);
                setConfirmAction(undefined);
                setConfirmConfirmText('Close');
                setConfirmOpen(true);
            } else {
                setConfirmTitle('Error');
                setConfirmMessage('Server error');
                setConfirmShowSuccess(false);
                setConfirmAction(undefined);
                setConfirmConfirmText('Close');
                setConfirmOpen(true);
            }
        }
    };

    const openEditModal = (tax: Tax) => {
        setEditingId(tax.id);
        setFormData({
            name: tax.name,
            percentage: tax.percentage.toString(),
            status: tax.status
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        if (editingId) {
            await handleUpdateTax(Number(editingId));
        } else {
            await handleCreateTax(e);
        }
    };


    //delete tax handler
    const handledelete = async (id: number) => {
        try {
            await deleteTax(id);
            // show success inside confirm modal
            setConfirmMessage('Deleted successfully');
            setConfirmTitle('Success');
            setConfirmShowSuccess(true);
            // auto close confirm popup
            setTimeout(() => {
                setConfirmOpen(false);
            }, 1400);

            loadTaxes();
        }
        catch (err: any) {
            const errMsg = err?.response?.data?.data?.[0]?.message || err?.message || 'server error.';
            setConfirmTitle('Error');
            setConfirmMessage(errMsg);
            setConfirmShowSuccess(false);
            setConfirmOpen(true);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const columns: Column<Tax>[] = [
        { header: 'Name', accessor: (t) => <span className={styles.name}>{t.name}</span> },
        { header: 'Percentage', accessor: (t) => `${t.percentage}%` },

        {
            header: 'Status', accessor: (t) => (
                <span className={`${styles.statusBadge} ${t.status === 'Active' ? styles.active : styles.inactive}`}>
                    {t.status}
                </span>
            )
        },
        {
            header: 'Actions', accessor: (t) => (
                <div className={styles.actions}>
                    <button className={styles.actionBtn} title="Edit" onClick={() => openEditModal(t)} disabled={!canWrite}>
                        <FiEdit size={20} aria-hidden="true" />
                    </button>
                    <button
                        className={styles.actionBtn}
                        title="Delete"
                        onClick={() => {
                            // prepare confirmation
                            setConfirmTitle('Confirm Delete');
                            setConfirmMessage('Are you sure you want to delete this tax?');
                            setConfirmConfirmText('Delete');
                            setConfirmShowSuccess(false);
                            setConfirmAction(() => async () => {
                                try {
                                    await handledelete(Number(t.id));
                                    // success message set inside handledelete
                                } catch (e) {
                                    // error handled in handledelete
                                    throw e;
                                }
                            });

                            setConfirmOpen(true);
                        }}
                        disabled={!canMaintain}
                    >
                        <MdDelete size={20} aria-hidden="true" />
                    </button>

                </div>
            )
        },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Tax Management</h1>
                <Button onClick={openAddModal} disabled={!canWrite}>+ Add Tax</Button>
            </div>


            <DataTable columns={columns} data={itemsToShow} keyExtractor={(t) => t.id} />
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Tax' : 'Add New Tax'}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <FormField
                        label="Tax Name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        error={errors.name}
                    />

                    <FormField
                        label="Tax Percentage"
                        name="percentage"
                        type="number"
                        required
                        value={formData.percentage}
                        onChange={(e) => setFormData(p => ({ ...p, percentage: e.target.value }))}
                        error={errors.percentage}
                        min={0}
                        max={100}
                        step="0.01"
                    />

                    <div className={styles.fieldGroup}>
                        <Label required>Status</Label>
                        <select
                            className={styles.select}
                            value={formData.status}
                            onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div className={styles.formActions}>
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button type="submit">{editingId ? 'Update' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => { setConfirmOpen(false); setConfirmShowSuccess(false); }}
                title={confirmTitle}
                message={confirmMessage}
                confirmText={confirmConfirmText}
                showSuccess={confirmShowSuccess}
                onConfirm={confirmAction}
            />
        </div>
    );
}

export default TaxManagement;