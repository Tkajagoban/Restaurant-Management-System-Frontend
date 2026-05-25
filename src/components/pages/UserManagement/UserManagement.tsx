import React, { useState, useMemo, useEffect } from 'react';
import { validatePhoneNumber, sanitizePhoneInput } from '../../../utils/phoneValidation';
import { Button } from '../../atoms/Button/Button';
import { Label } from '../../atoms/Label/Label';
import { SearchBar } from '../../molecules/SearchBar/SearchBar';
import { Pagination } from '../../molecules/Pagination/Pagination';
import { FormField } from '../../molecules/FormField/FormField';
import { usePrivilege } from '../../../hooks/usePrivilege';
import { DataTable, type Column } from '../../organisms/DataTable/DataTable';
import { Modal } from '../../organisms/Modal/Modal';
import styles from './UserManagement.module.css';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { FiEdit } from 'react-icons/fi';
import { MdDelete, MdDialpad } from 'react-icons/md';

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  type User as ApiUser,
  type UserRequest,
  type UserSearchParams
} from '../../../api/userManagement/UserManagement.api.ts';
import { getAllRoles } from '../../../api/roleManagement/RoleManagement.api';
import { sendEmailUpdateOtp, verifyEmailUpdateOtp } from '../../../api/userManagement/emailUpdateOtp.api';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  nic: string;
  roleId: number;
  roleName: string;
}

const RESTAURANT_ID = 1;
const ITEMS_PER_PAGE = 5;

