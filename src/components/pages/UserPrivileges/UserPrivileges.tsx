import { useState, useEffect } from 'react';
import styles from './UserPrivileges.module.css';
import { getRestaurant, type Restaurant } from '../../../api/restaurantManagement/RestaurantManagement.api';
import { getAllRoles, type Role } from '../../../api/roleManagement/RoleManagement.api';
import { getUsers, type User } from '../../../api/userManagement/UserManagement.api';
import { getUserPrivileges, getAllRestaurantPrivileges, updateUserPrivilege } from '../../../api/userPrivileges/UserPrivileges.api';
import { Modal } from '../../organisms/Modal/Modal';
import { Button } from '../../atoms/Button/Button';
import { usePrivilege } from '../../../hooks/usePrivilege';

interface PrivilegeAssignment {
    id: number; // restaurantPrivilegeId
    userPrivilegeId?: number; // actual record ID in user_privilege table
    name: string;
    read: boolean;
    write: boolean;
    maintain: boolean;
}

function UserPrivileges() {
    const { canWrite } = usePrivilege('User Privilege');
    // Dropdown Data
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Selection State
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Page State
    const [loading, setLoading] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [privileges, setPrivileges] = useState<PrivilegeAssignment[]>([]);
    const [availablePrivileges, setAvailablePrivileges] = useState<PrivilegeAssignment[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);

    // 1. Fetch Restaurants on Mount
    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const response = await getRestaurant();
                if (response.statusCode === 2000) {
                    setRestaurants(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch restaurants:', error);
            }
        };
        fetchRestaurants();
    }, []);

    // 2. Fetch Roles and Available Privileges when Restaurant Changes
    useEffect(() => {
        setRoles([]);
        setUsers([]);
        setSelectedRoleId('');
        setSelectedUserId('');
        setPrivileges([]);
        setAvailablePrivileges([]);

        if (!selectedRestaurantId) return;

        const fetchData = async () => {
            try {
                // Fetch Roles
                const rolesRes = await getAllRoles(selectedRestaurantId);
                if (rolesRes.statusCode === 2000) {
                    setRoles(rolesRes.data);
                }

                // Fetch Available Restaurant Privileges
                const privRes = await getAllRestaurantPrivileges(parseInt(selectedRestaurantId));
                if (privRes.statusCode === 2008 && privRes.data?.content) {
                    const mapped: PrivilegeAssignment[] = privRes.data.content.map(p => ({
                        id: p.id,
                        name: p.privilege_name,
                        read: false,
                        write: false,
                        maintain: false
                    }));
                    setAvailablePrivileges(mapped);
                }
            } catch (error) {
                console.error('Failed to fetch restaurant data:', error);
            }
        };
        fetchData();
    }, [selectedRestaurantId]);

    // 3. Fetch Users when Role Changes
    useEffect(() => {
        setUsers([]);
        setSelectedUserId('');
        setPrivileges([]);

        if (!selectedRestaurantId || !selectedRoleId) return;

        const fetchUsers = async () => {
            try {
                const response = await getUsers(parseInt(selectedRestaurantId), {
                    roleId: parseInt(selectedRoleId),
                    size: 100
                });

                if (response.statusCode === 2000 && response.data?.content) {
                    setUsers(response.data.content);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, [selectedRestaurantId, selectedRoleId]);

    // 4. Fetch User Specific Privileges when User Changes
    useEffect(() => {
        setPrivileges([]);
        setHasChanges(false);

        if (!selectedUserId) return;

        const fetchUserPrivs = async () => {
            setLoading(true);
            try {
                const response = await getUserPrivileges(parseInt(selectedUserId));

                if (response.statusCode === 2008 && response.data?.userPrivileges) {
                    const userPrivsMap = response.data.userPrivileges;

                    // Merge available privileges with user-specific statuses
                    const merged = availablePrivileges.map(ap => {
                        const userPriv = userPrivsMap[ap.name];
                        if (userPriv) {
                            return {
                                ...ap,
                                userPrivilegeId: userPriv.userPrivilegeId,
                                read: userPriv.privilegeStatus === 'READ',
                                write: userPriv.privilegeStatus === 'WRITE',
                                maintain: userPriv.privilegeStatus === 'MAINTAIN'
                            };
                        }
                        return ap;
                    });
                    setPrivileges(merged);
                } else {
                    // If no specific privileges found, show all available as unchecked
                    setPrivileges(availablePrivileges);
                }
            } catch (error) {
                console.error('Failed to fetch user privileges:', error);
                setPrivileges(availablePrivileges);
            } finally {
                setLoading(false);
            }
        };
        fetchUserPrivs();
    }, [selectedUserId, availablePrivileges]);

    const handleToggle = (id: number, permission: 'read' | 'write' | 'maintain') => {
        setPrivileges(prev => prev.map(p => {
            if (p.id === id) {
                const newValue = !p[permission];
                return {
                    ...p,
                    read: permission === 'read' ? newValue : false,
                    write: permission === 'write' ? newValue : false,
                    maintain: permission === 'maintain' ? newValue : false
                };
            }
            return p;
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!selectedUserId) return;

        setSaving(true);
        try {
            // Only update privileges that have actually changed or were newly assigned
            // We compare current state with what we fetched (can be optimized if we keep initial state)
            const promises = privileges.map(p => {
                let status = 'NONE';
                if (p.maintain) status = 'MAINTAIN';
                else if (p.write) status = 'WRITE';
                else if (p.read) status = 'READ';

                const payload = {
                    privilegeStatus: status,
                    restaurantPrivilegeId: p.id,
                    userId: parseInt(selectedUserId)
                };

                return updateUserPrivilege(parseInt(selectedUserId), payload, p.userPrivilegeId);
            });

            const results = await Promise.all(promises);

            // Check if all internal status codes are success (2000 or 2008)
            const failed = results.filter(r => r.statusCode !== 2000 && r.statusCode !== 2008 && r.statusCode !== 200);

            if (failed.length > 0) {
                console.error('Some privilege updates failed:', failed);
                throw new Error('Some updates were not successful');
            }

            setSuccessMessage('User privileges saved successfully.');
            setIsSuccessModalOpen(true);
            setHasChanges(false);
        } catch (error: any) {
            console.error('Failed to save privileges:', error);
            const msg = error.response?.data?.statusMessage || error.message || 'Unknown error';
            setErrorMessage(`Failed to save user privileges: ${msg}`);
            setIsErrorModalOpen(true);
        } finally {
            setSaving(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setIsSuccessModalOpen(false);
    };

    const handleCloseErrorModal = () => {
        setIsErrorModalOpen(false);
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>User Privilege</h1>
                    <p className={styles.subtitle}>Assign and manage permissions for individual users.</p>
                </div>

                <div className={styles.mainActions}>
                    <div className={styles.selectWrapper}>
                        <label className={styles.selectLabel}>Select Restaurant</label>
                        <select
                            className={styles.selectInput}
                            value={selectedRestaurantId}
                            onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        >
                            <option value="" disabled>Select Restaurant</option>
                            {restaurants.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.selectWrapper}>
                        <label className={styles.selectLabel}>Select Role</label>
                        <select
                            className={styles.selectInput}
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            disabled={!selectedRestaurantId}
                        >
                            <option value="" disabled>Select Role</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.roleName}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.selectWrapper}>
                        <label className={styles.selectLabel}>Select User</label>
                        <select
                            className={styles.selectInput}
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={!selectedRoleId}
                        >
                            <option value="" disabled>Select User</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.saveBar}>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges || saving || !canWrite}
                        >
                            {saving ? 'Saving...' : 'Save Selection'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Section - Only show when restaurant is selected */}
            {selectedRestaurantId && (
                <div className={styles.tableContainer}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading privileges...</div>
                    ) : (
                        <table className={styles.mainTable}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>Privilege Name</th>
                                    <th className={`${styles.th} ${styles.center}`}>Read</th>
                                    <th className={`${styles.th} ${styles.center}`}>Create</th>
                                    <th className={`${styles.th} ${styles.center}`}>Maintain</th>
                                </tr>
                            </thead>
                            <tbody>
                                {privileges.map((p) => (
                                    <tr key={p.id} className={styles.tr}>
                                        <td className={styles.td}>
                                            <span className={styles.featureName}>{p.name}</span>
                                        </td>
                                        <td className={`${styles.td} ${styles.center}`}>
                                            <input
                                                type="checkbox"
                                                className={styles.checkbox}
                                                checked={p.read}
                                                onChange={() => handleToggle(p.id, 'read')}
                                                disabled={!canWrite || !selectedUserId}
                                            />
                                        </td>
                                        <td className={`${styles.td} ${styles.center}`}>
                                            <input
                                                type="checkbox"
                                                className={styles.checkbox}
                                                checked={p.write}
                                                onChange={() => handleToggle(p.id, 'write')}
                                                disabled={!canWrite || !selectedUserId}
                                            />
                                        </td>
                                        <td className={`${styles.td} ${styles.center}`}>
                                            <input
                                                type="checkbox"
                                                className={styles.checkbox}
                                                checked={p.maintain}
                                                onChange={() => handleToggle(p.id, 'maintain')}
                                                disabled={!canWrite || !selectedUserId}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {privileges.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>
                                            No privileges found for this restaurant.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Success Modal */}
            <Modal
                isOpen={isSuccessModalOpen}
                onClose={handleCloseSuccessModal}
                title="Success"
            >
                <div className={styles.modalContent}>
                    <p className={styles.modalMessage}>{successMessage || 'User privileges updated successfully'}</p>
                    <div className={styles.modalActions}>
                        <Button onClick={handleCloseSuccessModal}>OK</Button>
                    </div>
                </div>
            </Modal>

            {/* Error Modal */}
            <Modal
                isOpen={isErrorModalOpen}
                onClose={handleCloseErrorModal}
                title="Error"
            >
                <div className={styles.modalContent}>
                    <p className={styles.modalMessage}>{errorMessage}</p>
                    <div className={styles.modalActions}>
                        <Button onClick={handleCloseErrorModal}>OK</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default UserPrivileges;
