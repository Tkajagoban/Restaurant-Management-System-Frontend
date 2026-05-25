import { useState, useEffect, useMemo } from "react";
import styles from "../FoodContentManagement/FoodContentManagement.module.css";
import type {
  addTableRequest,
  UpdateTableRequest,
} from "../../../api/tableManagement/TableManagement.api";
import {
  getAllTables,
  deleteTable,
  createTable,
  updateTable,
} from "../../../api/tableManagement/TableManagement.api";
import { Pagination } from "../../molecules/Pagination/Pagination";
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import { SearchBar } from '../../molecules/SearchBar/SearchBar';
import { usePrivilege } from "../../../hooks/usePrivilege";

type Status = "Reserved" | "Unreserved";

interface TableItem {
  id: number;
  tableNumber: string;
  guestCount: number;
  status: Status;
}

function filterTables(list: TableItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(t => {
    const tableNum = String(t.tableNumber).toLowerCase();
    const status = t.status.toLowerCase();
    const guest = String(t.guestCount).toLowerCase();
    return tableNum.includes(q) || status.startsWith(q) || guest.includes(q);
  });
}

export default function TableManagement() {
  const { canWrite, canMaintain } = usePrivilege('Table Management');
  const [tables, setTables] = useState<TableItem[]>([]);
  const [, setError] = useState<string | null>(null);
  const [filteredTables, setFilteredTables] = useState<TableItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<any | null>(null);

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);

  const [form, setForm] = useState<Partial<TableItem>>({
    tableNumber: undefined,
    guestCount: undefined,
    status: "Unreserved",
  });

  // Inline field-level errors for the modal form
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTables, setTotalTables] = useState(0); // Total count for display
  const [allTables, setAllTables] = useState<TableItem[]>([]); // All tables for search filtering

  // Filter tables based on search query
  // When searching, filter from allTables; otherwise use current page data
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredTables(filterTables(allTables, searchQuery));
    } else {
      setFilteredTables(tables);
    }
  }, [tables, allTables, searchQuery]);

  //fetch tables api
  const fetchTables = async (page = 0) => {
    try {
      const response = await getAllTables(page, ITEMS_PER_PAGE);

      if (!response.data?.content) {
        console.error("No content array in response");
        return;
      }

      const fetchedTables: TableItem[] = response.data.content.map(
        (t: any) => ({
          id: Number(t.id),
          tableNumber: t.tableNumber,
          guestCount: t.guestCount,
          status: t.status ? "Reserved" : "Unreserved", // boolean → Status
        })
      );

      setTables(fetchedTables);
      setTotalPages(response.data.totalPages || 0);
      setTotalTables(response.data.totalElements || 0);
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  useEffect(() => {
    // Only fetch paginated data when not searching
    if (!searchQuery.trim()) {
      fetchTables(currentPage - 1);
    }
  }, [currentPage, searchQuery]);

  // Fetch all tables for search
  const fetchAllTables = async () => {
    try {
      const response = await getAllTables(0, 1000); // Fetch all tables for search

      if (!response.data?.content) {
        return;
      }

      const fetchedTables: TableItem[] = response.data.content.map(
        (t: any) => ({
          id: Number(t.id),
          tableNumber: t.tableNumber,
          guestCount: t.guestCount,
          status: t.status ? "Reserved" : "Unreserved",
        })
      );

      setAllTables(fetchedTables);
    } catch (error) {
      console.error("Error fetching all tables for search:", error);
    }
  };

  // Load all tables when search query becomes active
  useEffect(() => {
    if (searchQuery.trim()) {
      fetchAllTables();
      setCurrentPage(1);
    } else {
      setAllTables([]);
    }
  }, [searchQuery]);

  // Calculate display data with client-side pagination for search
  const isSearching = searchQuery.trim().length > 0;
  const searchTotalPages = isSearching ? Math.ceil(filteredTables.length / ITEMS_PER_PAGE) : totalPages;

  const displayData = useMemo(() => {
    if (!isSearching) return filteredTables;
    // Client-side pagination for search results
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredTables.slice(startIndex, endIndex);
  }, [filteredTables, currentPage, isSearching]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      tableNumber: undefined,
      guestCount: undefined,
      status: "Unreserved",
    });
    setFormErrors({}); // Clear any previous errors
    setIsModalOpen(true);
  };

  const openEdit = (t: TableItem) => {
    setEditingId(t.id);
    setForm({ ...t });
    setFormErrors({}); // Clear any previous errors
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  /**
   * Normalize table number for duplicate comparison.
   * Trims whitespace and converts to lowercase.
   */
  const normalizeTableNumber = (num: string): string => {
    return num.toString().trim().toLowerCase();
  };

  /**
   * Check if a table number already exists (normalized comparison).
   * For edit mode, excludes the current table being edited.
   */
  const isDuplicateTableNumber = (tableNum: string, excludeId?: number): boolean => {
    const normalizedInput = normalizeTableNumber(tableNum);
    return tables.some(table => {
      // Skip the table being edited
      if (excludeId && table.id === excludeId) return false;
      return normalizeTableNumber(table.tableNumber) === normalizedInput;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const trimmedTableNumber = form.tableNumber?.toString().trim() || '';

    if (!trimmedTableNumber) {
      errors.tableNumber = 'Table Number is required';
    } else if (!/^T\d{3}$/.test(trimmedTableNumber)) {
      errors.tableNumber = 'Table number must be in T001 format.';
    } else if (isDuplicateTableNumber(trimmedTableNumber, editingId || undefined)) {
      errors.tableNumber = 'Table Number already exists.';
    }

    if (form.guestCount === undefined || form.guestCount === null || form.guestCount < 1) {
      errors.guestCount = 'Guest Count is required and must be at least 1';
    } else if (form.guestCount > 100) {
      errors.guestCount = 'Guest count cannot exceed 100.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Real-time validation for Table Number field.
   * Called on every keystroke to provide immediate feedback.
   * Valid format: T followed by exactly 3 digits (e.g., T001, T010, T100)
   */
  const validateTableNumberRealtime = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      // Don't show error for empty field while typing (only on submit)
      setFormErrors(prev => ({ ...prev, tableNumber: '' }));
      return;
    }

    // Check if it matches T001 format (T + exactly 3 digits)
    if (!/^T\d{3}$/.test(trimmed)) {
      setFormErrors(prev => ({ ...prev, tableNumber: 'Table number must be in T001 format.' }));
      return;
    }

    // Check for duplicates
    if (isDuplicateTableNumber(trimmed, editingId || undefined)) {
      setFormErrors(prev => ({ ...prev, tableNumber: 'Table Number already exists.' }));
    } else {
      setFormErrors(prev => ({ ...prev, tableNumber: '' }));
    }
  };

  /**
   * Real-time validation for Guest Count field.
   * Called on every keystroke to provide immediate feedback.
   */
  const validateGuestCountRealtime = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      // Don't show error for empty field while typing (only on submit)
      setFormErrors(prev => ({ ...prev, guestCount: '' }));
      return;
    }

    const numValue = Number(trimmed);

    // Check if it's a valid positive integer
    if (isNaN(numValue) || !Number.isInteger(numValue)) {
      setFormErrors(prev => ({ ...prev, guestCount: 'Guest Count must be a valid number.' }));
      return;
    }

    // Check if value is at least 1
    if (numValue < 1) {
      setFormErrors(prev => ({ ...prev, guestCount: 'Guest Count must be at least 1.' }));
    } else if (numValue > 100) {
      // Check if value exceeds maximum capacity
      setFormErrors(prev => ({ ...prev, guestCount: 'Guest count cannot exceed 100.' }));
    } else {
      setFormErrors(prev => ({ ...prev, guestCount: '' }));
    }
  };

  //handle save api
  const handleSave = async () => {
    if (!validateForm()) return; // Popup stays open if validation fails

    const payload: addTableRequest = {
      tableNumber: form.tableNumber!,
      guestCount: form.guestCount!,
      status: form.status === "Reserved",
    };

    try {
      const response = await createTable(payload);
      console.log({ response });

      // Close modal ONLY on success
      closeModal();
      setFormErrors({});

      // Show success popup
      setConfirmTitle('Success');
      setConfirmMessage('Created successfully');
      setConfirmShowSuccess(true);
      setConfirmAction(undefined);
      setConfirmConfirmText('OK');
      setConfirmOpen(true);

      await fetchTables(currentPage - 1);
      setError(response.data.statusMessage);
    } catch (err: any) {
      console.error("API Error:", err);

      const backendMessage =
        err?.response?.data?.data?.[0]?.message ||
        err?.response?.data?.statusMessage ||
        "Something went wrong";

      setError(backendMessage);

      // Show inline error for Table Number field (common validation error from backend)
      setFormErrors({ tableNumber: backendMessage });
      // Keep popup open - do NOT close modal on error
    }
  };

  //handle update api
  const handleUpdate = async () => {
    if (!validateForm()) return; // Popup stays open if validation fails

    const payload: UpdateTableRequest = {
      tableNumber: form.tableNumber!,
      guestCount: form.guestCount!,
      status: form.status === "Reserved",
    };

    try {
      await updateTable(editingId, payload);

      // Close modal ONLY on success
      closeModal();
      setFormErrors({});

      // Success popup
      setConfirmTitle('Success');
      setConfirmMessage('Updated successfully');
      setConfirmShowSuccess(true);
      setConfirmAction(undefined);
      setConfirmConfirmText('OK');
      setConfirmOpen(true);

      await fetchTables(currentPage - 1);
      setError(null);
    } catch (err: any) {
      console.error("Error updating table:", err);

      const backendMessage =
        err?.response?.data?.data?.[0]?.message ||
        err?.response?.data?.statusMessage ||
        "Update failed";

      setError(backendMessage);

      // Show inline error
      setFormErrors({ tableNumber: backendMessage });
      // Keep popup open - do NOT close modal on error
    }
  };

  //handle delete api
  const handleDelete = async (id: number) => {
    try {
      await deleteTable(id);

      // show success inside confirm modal
      setConfirmMessage('Deleted successfully');
      setConfirmTitle('Success');
      setConfirmShowSuccess(true);

      await fetchTables(currentPage - 1);
    } catch (err: any) {
      console.error("Error deleting table:", err);
      const backend = err?.response?.data?.statusMessage || err?.message || 'Delete failed';

      setConfirmTitle('Error');
      setConfirmMessage(backend);
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Table Management</h1>
            <p className={styles.pageSubtitle}>
              Manage table numbers and seating configuration
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.95rem', color: '#666', fontWeight: 500 }}>
              Total Tables: {isSearching ? filteredTables.length : totalTables}
            </span>
            <button className={styles.addBtn} onClick={openAdd} disabled={!canWrite} style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}>
              + Add Table
            </button>
          </div>
        </div>
        <div className={styles.toolbar}>
          <SearchBar placeholder="Search by table number, status, or guest count..." onSearch={(val) => { setSearchQuery(val); }} />
        </div>
        <div className={styles.section}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Table Number</th>
                  <th className={styles.th}>Guest Count</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayData.length === 0 ? (
                  <tr><td colSpan={4} className={styles.emptyState}>{searchQuery ? `No tables match "${searchQuery}"` : 'No tables available'}</td></tr>
                ) : (
                  displayData.map((t) => (
                    <tr key={t.id} className={styles.tr}>
                      <td className={styles.td}>{t.tableNumber}</td>
                      <td className={styles.td}>{t.guestCount}</td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.statusBadge} ${t.status === "Reserved"
                            ? styles.active
                            : styles.inactive
                            }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => openEdit(t)}
                            title="Edit"
                            disabled={!canWrite}
                            style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}
                          >
                            <FiEdit size={20} aria-hidden="true" />
                          </button>
                          <button
                            className={styles.actionBtn}
                            onClick={() => {
                              setConfirmTitle('Confirm Delete');
                              setConfirmMessage('Are you sure you want to delete this table?');
                              setConfirmConfirmText('Delete');
                              setConfirmShowSuccess(false);
                              setConfirmAction(() => async () => {
                                try {
                                  await handleDelete(t.id);
                                } catch (e) {
                                  throw e;
                                }
                              });

                              setConfirmOpen(true);
                            }}
                            title="Delete"
                            disabled={!canMaintain}
                            style={{ opacity: !canMaintain ? 0.5 : 1, pointerEvents: !canMaintain ? 'none' : 'auto' }}
                          >
                            <MdDelete size={20} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {searchTotalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={searchTotalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {editingId ? "Edit" : "Add"} Table
                </h2>
                <button className={styles.closeBtn} onClick={closeModal}>
                  ×
                </button>
              </div>

              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Table Number</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="T001"
                    value={form.tableNumber ?? ""}
                    disabled={!!editingId}
                    onChange={(e) => {
                      const newValue = e.target.value.toUpperCase();
                      setForm((prev) => ({
                        ...prev,
                        tableNumber: newValue,
                      }));
                      // Real-time validation while typing
                      validateTableNumberRealtime(newValue);
                    }}
                    style={formErrors.tableNumber ? { borderColor: '#ef4444' } : undefined}
                  />
                  {formErrors.tableNumber && (
                    <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      {formErrors.tableNumber}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Guest Count</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    value={form.guestCount ?? ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        guestCount: newValue === '' ? undefined : Number(newValue),
                      }));
                      // Real-time validation while typing
                      validateGuestCountRealtime(newValue);
                    }}
                    style={formErrors.guestCount ? { borderColor: '#ef4444' } : undefined}
                  />
                  {formErrors.guestCount && (
                    <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      {formErrors.guestCount}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as Status,
                      }))
                    }
                  >
                    <option value="Reserved">Reserved</option>
                    <option value="Unreserved">Unreserved</option>
                  </select>
                </div>

                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={editingId ? handleUpdate : handleSave}
                  >
                    {editingId ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
}