function UserManagement() {
  const { canWrite, canMaintain } = usePrivilege('User Management');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]); // All users for search filtering
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    nic: '',
    roleId: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
  const [confirmConfirmText, setConfirmConfirmText] = useState('Confirm');

  // OTP email update state
  const [originalEmail, setOriginalEmail] = useState('');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingUserRequest, setPendingUserRequest] = useState<UserRequest | null>(null);


  // Load roles and all users on mount
  useEffect(() => {
    loadRoles();
    loadUsers();
    loadAllUsers(); // Load all users once on mount for search filtering
  }, []);


  useEffect(() => {
    // Only fetch paginated data when not searching
    if (!searchQuery.trim()) {
      loadUsers(currentPage - 1);
    }
  }, [currentPage, searchQuery]);

  const loadRoles = async () => {
    try {
      const response = await getAllRoles(RESTAURANT_ID.toString());
      console.log('Loaded roles:', response);
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([]);
    }
  };

  const loadUsers = async (page = 0) => {
    setTableLoading(true);
    try {
      const params: UserSearchParams = {
        page,
        size: ITEMS_PER_PAGE,
        restaurantId: RESTAURANT_ID,
        sort: 'id,desc' // Sort by newest first (highest ID)
      };

      const response = await getUsers(RESTAURANT_ID, params);

      if (response && response.data) {
        const apiUsers = response.data.content.map((apiUser: ApiUser) => ({
          id: apiUser.id,
          firstName: apiUser.firstName,
          lastName: apiUser.lastName,
          email: apiUser.email,
          phoneNumber: apiUser.phoneNumber || '',
          address: apiUser.address,
          city: apiUser.city,
          nic: apiUser.nic,
          roleId: apiUser.roleId,
          roleName: apiUser.roleName || ''
        }));

        // Sort by ID descending (newest first) as a fallback in case backend doesn't sort
        apiUsers.sort((a: User, b: User) => b.id - a.id);

        setUsers(apiUsers);
        setTotalPages(response.data.totalPages);
        setTotalUsers(response.data.totalElements);

        if (apiUsers.length === 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      const err = error as { response?: { data?: { statusMessage?: string } }, message?: string };
      setConfirmTitle('Error');
      setConfirmMessage(`Failed to load users: ${err.response?.data?.statusMessage || err.message}`);
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
    } finally {
      setTableLoading(false);
    }
  };

  const getRoleName = (id: string) => {
    const roleId = parseInt(id, 10);
    const role = roles.find(r => r.id === roleId);
    return role?.roleName || 'N/A';
  };

  // Fetch all users for search (called when search query changes)
  const loadAllUsers = async () => {
    setTableLoading(true);
    try {
      const params: UserSearchParams = {
        page: 0,
        size: 1000, // Fetch all users for client-side filtering
        restaurantId: RESTAURANT_ID,
        sort: 'id,desc'
      };

      const response = await getUsers(RESTAURANT_ID, params);

      if (response && response.data) {
        const apiUsers = response.data.content.map((apiUser: ApiUser) => ({
          id: apiUser.id,
          firstName: apiUser.firstName,
          lastName: apiUser.lastName,
          email: apiUser.email,
          phoneNumber: apiUser.phoneNumber || '',
          address: apiUser.address,
          city: apiUser.city,
          nic: apiUser.nic,
          roleId: apiUser.roleId,
          roleName: apiUser.roleName || ''
        }));

        apiUsers.sort((a: User, b: User) => b.id - a.id);
        setAllUsers(apiUsers);
      }
    } catch (error) {
      console.error('Error loading all users for search:', error);
    } finally {
      setTableLoading(false);
    }
  };

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setCurrentPage(1); // Reset to page 1 when searching
    }
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return allUsers.filter(u =>
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.phoneNumber && u.phoneNumber.toLowerCase().includes(query))
    );
  }, [users, allUsers, searchQuery]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First Name is required';
    else if (!/^[A-Za-z]+$/.test(formData.firstName)) newErrors.firstName = 'Only letters allowed';

    if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required';
    else if (!/^[A-Za-z]+$/.test(formData.lastName)) newErrors.lastName = 'Only letters allowed';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone number validation using centralized utility
    const phoneValidation = validatePhoneNumber(formData.phoneNumber, false);
    if (!phoneValidation.isValid && phoneValidation.error) {
      newErrors.phoneNumber = phoneValidation.error;
    }

    if (!formData.address.trim()) newErrors.address = 'Address is required';

    if (!formData.city.trim()) newErrors.city = 'City is required';
    else if (!/^[A-Za-z ]+$/.test(formData.city)) newErrors.city = 'Only letters and spaces allowed';

    if (!formData.nic.trim()) newErrors.nic = 'NIC is required';
    else if (!/^\d{9}[VvXx]|\d{12}$/.test(formData.nic)) {
      newErrors.nic = 'Invalid NIC format (123456789V or 200012345678)';
    }

    if (!formData.roleId) newErrors.roleId = 'Role is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const roleId = Number(formData.roleId);

      const userRequest: UserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        nic: formData.nic,
        roleId: roleId,
        restaurantId: RESTAURANT_ID
      };

      if (editingId) {
        // Check if email has changed
        const emailChanged = formData.email.toLowerCase() !== originalEmail.toLowerCase();

        if (emailChanged) {
          // Email changed - need OTP verification
          try {
            await sendEmailUpdateOtp(editingId, formData.email);
            // Store the pending update request and show OTP modal
            setPendingUserRequest(userRequest);
            setIsOtpModalOpen(true);
            setOtpValue('');
            setOtpError('');
            setLoading(false);
            return; // Exit early - will continue after OTP verification
          } catch (otpError: any) {
            console.error('Error sending OTP:', otpError);
            setConfirmTitle('Error');
            setConfirmMessage(otpError.response?.data?.statusMessage || 'Failed to send OTP to new email');
            setConfirmShowSuccess(false);
            setConfirmConfirmText('OK');
            setConfirmAction(undefined);
            setConfirmOpen(true);
            setLoading(false);
            return;
          }
        }

        // Email not changed - proceed with normal update
        const response = await updateUser(editingId, userRequest);

        if (response && response.data) {
          const updatedUser: User = {
            id: response.data.id,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            email: response.data.email,
            phoneNumber: response.data.phoneNumber || '',
            address: response.data.address,
            city: response.data.city,
            nic: response.data.nic,
            roleId: response.data.roleId,
            roleName: response.data.roleName || getRoleName(formData.roleId)
          };

          setUsers(prev => prev.map(u =>
            u.id === editingId ? updatedUser : u
          ));

          // success popup
          setConfirmTitle('Success');
          setConfirmMessage('Updated successfully');
          setConfirmShowSuccess(true);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
        }
      } else {

        const response = await createUser(userRequest, RESTAURANT_ID, roleId);

        if (response && response.data) {
          const newUser: User = {
            id: response.data.id,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            email: response.data.email,
            phoneNumber: response.data.phoneNumber || '',
            address: response.data.address,
            city: response.data.city,
            nic: response.data.nic,
            roleId: response.data.roleId,
            roleName: response.data.roleName || getRoleName(formData.roleId)
          };


          setUsers(prev => [newUser, ...prev]);
          setTotalUsers(prev => prev + 1);

          // success popup
          setConfirmTitle('Success');
          setConfirmMessage('Created successfully');
          setConfirmShowSuccess(true);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);
        }
      }

      closeModal();

      loadUsers(currentPage - 1);
      loadAllUsers(); // Refresh search cache

    } catch (error) {
      console.error('Error saving user:', error);
      const err = error as { response?: { data?: { statusMessage?: string } }, message?: string };

      if (err.response?.data) {
        setConfirmTitle('Error');
        setConfirmMessage(err.response.data.statusMessage || err.message || 'Failed to save user. Please try again.');
        setConfirmShowSuccess(false);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
      } else if (err.message) {
        setConfirmTitle('Error');
        setConfirmMessage(err.message);
        setConfirmShowSuccess(false);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
      } else {
        setConfirmTitle('Error');
        setConfirmMessage('Failed to save user. Please try again.');
        setConfirmShowSuccess(false);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      nic: '',
      roleId: ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = async (user: User) => {
    setLoading(true);
    try {

      const response = await getUserById(user.id);

      if (response && response.data) {
        setEditingId(response.data.id);
        setOriginalEmail(response.data.email); // Store original email for comparison
        setFormData({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          phoneNumber: response.data.phoneNumber || '',
          address: response.data.address,
          city: response.data.city,
          nic: response.data.nic,
          roleId: response.data.roleId.toString()
        });
        setErrors({});
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading user for edit:', error);
      setConfirmTitle('Error');
      setConfirmMessage('Failed to load user details');
      setConfirmShowSuccess(false);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);

      setEditingId(user.id);
      setOriginalEmail(user.email); // Store original email for comparison
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        address: user.address,
        city: user.city,
        nic: user.nic,
        roleId: user.roleId.toString()
      });
      setErrors({});
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    // open confirm modal
    setConfirmTitle('Confirm Delete');
    setConfirmMessage('Are you sure you want to delete this user?');
    setConfirmConfirmText('Delete');
    setConfirmShowSuccess(false);
    setConfirmAction(() => async () => {
      try {
        const response = await deleteUser(id);

        // Relaxed check: if we got a response and it didn't throw, it's likely successful.
        if (response && (response.statusCode === 200 || response.statusCode === 204)) {
          // success popup
          setConfirmTitle('Success');
          setConfirmMessage('Deleted successfully');
          setConfirmShowSuccess(true);
          setConfirmConfirmText('OK');
          setConfirmAction(undefined);
          setConfirmOpen(true);

          // Calculate new pagination state
          const newTotalUsers = totalUsers - 1;
          const newTotalPages = Math.ceil(newTotalUsers / ITEMS_PER_PAGE);

          let newPage = currentPage;
          if (currentPage > newTotalPages && newTotalPages > 0) {
            newPage = newTotalPages;
            setCurrentPage(newPage);
          }

          setTotalUsers(newTotalUsers);

          // Refresh the list
          await loadUsers(newPage - 1);
          loadAllUsers(); // Refresh search cache


        } else {
          console.warn('Delete returned unexpected status:', response?.statusCode);
          await loadUsers(currentPage - 1);
          loadAllUsers(); // Refresh search cache
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        const err = error as { response?: { data?: { statusMessage?: string } } };
        setConfirmTitle('Error');
        setConfirmMessage(err.response?.data?.statusMessage || 'Failed to delete user. Please try again.');
        setConfirmShowSuccess(false);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
      }
    });

    setConfirmOpen(true);
  };





  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setErrors({});
    setOriginalEmail('');
  };

  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
    setOtpValue('');
    setOtpError('');
    setPendingUserRequest(null);
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!editingId || !pendingUserRequest) {
      setOtpError('Missing user data');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      // Verify OTP - this will also update the email in the backend
      await verifyEmailUpdateOtp(editingId, formData.email, otpValue);

      // Now update the rest of the user data (with original email since backend already updated it)
      const updateRequest = { ...pendingUserRequest, email: formData.email };
      const response = await updateUser(editingId, updateRequest);

      if (response && response.data) {
        const updatedUser: User = {
          id: response.data.id,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          phoneNumber: response.data.phoneNumber || '',
          address: response.data.address,
          city: response.data.city,
          nic: response.data.nic,
          roleId: response.data.roleId,
          roleName: response.data.roleName || getRoleName(formData.roleId)
        };

        setUsers(prev => prev.map(u =>
          u.id === editingId ? updatedUser : u
        ));

        closeOtpModal();
        closeModal();
        loadUsers(currentPage - 1);

        // success popup
        setConfirmTitle('Success');
        setConfirmMessage('Email verified and user updated successfully');
        setConfirmShowSuccess(true);
        setConfirmConfirmText('OK');
        setConfirmAction(undefined);
        setConfirmOpen(true);
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setOtpError(error.response?.data?.statusMessage || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!editingId) return;

    setOtpLoading(true);
    setOtpError('');

    try {
      await sendEmailUpdateOtp(editingId, formData.email);
      setOtpError(''); // Clear any previous error
      setConfirmTitle('Success');
      setConfirmMessage('OTP resent to ' + formData.email);
      setConfirmShowSuccess(true);
      setConfirmConfirmText('OK');
      setConfirmAction(undefined);
      setConfirmOpen(true);
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      setOtpError(error.response?.data?.statusMessage || 'Failed to resend OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns: Column<User>[] = [
    {
      header: 'First Name',
      accessor: (u) => <span className={styles.name}>{u.firstName}</span>
    },
    { header: 'Last Name', accessor: 'lastName' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone Number', accessor: 'phoneNumber' },
    {
      header: 'Role',
      accessor: (u) => u.roleName || getRoleName(u.roleId.toString())
    },
    {
      header: 'Actions',
      accessor: (u) => (
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            title="Edit"
            onClick={() => openEditModal(u)}
            disabled={loading || tableLoading || !canWrite}
            style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}
          >
            <FiEdit size={20} aria-hidden="true" />
          </button>
          <button
            className={styles.actionBtn}
            title="Delete"
            onClick={() => handleDelete(u.id)}
            disabled={loading || tableLoading || !canMaintain}
            style={{ opacity: !canMaintain ? 0.5 : 1, pointerEvents: !canMaintain ? 'none' : 'auto' }}
          >
            <MdDelete size={20} aria-hidden="true" />
          </button>
        </div>
      )
    },
  ];

  // Data is already paginated by the API when not searching.
  // When searching, we paginate the filtered results client-side.
  const isSearching = searchQuery.trim().length > 0;

  // Calculate paginated display data
  const paginatedFilteredData = useMemo(() => {
    if (!isSearching) return filteredData;

    // Client-side pagination for search results
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, isSearching]);

  const displayData = paginatedFilteredData;

  // Calculate total pages for search results or use API's total pages
  const searchTotalPages = isSearching ? Math.ceil(filteredData.length / ITEMS_PER_PAGE) : totalPages;
  const showPagination = searchTotalPages > 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
        <div className={styles.headerRight}>
          <div className={styles.totalUsers}>
            Total Users: {totalUsers}
          </div>
          <Button
            onClick={openAddModal}
            disabled={loading || tableLoading || !canWrite}
            style={{ opacity: !canWrite ? 0.5 : 1, pointerEvents: !canWrite ? 'none' : 'auto' }}
          >
            {loading ? 'Loading...' : '+ Add User'}
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <SearchBar
          placeholder="Search by name, email, or phone..."
          onSearch={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {tableLoading ? (
        <div className={styles.loading}>
          Loading users...
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={displayData}
            keyExtractor={(u) => u.id.toString()}
          />

          {showPagination && (
            <Pagination
              currentPage={currentPage}
              totalPages={searchTotalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <FormField
              label="First Name"
              name="firstName"
              required
              value={formData.firstName}
              onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
              error={errors.firstName}
              disabled={loading}
              placeholder=""
            />
            <FormField
              label="Last Name"
              name="lastName"
              required
              value={formData.lastName}
              onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
              error={errors.lastName}
              disabled={loading}
              placeholder=""
            />
          </div>

          <div className={styles.formRow}>
            <FormField
              label="Email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              error={errors.email}
              disabled={loading}
            />
            <FormField
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => {
                const sanitized = sanitizePhoneInput(e.target.value);
                setFormData(p => ({ ...p, phoneNumber: sanitized }));
                // Real-time validation
                const validation = validatePhoneNumber(sanitized, false);
                if (validation.error) {
                  setErrors(prev => ({ ...prev, phoneNumber: validation.error! }));
                } else {
                  setErrors(prev => {
                    const { phoneNumber, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              onBlur={() => {
                // Validate on blur as well
                const validation = validatePhoneNumber(formData.phoneNumber, false);
                if (validation.error) {
                  setErrors(prev => ({ ...prev, phoneNumber: validation.error! }));
                }
              }}
              error={errors.phoneNumber}
              disabled={loading}
              placeholder="Enter 8-15 digits only"
            />
          </div>

          <FormField
            label="Address"
            name="address"
            required
            value={formData.address}
            onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
            error={errors.address}
            disabled={loading}
          />

          <div className={styles.formRow}>
            <FormField
              label="City"
              name="city"
              required
              value={formData.city}
              onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
              error={errors.city}
              disabled={loading}
              placeholder=""
            />
            <FormField
              label="NIC"
              name="nic"
              required
              value={formData.nic}
              onChange={(e) => setFormData(p => ({ ...p, nic: e.target.value }))}
              error={errors.nic}
              disabled={loading}
              placeholder="Format: 123456789V or 200012345678"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <Label>Select Role *</Label>
              <select
                className={`${styles.select} ${errors.roleId ? styles.error : ''}`}
                value={formData.roleId}
                onChange={(e) => setFormData(p => ({ ...p, roleId: e.target.value }))}
                disabled={loading}
                required
              >
                <option value="">-- Choose a Role --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.roleName}
                  </option>
                ))}
              </select>
              {errors.roleId && (
                <div className={styles.errorText}>{errors.roleId}</div>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : editingId ? 'Update' : 'Save'}
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

      {/* OTP Verification Modal for Email Change */}
      <Modal
        isOpen={isOtpModalOpen}
        onClose={closeOtpModal}
        title="Verify Email Change"
      >
        <div className={styles.form}>
          <p style={{ marginBottom: '1rem', textAlign: 'center' }}>
            A 6-digit OTP has been sent to <strong>{formData.email}</strong>
          </p>

          <div className={styles.formField}>
            <Label>Enter OTP *</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MdDialpad size={20} style={{ color: '#888' }} />
              <input
                type="text"
                className={styles.select}
                placeholder="Enter 6-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={otpLoading}
                style={{ fontSize: '1.2rem', letterSpacing: '0.5rem', textAlign: 'center' }}
              />
            </div>
            {otpError && (
              <div className={styles.errorText}>{otpError}</div>
            )}
          </div>

          <div className={styles.formActions} style={{ marginTop: '1.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={closeOtpModal}
              disabled={otpLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResendOtp}
              disabled={otpLoading}
            >
              Resend OTP
            </Button>
            <Button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpValue.length !== 6}
            >
              {otpLoading ? 'Verifying...' : 'Verify & Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UserManagement;