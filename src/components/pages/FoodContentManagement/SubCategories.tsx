import { useState, useEffect, useRef } from 'react';
import styles from './FoodContentManagement.module.css';
import { Pagination } from '../../molecules/Pagination/Pagination';
import type { SubCategory, Category } from './types';
import { AddSubCategory, getSubCategoriesByMainCategory, updateSubCategoryById, deleteSubCategoryById } from '../../../api/foodContentManagement/SubCategory.api';
import { getAllCategories } from '../../../api/foodContentManagement/Category.api';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';

interface SubWithParent extends SubCategory {
  categoryId: string;
  categoryName: string;
}

interface Props {
  categories: Category[];
  allSubCategories: SubWithParent[];
  setAllSubCategories: React.Dispatch<React.SetStateAction<SubWithParent[]>>;
  paginatedSubCategories: SubWithParent[];
  subPage: number;
  setSubPage: (n: number) => void;
  subTotalPages: number;
}

export default function SubCategories({ categories, allSubCategories, setAllSubCategories, paginatedSubCategories, subPage, setSubPage, subTotalPages }: Props) {
  console.log('SubCategories render - paginatedSubCategories:', paginatedSubCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<{ id?: string; categoryId: string; name: string; status: 'Active' | 'Inactive' }>({ categoryId: '', name: '', status: 'Active' });
  // Snapshot of original form values when edit is opened (for dirty detection)
  const [originalForm, setOriginalForm] = useState<{ name: string; status: 'Active' | 'Inactive' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; categoryId?: string; general?: string }>({});
  const [mainCategories, setMainCategories] = useState<Array<{ id: string; name: string; status?: any }>>([]);

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
  const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');

  // Fetch main categories from API
  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        console.log('Fetching main categories...');
        const response = await getAllCategories({ page: 0, size: 100 }); // Fetch all categories
        console.log('Main categories API response:', response);
        console.log('Response data:', response.data);

        // Handle the response structure
        const categoriesData = response.data?.content || response.data || [];
        console.log('Categories data:', categoriesData);

        const formattedCategories = Array.isArray(categoriesData)
          ? categoriesData
            .map(cat => ({
              id: String(cat.id),
              name: cat.name,
              status: cat.status
            }))
          : [];

        console.log('Formatted categories:', formattedCategories);
        setMainCategories(formattedCategories);

        // Set default category if form is empty
        if (!form.categoryId && formattedCategories.length > 0) {
          setForm(prev => ({ ...prev, categoryId: formattedCategories[0].id }));
        }
      } catch (error: any) {
        console.error('Failed to fetch main categories:', error);
        console.error('Error response:', error?.response);
        console.error('Error data:', error?.response?.data);
      }
    };

    fetchMainCategories();
  }, []);

  // Fetch sub-categories on mount
  const fetchSubCategories = async () => {
    if (categories.length === 0) return;
    try {
      console.log('Fetching sub-categories for categories:', categories.map(c => c.name));
      // Fetch for all categories and merge into state
      const promises = categories.map(cat =>
        getSubCategoriesByMainCategory(Number(cat.id))
          .then(res => {
            console.log('API response for category', cat.id, ':', res);
            return { categoryId: cat.id, items: res.data };
          })
          .catch(err => {
            console.error('Error fetching for category', cat.id, ':', err);
            // Handle "No subcategories found" as empty array, not an error
            const errorMessage = err?.response?.data?.message ||
              err?.response?.data?.statusMessage ||
              err?.message || '';
            if (errorMessage.toLowerCase().includes('no subcategories found')) {
              return { categoryId: cat.id, items: [] };
            }
            return { categoryId: cat.id, items: [] };
          })
      );
      const results = await Promise.all(promises);
      console.log('All sub-category results:', results);

      const flattened: SubWithParent[] = results.flatMap(res => {
        const cat = categories.find(c => c.id === res.categoryId);
        return res.items.map(item => ({
          id: String(item.id),
          name: item.subCategoryName || '',
          status: isActiveValue(item.status) ? 'Active' as const : 'Inactive' as const,
          categoryId: res.categoryId,
          categoryName: item.mainCategoryName || cat?.name || 'Unknown',
        }));
      });

      setAllSubCategories(flattened);
    } catch (err) {
      console.error('Failed to fetch sub-categories:', err);
    }
  };

  const hasFetchedSubRef = useRef(false);
  useEffect(() => {
    if (categories.length > 0 && !hasFetchedSubRef.current) {
      hasFetchedSubRef.current = true;
      fetchSubCategories();
    }
  }, [categories]);

  // Map status values from API or state to UI label and boolean
  const toStatusLabel = (val: unknown): 'Active' | 'Inactive' => {
    return isActiveValue(val) ? 'Active' : 'Inactive';
  };
  const isActiveValue = (val: unknown): boolean => {
    if (val === true || val === 'true' || val === 1 || val === '1') return true;
    if (val === 'Active' || (typeof val === 'string' && val.toLowerCase() === 'active')) return true;
    return false;
  };

  const openAdd = () => {
    setModalMode('add');
    setForm({ categoryId: mainCategories[0]?.id || '', name: '', status: 'Active' });
    setOriginalForm(null);
    setErrors({});
    setIsModalOpen(true);
  };
  const openEdit = (sub: SubWithParent) => {
    setModalMode('edit');
    const statusValue = toStatusLabel((sub as any).status);
    setForm({ id: sub.id, categoryId: sub.categoryId, name: sub.name, status: statusValue });
    // Store original values snapshot for dirty detection
    setOriginalForm({ name: sub.name, status: statusValue });
    setErrors({});
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setErrors({}); setOriginalForm(null); };

  // Compute isDirty: check if any editable field changed from original
  const isDirty = modalMode === 'edit' && originalForm ? (
    form.name !== originalForm.name ||
    form.status !== originalForm.status
  ) : true; // For 'add' mode, always allow save

  // Frontend validation matching backend rules
  const validateSubCategoryName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return "Sub category name cannot be empty.";
    }
    if (name !== name.trim()) {
      return "Sub category name cannot start or end with a space.";
    }
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(name)) {
      return "Sub category name must contain only letters (A–Z).";
    }
    return null;
  };

  const saveSubCategory = async () => {
    // Clear previous errors
    setErrors({});

    // Frontend validation
    const nameError = validateSubCategoryName(form.name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    if (!form.categoryId) {
      setErrors({ categoryId: "Please select a main category." });
      return;
    }

    // Safety check for edit mode: ensure at least one field is changed
    if (modalMode === 'edit' && !isDirty) {
      setConfirmTitle('No Changes');
      setConfirmMessage('Please modify at least one field before updating.');
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
      return;
    }

    // Force Inactive if parent is Inactive
    const parentCategory = mainCategories.find(c => c.id === form.categoryId);
    const isParentInactive = parentCategory && !isActiveValue(parentCategory.status);
    const finalStatus = isParentInactive ? 'Inactive' : form.status;

    try {
      setIsSaving(true);
      if (modalMode === 'add') {
        const mainCategoryIdNum = Number(form.categoryId);
        const requestBody = {
          subCategoriesName: form.name,
          mainCategoryID: mainCategoryIdNum,
          status: finalStatus === 'Active',
        };

        try {
          await AddSubCategory(requestBody, mainCategoryIdNum);

          // Re-fetch to get latest data with all associations
          await fetchSubCategories();

          closeModal();

          // Feedback Modal
          setConfirmTitle('Success');
          setConfirmMessage('Created successfully');
          setConfirmShowSuccess(true);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
          setTimeout(() => setConfirmOpen(false), 1500);
        } catch (apiError: any) {
          const errorMessage = apiError?.response?.data?.message ||
            apiError?.response?.data?.statusMessage ||
            apiError?.message ||
            'Failed to add sub-category.';

          if (errorMessage.toLowerCase().includes('already exists')) {
            setErrors({ name: 'Sub category already exists for this main category.' });
          } else {
            // Error Modal
            setConfirmTitle('Error');
            setConfirmMessage(errorMessage);
            setConfirmShowSuccess(false);
            setConfirmConfirmText('OK');
            setConfirmAction(undefined);
            setConfirmOpen(true);
          }
          return;
        }
      } else if (form.id) {
        const idNum = Number(form.id);
        const requestBody = {
          subCategoriesName: form.name,
          mainCategoryID: Number(form.categoryId),
          status: finalStatus === 'Active',
        };
        try {
          console.log('Updating sub-category:', idNum, requestBody);
          await updateSubCategoryById(idNum, requestBody);

          // Re-fetch to be absolutely sure we have latest server state
          await fetchSubCategories();

          closeModal();

          // Feedback Modal
          setConfirmTitle('Success');
          setConfirmMessage('Updated successfully');
          setConfirmShowSuccess(true);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
          setTimeout(() => setConfirmOpen(false), 1500);
        } catch (apiError: any) {
          const errorMessage = apiError?.response?.data?.message ||
            apiError?.response?.data?.statusMessage ||
            apiError?.message ||
            'Failed to update sub-category.';

          // Error Modal
          setConfirmTitle('Error');
          setConfirmMessage(errorMessage);
          setConfirmShowSuccess(false);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
          return;
        }
      }
    } catch (err: any) {
      setConfirmTitle('Error');
      setConfirmMessage('An unexpected error occurred.');
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSubCategory = async (subId: string) => {
    // open confirm modal
    setConfirmTitle('Confirm Delete');
    setConfirmMessage('Delete this sub-category and all its variants?');
    setConfirmConfirmText('Delete');
    setConfirmShowSuccess(false);
    setConfirmAction(() => async () => {
      try {
        await deleteSubCategoryById(Number(subId));
        setAllSubCategories(prev => prev.filter(sub => sub.id !== subId));

        setConfirmTitle('Success');
        setConfirmMessage('Deleted successfully');
        setConfirmShowSuccess(true);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
        setTimeout(() => setConfirmOpen(false), 1500);
      } catch (apiError: any) {
        const errorMessage = apiError?.response?.data?.message ||
          apiError?.response?.data?.statusMessage ||
          apiError?.message ||
          'Failed to delete sub-category.';

        setConfirmTitle('Error');
        setConfirmMessage(errorMessage);
        setConfirmShowSuccess(false);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
      }
    });

    setConfirmOpen(true);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Sub Categories</h2>
        <button className={styles.addBtn} onClick={openAdd}>
          + Add Sub Category
        </button>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Main Category</th>
              <th className={styles.th}>Sub Category Name</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSubCategories.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyState}>No sub-categories available</td></tr>
            ) : (
              paginatedSubCategories.map(sub => (
                <tr key={sub.id} className={styles.tr}>
                  <td className={styles.td}>{sub.categoryName}</td>
                  <td className={styles.td}>{sub.name}</td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${isActiveValue((sub as any).status) ? styles.active : styles.inactive}`}>
                      {toStatusLabel((sub as any).status)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => openEdit(sub)} title="Edit"><FiEdit size={20} aria-hidden="true" /></button>
                      <button className={styles.actionBtn} onClick={() => deleteSubCategory(sub.id)} title="Delete"><MdDelete size={20} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Total: {allSubCategories.length} sub-categor{allSubCategories.length === 1 ? 'y' : 'ies'}
          </span>
          <Pagination currentPage={subPage} totalPages={subTotalPages} onPageChange={setSubPage} />
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

      {/* Sub Category Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modalMode === 'add' ? 'Add' : 'Edit'} Sub Category</h2>
              <button className={styles.closeBtn} onClick={closeModal}>×</button>
            </div>
            <div className={styles.form}>
              {/* General error message */}
              {errors.general && (
                <div style={{
                  padding: '10px',
                  marginBottom: '15px',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '4px',
                  color: '#c33',
                  fontSize: '14px'
                }}>
                  {errors.general}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Main Category</label>
                <select
                  className={styles.select}
                  value={form.categoryId}
                  onChange={e => {
                    const newId = e.target.value;
                    const parent = mainCategories.find(c => c.id === newId);
                    const isParentInactive = parent && !isActiveValue(parent.status);

                    setForm(prev => ({
                      ...prev,
                      categoryId: newId,
                      status: isParentInactive ? 'Inactive' : prev.status
                    }));
                    setErrors(prev => ({ ...prev, categoryId: undefined }));
                  }}
                  disabled={modalMode === 'edit'}
                  style={errors.categoryId ? { borderColor: '#c33' } : {}}
                >
                  <option value="">
                    {mainCategories.length === 0 ? 'Loading categories...' : 'Select Main Category'}
                  </option>
                  {mainCategories
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {errors.categoryId && (
                  <span style={{ color: '#c33', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {errors.categoryId}
                  </span>
                )}
                {mainCategories.length === 0 && (
                  <span style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    No main categories found. Please create a main category first.
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sub Category Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter sub-category name"
                  value={form.name}
                  onChange={e => {
                    setForm(prev => ({ ...prev, name: e.target.value }));
                    setErrors(prev => ({ ...prev, name: undefined, general: undefined }));
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
                {(() => {
                  const parentCat = mainCategories.find(c => c.id === form.categoryId);
                  const isParentInactive = parentCat && !isActiveValue(parentCat.status);

                  return (
                    <>
                      <select
                        className={styles.select}
                        value={isParentInactive ? 'Inactive' : form.status}
                        onChange={e => setForm(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                        disabled={isParentInactive}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {isParentInactive && (
                        <span style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                          Locked to Inactive because the Main Category is Inactive.
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                <button
                  className={styles.saveBtn}
                  onClick={saveSubCategory}
                  disabled={isSaving || (modalMode === 'edit' && !isDirty)}
                  style={modalMode === 'edit' && !isDirty ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {isSaving ? 'Saving...' : (modalMode === 'edit' ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
