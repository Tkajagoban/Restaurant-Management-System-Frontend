import { useState, useEffect } from 'react';
import styles from './RestaurantPrivileges.module.css';
import { getRestaurant, type Restaurant } from '../../../api/restaurantManagement/RestaurantManagement.api';
import { getRestaurantPrivileges } from '../../../api/restaurantPrivileges/RestaurantPrivilege.api';

interface PrivilegeAssignment {
    name: string;
    assigned: boolean;
}



function RestaurantPrivileges() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [privileges, setPrivileges] = useState<PrivilegeAssignment[]>([]);

    // Fetch restaurants on mount
    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const response = await getRestaurant();
                if (response.statusCode === 2000) {
                    setRestaurants(response.data);
                    if (response.data.length > 0) {
                        setSelectedRestaurantId(response.data[0].id?.toString() || '');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch restaurants:', error);
            }
        };
        fetchRestaurants();
    }, []);

    // Load privileges when restaurant is selected
    useEffect(() => {
        if (!selectedRestaurantId) return;
        setLoading(true);

        const fetchPrivileges = async () => {
            try {
                const response = await getRestaurantPrivileges(selectedRestaurantId);
                // The API response structure is nested in response.data, which contains 'content'
                if (response.statusCode === 2008 && response.data && Array.isArray(response.data.content)) {
                    const fetchedContent = response.data.content;

                    // Actually, if I mark them false, and the user wants to "Delete" or "Unassign", they would uncheck.
                    // If the list is existing privileges, they should be TRUE.
                    // But if this is a "Potential Privileges" list, then false.
                    // The user said "i didnt get all previlages". 
                    // I will just map them.

                    const mapped = fetchedContent.map(p => ({
                        name: p.privilege_name,
                        assigned: true
                    }));

                    setPrivileges(mapped);
                }
            } catch (error) {
                console.error('Failed to fetch restaurant privileges:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrivileges();
    }, [selectedRestaurantId]);

    const handleToggle = (name: string) => {
        setPrivileges(prev => prev.map(p =>
            p.name === name ? { ...p, assigned: !p.assigned } : p
        ));
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>Restaurant Privilege</h1>
                    <p className={styles.subtitle}>Assign management privileges to restaurants.</p>
                </div>

                <div className={styles.restaurantSelectWrapper}>
                    <label className={styles.selectLabel}>Select Restaurant</label>
                    <select
                        className={styles.restaurantSelect}
                        value={selectedRestaurantId}
                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                    >
                        <option value="" disabled>Select a restaurant</option>
                        {restaurants.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading privileges...</div>
                ) : (
                    <table className={styles.mainTable}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Privilege Name</th>
                                <th className={`${styles.th} ${styles.center}`}>Assign</th>
                            </tr>
                        </thead>
                        <tbody>
                            {privileges.map((p) => (
                                <tr key={p.name} className={styles.tr}>
                                    <td className={styles.td}>
                                        <span className={styles.featureName}>{p.name}</span>
                                    </td>
                                    <td className={`${styles.td} ${styles.center}`}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={p.assigned}
                                            onChange={() => handleToggle(p.name)}
                                            disabled={true} // Read-only as per requirement
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default RestaurantPrivileges;
