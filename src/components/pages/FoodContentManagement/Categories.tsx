import { useEffect, useState } from 'react';
import styles from './FoodContentManagement.module.css';
import { Pagination } from '../../molecules/Pagination/Pagination';
import type { Category } from './types';
import { createMainCategory, deleteMainCategory, fetchMainCategories, updateMainCategory } from '../../../api/foodContentManagement/Category.api';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';

interface Props {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  paginatedCategories: Category[];
  catPage: number;
  setCatPage: (n: number) => void;
  catTotalPages: number;
}

export default function Categories({ categories, setCategories, paginatedCategories, catPage, setCatPage, catTotalPages }: Props) {
  // Local modal/form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<{ id?: string; name: string; status: 'Active' | 'Inactive' }>({ name: '', status: 'Active' });
  // Snapshot of original form values when edit is opened (for dirty detection)
  const [originalForm, setOriginalForm] = useState<{ name: string; status: 'Active' | 'Inactive' } | null>(null);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
  const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');

  const openAdd = () => { setModalMode('add'); setForm({ name: '', status: 'Active' }); setOriginalForm(null); setErrors({}); setIsModalOpen(true); };
  const openEdit = (cat: Category) => {
    setModalMode('edit');
    setForm({ id: cat.id, name: cat.name, status: cat.status });
    // Store original values snapshot for dirty detection
    setOriginalForm({ name: cat.name, status: cat.status });
    setErrors({});
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setErrors({}); setOriginalForm(null); };

  // Compute isDirty: check if any editable field changed from original
  const isDirty = modalMode === 'edit' && originalForm ? (
    form.name !== originalForm.name ||
    form.status !== originalForm.status
  ) : true; // For 'add' mode, always allow save

  // get all main categories
  const fetchCategories = async () => {
    try {
      const res = await fetchMainCategories();

      // Make sure we have an array
      if (res.data && Array.isArray(res.data.content)) {
        // Map API data to your Category type
        const categories: Category[] = res.data.content.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          status: (c.status === true || c.status === 'true' || String(c.status).toLowerCase() === 'active') ? 'Active' : 'Inactive',
          subCategories: [], // keep empty if you only want main categories here
        }));

        setCategories(categories);
      } else {
        console.error('API returned invalid data structure:', res.data);
        setCategories([]);
      }
    } catch (err: any) {
      setConfirmTitle('Error');
      setConfirmMessage(err.response?.data?.data?.[0]?.message || err.message || "Server error");
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
    }
  };


  useEffect(() => {
    fetchCategories();
  }, []);

  // Frontend validation
  const validateName = (name: string): string | null => {
    if (!name || name.trim().length === 0) return "Category name cannot be empty.";
    if (name !== name.trim()) return "Category name cannot start or end with a space.";
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(name)) return "Category name must contain only letters (A–Z).";
    return null;
  };

  /**
   * Check if a category name already exists (case-insensitive, whitespace normalized).
   * For edit mode, excludes the current category being edited.
   */
  const isDuplicateCategory = (name: string, excludeId?: string): boolean => {
    if (!name.trim()) return false;
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
    return categories.some(c => {
      // Skip the category being edited
      if (excludeId && c.id === excludeId) return false;
      // Compare normalized names (case-insensitive, extra spaces normalized)
      const existingName = c.name.trim().toLowerCase().replace(/\s+/g, ' ');
      return existingName === normalizedName;
    });
  };

  /**
   * Real-time validation for category name - checks duplicates while typing
   */
  const validateCategoryNameRealtime = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      setErrors(prev => ({ ...prev, name: undefined }));
      return;
    }

    // Check format first
    const formatError = validateName(name);
    if (formatError) {
      setErrors(prev => ({ ...prev, name: formatError }));
      return;
    }

    // Check for duplicates
    if (isDuplicateCategory(trimmed, modalMode === 'edit' ? form.id : undefined)) {
      setErrors(prev => ({ ...prev, name: 'Main category already exists.' }));
      return;
    }

    // Clear error if valid
    setErrors(prev => ({ ...prev, name: undefined }));
  };

  // Handlers create main category
  const handleSaveMainCategory = async () => {
    const nameError = validateName(form.name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    // Check for duplicate category name
    if (isDuplicateCategory(form.name)) {
      setErrors({ name: 'Main category already exists.' });
      return;
    }

    // const restaurantId = localStorage.getItem('restaurantId') || '';  
    // console.log("restaurantId",restaurantId);
    const restaurantId = '1'; // Temporary hardcoded value for testing

    try {
      const res = await createMainCategory({
        name: form.name,
        status: form.status === 'Active'
      }
        , restaurantId
      );

      // consistent success popup
      setConfirmTitle('Success');
      setConfirmMessage('Created successfully');
      setConfirmShowSuccess(true);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);

      console.log("createMainCategory", res.data);

      setCategories(prev => [
        ...prev, {
          ...res.data,
          status: res.data.status === true ? 'Active' : 'Inactive'
        }
      ]);
      closeModal();
    }
    catch (err: any) {
      if (err.response?.data?.statusMessage) {
        setConfirmTitle('Error');
        setConfirmMessage(err.response.data.data[0].message);
        setConfirmShowSuccess(false);
        setConfirmOpen(true);
      } else {
        setConfirmTitle('Error');
        setConfirmMessage('Server error');
        setConfirmShowSuccess(false);
        setConfirmOpen(true);
      }
    }
  };

  // Handlers update main category
  const handleUpdateMainCategory = async () => {
    const nameError = validateName(form.name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    // Check for duplicate category name (exclude current category in edit mode)
    if (isDuplicateCategory(form.name, form.id)) {
      setErrors({ name: 'Main category already exists.' });
      return;
    }

    if (!form.id) return;

    // Safety check: ensure at least one field is changed
    if (!isDirty) {
      setConfirmTitle('No Changes');
      setConfirmMessage('Please modify at least one field before updating.');
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
      return;
    }
    try {
      const res = await updateMainCategory({
        name: form.name,
        status: form.status === 'Active'
      }, Number(form.id));

      setConfirmTitle('Success');
      setConfirmMessage('Updated successfully');
      setConfirmShowSuccess(true);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);

      setCategories(prev =>
        prev.map(c =>
          c.id === form.id ? {
            ...res.data,
            status: res.data.status === true ? 'Active' : 'Inactive'
          }
            : c
        )
      );
      closeModal();
      fetchCategories();
    }
    catch (err: any) {
      if (err.response?.data?.statusMessage) {
        setConfirmTitle('Error');
        setConfirmMessage(err.response.data.data[0].message);
        setConfirmShowSuccess(false);
        setConfirmOpen(true);
      } else {
        setConfirmTitle('Error');
        setConfirmMessage('Server error');
        setConfirmShowSuccess(false);
        setConfirmOpen(true);
      }
    }
  };

  // Handlers delete main category
  const handleDeleteMainCategory = async (id: number) => {
    // open confirm modal
    setConfirmTitle('Confirm Delete');
    setConfirmMessage('Are you sure you want to delete this category?');
    setConfirmConfirmText('Delete');
    setConfirmShowSuccess(false);
    setConfirmAction(() => async () => {
      try {
        await deleteMainCategory(id);

        setConfirmMessage('Deleted successfully');
        setConfirmTitle('Success');
        setConfirmShowSuccess(true);
        setCategories(prev => prev.filter(c => c.id !== String(id)));
      }
      catch (err: any) {
        if (err.response?.data?.statusMessage) {
          setConfirmTitle('Error');
          setConfirmMessage(err.response.data.data[0].message);
          setConfirmShowSuccess(false);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
        } else {
          setConfirmTitle('Error');
          setConfirmMessage('Server error');
          setConfirmShowSuccess(false);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
        }
      }
    });

    setConfirmOpen(true);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Main Categories</h2>
        <button className={styles.addBtn} onClick={openAdd}>
          + Add Category
        </button>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCategories.length === 0 ? (
              <tr><td colSpan={3} className={styles.emptyState}>No categories available</td></tr>
            ) : (
              paginatedCategories.map(cat => (
                <tr key={cat.id} className={styles.tr}>
                  <td className={styles.td}>{cat.name}</td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${cat.status === 'Active' ? styles.active : styles.inactive}`}>
                      {cat.status}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => openEdit(cat)} title="Edit"><FiEdit size={20} aria-hidden="true" /></button>
                      <button className={styles.actionBtn} onClick={() => handleDeleteMainCategory(Number(cat.id))} title="Delete"><MdDelete size={20} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Total: {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </span>
          <Pagination currentPage={catPage} totalPages={catTotalPages} onPageChange={setCatPage} />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmShowSuccess(false); }}
        title={confirmTitle}
        message={confirmMessage}
        showSuccess={confirmShowSuccess}
        confirmText={confirmConfirmText}
        onConfirm={confirmAction}
      />

      {/* Category Modal (local to this component) */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modalMode === 'add' ? 'Add' : 'Edit'} Main Category</h2>
              <button className={styles.closeBtn} onClick={closeModal}>×</button>
            </div>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter category name"
                  value={form.name}
                  onChange={e => {
                    const newValue = e.target.value;
                    setForm(prev => ({ ...prev, name: newValue }));
                    // Real-time duplicate validation
                    validateCategoryNameRealtime(newValue);
                  }}
                  onBlur={() => {
                    // Also validate on blur for complete coverage
                    validateCategoryNameRealtime(form.name);
                  }}
                  style={errors.name ? { borderColor: '#c33' } : {}}
                />
                {errors.name && (
                  <span style={{ color: '#c33', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {errors.name}
                  </span>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select
                  className={styles.select}
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                <button
                  className={styles.saveBtn}
                  onClick={modalMode === 'add' ? handleSaveMainCategory : handleUpdateMainCategory}
                  disabled={(modalMode === 'edit' && !isDirty) || !!errors.name}
                  style={(modalMode === 'edit' && !isDirty) || !!errors.name ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {modalMode === 'add' ? 'Save' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
