import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FoodContentManagement.module.css';
import { Pagination } from '../../molecules/Pagination/Pagination';
import type { FoodVariant, Category } from './types';
import { getAllFoodVariants, addFoodVariant, updateFoodVariant, deleteFoodVariant } from '../../../api/foodContentManagement/Variants.api';
import { getSubCategoriesByMainCategory } from '../../../api/foodContentManagement/SubCategory.api';
import type { SubCategoryItemDto } from '../../../api/foodContentManagement/SubCategory.api';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';

const isActiveValue = (val: unknown): boolean => {
  if (val === true || val === 'true' || val === 1 || val === '1') return true;
  if (val === 'Active' || (typeof val === 'string' && val.toLowerCase() === 'active')) return true;
  return false;
};

interface VariantWithMeta extends FoodVariant {
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
}

interface Props {
  categories: Category[];
  allVariants: VariantWithMeta[];
  setAllVariants: React.Dispatch<React.SetStateAction<VariantWithMeta[]>>;
  paginatedVariants: VariantWithMeta[];
  varPage: number;
  setVarPage: (n: number) => void;
  varTotalPages: number;
}

export default function Variants({ categories, allVariants, setAllVariants, setVarPage }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<{ id?: string; categoryId: string; subCategoryId: string; categoryName: string; subCategoryName: string; name: string; price: string; status: 'Active' | 'Inactive'; image: string; imageFile?: File | null; imageRemoved?: boolean }>({ categoryId: '', subCategoryId: '', categoryName: '', subCategoryName: '', name: '', price: '', status: 'Active', image: '', imageFile: null, imageRemoved: false });
  // Snapshot of original form values when edit is opened (for dirty detection)
  const [originalForm, setOriginalForm] = useState<{ name: string; price: string; status: 'Active' | 'Inactive'; image: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; categoryId?: string; subCategoryId?: string }>({});

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
  const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');

  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategoryItemDto[]>([]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterSubCategoryId, setFilterSubCategoryId] = useState('');
  const [filterSubCategories, setFilterSubCategories] = useState<SubCategoryItemDto[]>([]);
  const ITEMS_PER_PAGE = 10;
  const [localPage, setLocalPage] = useState(1);

  /**
   * Check if a variant name already exists under the same category and subcategory.
   * For edit mode, excludes the current variant being edited.
   */
  const isDuplicateVariant = (name: string, categoryId: string, subCategoryId: string, excludeId?: string): boolean => {
    if (!name.trim() || !categoryId || !subCategoryId) return false;
    const normalizedName = name.trim().toLowerCase();
    return allVariants.some(v => {
      // Skip the variant being edited
      if (excludeId && v.id === excludeId) return false;
      // Check same category, subcategory, and name
      return v.categoryId === categoryId &&
        v.subCategoryId === subCategoryId &&
        v.name.toLowerCase() === normalizedName;
    });
  };

  /**
   * Filter variants based on search query and category/subcategory filters
   */
  const filteredVariants = useMemo(() => {
    let result = allVariants;

    // Filter by search query (variant name)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.categoryName.toLowerCase().includes(query) ||
        v.subCategoryName.toLowerCase().includes(query)
      );
    }

    // Filter by main category
    if (filterCategoryId) {
      result = result.filter(v => v.categoryId === filterCategoryId);
    }

    // Filter by sub category
    if (filterSubCategoryId) {
      result = result.filter(v => v.subCategoryId === filterSubCategoryId);
    }

    return result;
  }, [allVariants, searchQuery, filterCategoryId, filterSubCategoryId]);

  // Local pagination for filtered results
  const filteredTotalPages = Math.ceil(filteredVariants.length / ITEMS_PER_PAGE) || 1;
  const localPaginatedVariants = filteredVariants.slice((localPage - 1) * ITEMS_PER_PAGE, localPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setLocalPage(1);
  }, [searchQuery, filterCategoryId, filterSubCategoryId]);

  /**
   * Real-time validation for variant name - checks duplicates while typing
   */
  const validateVariantNameRealtime = (name: string) => {
    const trimmed = name.trim();

    // Skip validation if category/subcategory not selected yet
    if (!form.categoryId || !form.subCategoryId) {
      return;
    }

    if (!trimmed) {
      setErrors(prev => ({ ...prev, name: undefined }));
      return;
    }

    // Check format
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(trimmed)) {
      setErrors(prev => ({ ...prev, name: 'Variant name must contain only letters.' }));
      return;
    }

    // Check for duplicates
    if (isDuplicateVariant(trimmed, form.categoryId, form.subCategoryId, modalMode === 'edit' ? form.id : undefined)) {
      setErrors(prev => ({ ...prev, name: 'Food variant already exists.' }));
      return;
    }

    // Clear error if valid
    setErrors(prev => ({ ...prev, name: undefined }));
  };

  const openAdd = () => { setModalMode('add'); setForm({ categoryId: '', subCategoryId: '', categoryName: '', subCategoryName: '', name: '', price: '', status: 'Active', image: '', imageFile: null, imageRemoved: false }); setErrors({}); setIsModalOpen(true); };
  const openEdit = (v: VariantWithMeta) => {
    setModalMode('edit');
    setErrors({});
    const editFormData = {
      id: v.id,
      categoryId: v.categoryId,
      subCategoryId: v.subCategoryId,
      categoryName: v.categoryName,
      subCategoryName: v.subCategoryName,
      name: v.name,
      price: v.price.toString(),
      status: v.status,
      image: v.image || '',
      imageFile: null,
      imageRemoved: false
    };
    setForm(editFormData);
    // Store original values snapshot for dirty detection
    setOriginalForm({
      name: v.name,
      price: v.price.toString(),
      status: v.status,
      image: v.image || ''
    });
    setIsModalOpen(true);
    // Fetch subcategories for the category to know its status for lock logic
    if (v.categoryId) {
      getSubCategoriesByMainCategory(Number(v.categoryId))
        .then(res => { if (res.data) setAvailableSubCategories(res.data); })
        .catch(() => { });
    }
  };
  const closeModal = () => { setIsModalOpen(false); setErrors({}); setOriginalForm(null); };
  const hasFetched = useRef(false);

  // Compute isDirty: check if any editable field changed from original
  const isDirty = modalMode === 'edit' && originalForm ? (
    form.name !== originalForm.name ||
    form.price !== originalForm.price ||
    form.status !== originalForm.status ||
    form.image !== originalForm.image ||
    !!form.imageFile ||
    !!form.imageRemoved
  ) : true; // For 'add' mode, always allow save


  // get all food variants
  const fetchAllVariants = async () => {
    try {
      // Fetch with large size to get all data for client-side pagination
      const res = await getAllFoodVariants({ size: 1000 });

      if (res.data && Array.isArray(res.data.content)) {
        console.log('DEBUG: Raw food variants content:', res.data.content);
        const variants: VariantWithMeta[] = res.data.content.map((v: any) => {
          // Comprehensive check for the name field
          const name = v.foodName ||
            v.food_name ||
            v.name ||
            v.foodVariantName ||
            v.food_variant_name ||
            v.foodNames ||
            v.food_names ||
            v.foodName ||
            '';

          return {
            id: String(v.id),
            name: name,
            price: v.price,
            status: (v.status === true || v.status === 'Active' || String(v.status) === 'true') ? 'Active' : 'Inactive',
            image: v.image || v.foodImage || v.food_image || undefined,
            categoryId: String(v.mainCategoryId || v.mainCategory_id || v.mainCategoryID || ''),
            categoryName: v.mainCategoryName || '',
            subCategoryId: String(v.subCategoryId || v.subCategory_id || v.subCategoryID || v.subcategoryId || ''),
            subCategoryName: v.subCategoryName || v.subCategoriesName || v.sub_category_name || '',
          };
        });

        // Sort by ID descending (newest first) so new items appear at the top
        variants.sort((a, b) => Number(b.id) - Number(a.id));

        setAllVariants(variants);
      }
    } catch (err: any) {
      setConfirmTitle('Error');
      setConfirmMessage(err.response?.data?.data?.[0]?.message || 'Server error');
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAllVariants();
    }
  }, []);




  const handleMainCategoryChange = async (categoryId: string) => {
    setForm(prev => ({ ...prev, categoryId, subCategoryId: '' }));
    setErrors(prev => ({ ...prev, categoryId: undefined, subCategoryId: undefined }));
    if (categoryId) {
      try {
        const res = await getSubCategoriesByMainCategory(Number(categoryId));
        if (res.data) {
          setAvailableSubCategories(res.data);
        } else {
          setAvailableSubCategories([]);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.statusMessage ||
          err.response?.data?.data?.[0]?.message ||
          'Server error';

        setConfirmTitle('Error');
        setConfirmMessage(errorMessage);
        setConfirmShowSuccess(false);
        setConfirmConfirmText('Close');
        setConfirmAction(undefined);
        setConfirmOpen(true);

        setAvailableSubCategories([]);
      }
    }
  };

  const saveVariant = async () => {
    const newErrors: typeof errors = {};
    if (!form.categoryId) newErrors.categoryId = "Main category is required.";
    if (!form.subCategoryId) newErrors.subCategoryId = "Sub category is required.";
    if (!form.name.trim()) newErrors.name = "Variant name is required.";
    else if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(form.name)) newErrors.name = "Variant name must contain only letters.";
    else if (isDuplicateVariant(form.name, form.categoryId, form.subCategoryId, modalMode === 'edit' ? form.id : undefined)) {
      newErrors.name = "Food variant already exists.";
    }
    if (!form.price) newErrors.price = "Price is required.";
    else if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) newErrors.price = "Enter a valid price greater than 0.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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

    const parentCategory = categories.find(c => c.id === form.categoryId);
    const parentSub = availableSubCategories.find(s => String(s.id) === form.subCategoryId);
    const isParentInactive = (parentCategory && !isActiveValue(parentCategory.status)) ||
      (parentSub && !isActiveValue(parentSub.status));
    const finalStatus = isParentInactive ? 'Inactive' : form.status;

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('foodName', form.name); // Most likely backend field name
    formData.append('price', form.price);
    formData.append('status', String(finalStatus === 'Active'));
    formData.append('mainCategoryID', form.categoryId);
    formData.append('subCategoryID', form.subCategoryId);

    if (form.imageFile) {
      formData.append('image', form.imageFile);
    } else if (form.imageRemoved) {
      // Signal to backend that the image should be removed
      formData.append('removeImage', 'true');
    }

    try {
      if (modalMode === 'add') {
        // Pass formData instead of JSON object
        await addFoodVariant(form.categoryId, form.subCategoryId, formData);
      } else if (form.id) {
        // Use the same formData for update, which includes the image file if selected
        await updateFoodVariant(form.id, formData);
      }

      // consistent success popup
      closeModal();
      setConfirmTitle('Success');
      setConfirmMessage(modalMode === 'add' ? 'Created successfully' : 'Updated successfully');
      setConfirmShowSuccess(true);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
      setTimeout(() => setConfirmOpen(false), 1500);

      // Reset to page 1 after add so the new item is visible at the top
      if (modalMode === 'add') {
        setVarPage(1);
      }
      fetchAllVariants(); // Refresh data
    } catch (error: any) {
      const errorMessage = error.response?.data?.statusMessage ||
        error.response?.data?.data?.[0]?.message ||
        'Server error';

      setConfirmTitle('Error');
      setConfirmMessage(errorMessage);
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
    }
  };

  const deleteVariant = async (variantId: string) => {
    setConfirmTitle('Confirm Delete');
    setConfirmMessage('Delete this food variant?');
    setConfirmConfirmText('Delete');
    setConfirmShowSuccess(false);
    setConfirmAction(() => async () => {
      try {
        await deleteFoodVariant(variantId);
        setConfirmTitle('Success');
        setConfirmMessage('Deleted successfully');
        setConfirmShowSuccess(true);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
        setTimeout(() => setConfirmOpen(false), 1500);
        fetchAllVariants(); // Refresh data
      } catch (error: any) {
        const errorMessage = error.response?.data?.statusMessage ||
          error.response?.data?.data?.[0]?.message ||
          'Server error';

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
    <div className={styles.variantsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Food Variants</h2>
        <button className={styles.addBtn} onClick={openAdd}>
          + Add Food Variant
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        {/* Search Input */}
        <div className={styles.searchWrapper} style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Main Category Filter */}
        <select
          className={styles.select}
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterCategoryId}
          onChange={async e => {
            const catId = e.target.value;
            setFilterCategoryId(catId);
            setFilterSubCategoryId('');
            if (catId) {
              try {
                const res = await getSubCategoriesByMainCategory(Number(catId));
                if (res.data) {
                  setFilterSubCategories(res.data);
                } else {
                  setFilterSubCategories([]);
                }
              } catch {
                setFilterSubCategories([]);
              }
            } else {
              setFilterSubCategories([]);
            }
          }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Sub Category Filter */}
        <select
          className={styles.select}
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterSubCategoryId}
          onChange={e => setFilterSubCategoryId(e.target.value)}
          disabled={!filterCategoryId}
        >
          <option value="">All Sub Categories</option>
          {filterSubCategories.map(sub => (
            <option key={sub.id} value={String(sub.id)}>{sub.subCategoryName}</option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {(searchQuery || filterCategoryId || filterSubCategoryId) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterCategoryId('');
              setFilterSubCategoryId('');
              setFilterSubCategories([]);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Main Category</th>
              <th className={styles.th}>Sub Category</th>
              <th className={styles.th}>Variant Name</th>
              <th className={styles.th}>Price</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localPaginatedVariants.length === 0 ? (
              <tr><td colSpan={6} className={styles.emptyState}>
                {searchQuery || filterCategoryId || filterSubCategoryId
                  ? 'No food variants match your search/filter criteria'
                  : 'No food variants available'}
              </td></tr>
            ) : (
              localPaginatedVariants.map(v => (
                <tr key={v.id} className={styles.tr}>
                  <td className={styles.td}>{v.categoryName}</td>
                  <td className={styles.td}>{v.subCategoryName}</td>
                  <td className={styles.td}>{v.name}</td>
                  <td className={styles.td}>Rs. {v.price.toFixed(2)}</td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${v.status === 'Active' ? styles.active : styles.inactive}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => openEdit(v as VariantWithMeta)} title="Edit"><FiEdit size={20} aria-hidden="true" /></button>
                      <button className={styles.actionBtn} onClick={() => deleteVariant(v.id)} title="Delete"><MdDelete size={20} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {searchQuery || filterCategoryId || filterSubCategoryId
              ? `Showing ${filteredVariants.length} of ${allVariants.length} variant${allVariants.length === 1 ? '' : 's'}`
              : `Total: ${allVariants.length} variant${allVariants.length === 1 ? '' : 's'}`}
          </span>
          <Pagination currentPage={localPage} totalPages={filteredTotalPages} onPageChange={setLocalPage} />
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

      {/* Variant Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modalMode === 'add' ? 'Add' : 'Edit'} Food Variant</h2>
              <button className={styles.closeBtn} onClick={closeModal}>×</button>
            </div>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Main Category</label>
                {modalMode === 'edit' ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={form.categoryName}
                    disabled
                  />
                ) : (
                  <select
                    className={styles.select}
                    value={form.categoryId}
                    onChange={e => handleMainCategoryChange(e.target.value)}
                  >
                    <option value="">Select Main Category</option>
                    {categories
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                  </select>
                )}
                {errors.categoryId && (
                  <span style={{ color: '#c33', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {errors.categoryId}
                  </span>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sub Category</label>
                {modalMode === 'edit' ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={form.subCategoryName}
                    disabled
                  />
                ) : (
                  <select
                    className={styles.select}
                    value={form.subCategoryId}
                    onChange={e => setForm(prev => ({ ...prev, subCategoryId: e.target.value }))}
                    disabled={!form.categoryId}
                  >
                    <option value="">Select Sub Category</option>
                    {availableSubCategories.map(sub => (
                      <option key={sub.id} value={String(sub.id)}>{sub.subCategoryName}</option>
                    ))}
                  </select>
                )}
                {errors.subCategoryId && (
                  <span style={{ color: '#c33', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {errors.subCategoryId}
                  </span>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Variant Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter variant name"
                  value={form.name}
                  onChange={e => {
                    const newValue = e.target.value;
                    setForm(prev => ({ ...prev, name: newValue }));
                    // Real-time duplicate validation
                    validateVariantNameRealtime(newValue);
                  }}
                  onBlur={() => {
                    // Also validate on blur for complete coverage
                    validateVariantNameRealtime(form.name);
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
                <label className={styles.label}>Price (Rs.)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Enter price"
                  value={form.price}
                  onChange={e => {
                    setForm(prev => ({ ...prev, price: e.target.value }));
                    setErrors(prev => ({ ...prev, price: undefined }));
                  }}
                  style={errors.price ? { borderColor: '#c33' } : {}}
                  min="0"
                  step="0.01"
                />
                {errors.price && (
                  <span style={{ color: '#c33', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {errors.price}
                  </span>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                {(() => {
                  const parentCat = categories.find(c => c.id === form.categoryId);
                  const parentSub = availableSubCategories.find(s => String(s.id) === form.subCategoryId);
                  const isParentInactive = (parentCat && !isActiveValue(parentCat.status)) ||
                    (parentSub && !isActiveValue(parentSub.status));

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
                          Locked to Inactive because a parent Category or Sub Category is Inactive.
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Image</label>
                <input
                  type="file"
                  className={styles.fileInput}
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setForm(prev => ({ ...prev, imageFile: file, imageRemoved: false }));
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setForm(prev => ({ ...prev, image: event.target?.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  ref={fileInputRef}
                />
                {form.image && (
                  <div className={styles.imagePreview}>
                    <img src={form.image} alt="Preview" className={styles.previewImg} />
                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={() => {
                        setForm(prev => ({ ...prev, image: '', imageFile: null, imageRemoved: true }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                <button
                  className={styles.saveBtn}
                  onClick={saveVariant}
                  disabled={modalMode === 'edit' && !isDirty}
                  style={modalMode === 'edit' && !isDirty ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
