import { useState, useEffect } from 'react';
import { FaUserShield, FaUserTie } from 'react-icons/fa';
import { MdKitchen, MdDashboard } from 'react-icons/md';
import styles from './RolePrivileges.module.css';
import { getAllRoles, type Role as ApiRole } from '../../../api/roleManagement/RoleManagement.api';
import { getRestaurantPrivileges } from '../../../api/restaurantPrivileges/RestaurantPrivilege.api';
import { getRolePrivilegesByRoleId, updateRolePrivilege } from '../../../api/rolePrivileges/RolePrivileges.api';
import { usePrivilege } from '../../../hooks/usePrivilege';
import { useAppDispatch } from '../../../redux/hooks';
import { updatePrivilege } from '../../../redux/slices/privilegeSlice';

type Permission = 'read' | 'write' | 'maintain';

interface FeaturePermissions {
  feature: string;
  restaurantPrivilegeId: number;
  status: string; // 'READ' | 'WRITE' | 'MAINTAIN' | 'NONE'
}

// Map backend status to the internal status string
const statusToFlags = (feature: string, restaurantPrivilegeId: number, status: string | null): FeaturePermissions => {
  return {
    feature,
    restaurantPrivilegeId,
    status: status || 'NONE',
  };
};

function RolePrivileges() {
  const { canWrite } = usePrivilege('Role Privileges');
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [features, setFeatures] = useState<{ name: string; restaurantPrivilegeId: number }[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<Record<number, FeaturePermissions[]>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingPrivileges, setFetchingPrivileges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dispatch = useAppDispatch();
  const currentRoleId = Number(sessionStorage.getItem('roleId'));
  const restaurantId = '1';

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeRoleId !== null && features.length > 0) {
      fetchDetailedPrivileges(activeRoleId);
    }
  }, [activeRoleId, features]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [rolesRes, privilegesRes] = await Promise.all([
        getAllRoles(restaurantId),
        getRestaurantPrivileges(restaurantId)
      ]);

      const fetchedRoles = rolesRes.data || [];
      const fetchedPrivileges = privilegesRes.data?.content || [];

      const activeFeatures = fetchedPrivileges.map(p => ({
        name: p.privilege_name,
        restaurantPrivilegeId: p.id
      }));

      setFeatures(activeFeatures);
      setRoles(fetchedRoles);

      if (fetchedRoles.length > 0) {
        setActiveRoleId(fetchedRoles[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedPrivileges = async (roleId: number) => {
    try {
      setFetchingPrivileges(true);
      const res = await getRolePrivilegesByRoleId(roleId);
      if (res && res.data) {
        const dbPrivileges = res.data.rolePrivileges;

        const rolePerms = features.map(f => {
          const featureName = f.name.trim();
          const detail = Object.entries(dbPrivileges).find(
            ([name]) => name.trim().toLowerCase() === featureName.toLowerCase()
          )?.[1];

          if (detail) {
            return statusToFlags(f.name, detail.restaurantPrivilegeId || f.restaurantPrivilegeId, detail.privilegeStatus);
          }
          return {
            feature: f.name,
            restaurantPrivilegeId: f.restaurantPrivilegeId,
            status: 'NONE'
          };
        });

        setPermissions(prev => ({
          ...prev,
          [roleId]: rolePerms
        }));
      }
    } catch (error) {
      console.error(`Error fetching detailed privileges for role ${roleId}:`, error);
      const defaultPerms = features.map(f => ({
        feature: f.name,
        restaurantPrivilegeId: f.restaurantPrivilegeId,
        status: 'NONE'
      }));
      setPermissions(prev => ({
        ...prev,
        [roleId]: defaultPerms
      }));
    } finally {
      setFetchingPrivileges(false);
    }
  };

  const togglePermission = (featureIndex: number, permission: Permission) => {
    if (activeRoleId === null) return;

    setPermissions(prev => ({
      ...prev,
      [activeRoleId]: prev[activeRoleId].map((item, idx) => {
        if (idx !== featureIndex) return item;

        const clickedMode = permission.toUpperCase();
        const newStatus = item.status === clickedMode ? 'NONE' : clickedMode;

        return {
          ...item,
          status: newStatus
        };
      }),
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (activeRoleId === null || !permissions[activeRoleId]) return;

    try {
      setSaving(true);
      const currentPerms = permissions[activeRoleId];

      const updatePromises = currentPerms.map(perm => {
        let rPrivId = perm.restaurantPrivilegeId;

        if (!rPrivId) {
          const featureData = features.find(f => f.name.trim().toLowerCase() === perm.feature.trim().toLowerCase());
          rPrivId = featureData?.restaurantPrivilegeId ?? 0;
        }

        if (!rPrivId) return Promise.resolve();

        return updateRolePrivilege({
          roleId: activeRoleId,
          restaurantPrivilegeId: rPrivId,
          privilegeStatus: perm.status
        });
      });

      await Promise.all(updatePromises);

      // If we are editing the currently logged-in user's role, update Redux store immediately
      if (activeRoleId === currentRoleId) {
        currentPerms.forEach(perm => {
          dispatch(updatePrivilege({
            featureName: perm.feature,
            status: perm.status as any
          }));
        });

        // Update sessionStorage to persist changes on refresh
        try {
          const storedPrivilegesStr = sessionStorage.getItem('rolePrivilege');
          if (storedPrivilegesStr) {
            const storedPrivileges = JSON.parse(storedPrivilegesStr);
            currentPerms.forEach(perm => {
              const featureKey = Object.keys(storedPrivileges).find(k => k.toLowerCase() === perm.feature.toLowerCase()) || perm.feature;
              if (storedPrivileges[featureKey]) {
                storedPrivileges[featureKey].privilegeStatus = perm.status;
                storedPrivileges[featureKey].isMaintain = perm.status === 'MAINTAIN' ? 1 : 0;
              }
            });
            sessionStorage.setItem('rolePrivilege', JSON.stringify(storedPrivileges));
          }
        } catch (e) {
          console.error("Failed to update session storage", e);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.page}>Loading privileges...</div>;

  const currentPermissions = activeRoleId !== null ? permissions[activeRoleId] : [];
  const activeRoleName = roles.find(r => r.id === activeRoleId)?.roleName || '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Role Privileges</h1>
        <p className={styles.subtitle}>Configure permissions for the selected role based on active system features.</p>
      </div>

      <div className={styles.tabs}>
        {roles.map(role => {
          let icon = <FaUserShield />;
          const name = role.roleName.toLowerCase();
          if (name.includes('admin')) icon = <MdDashboard />;
          else if (name.includes('steward')) icon = <FaUserTie />;
          else if (name.includes('chef')) icon = <MdKitchen />;

          return (
            <button
              key={role.id}
              className={`${styles.tab} ${activeRoleId === role.id ? styles.active : ''} `}
              onClick={() => setActiveRoleId(role.id)}
            >
              <span className={styles.tabIcon}>{icon}</span>
              {role.roleName}
            </button>
          );
        })}
      </div>

      <div className={styles.saveBar}>
        {(fetchingPrivileges || saving) && <span style={{ fontSize: '0.8rem', color: '#666' }}>
          {saving ? 'Saving changes...' : 'Fetching role status...'}
        </span>}
        {saved && <span className={styles.savedMessage}>✓ Permissions saved successfully</span>}
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving || fetchingPrivileges || !canWrite}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className={`${styles.card} ${fetchingPrivileges ? styles.fetching : ''}`}>
        {features.length > 0 ? (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Feature ({activeRoleName})</th>
                <th className={`${styles.th} ${styles.center} `}>Read</th>
                <th className={`${styles.th} ${styles.center} `}>Write</th>
                <th className={`${styles.th} ${styles.center} `}>Maintain</th>
              </tr>
            </thead>
            <tbody>
              {currentPermissions?.map((item, index) => (
                <tr key={item.feature} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.featureName}>{item.feature}</span>
                  </td>
                  <td className={`${styles.td} ${styles.center} `}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={item.status === 'READ'}
                      onChange={() => togglePermission(index, 'read')}
                      disabled={!canWrite}
                    />
                  </td>
                  <td className={`${styles.td} ${styles.center} `}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={item.status === 'WRITE'}
                      onChange={() => togglePermission(index, 'write')}
                      disabled={!canWrite}
                    />
                  </td>
                  <td className={`${styles.td} ${styles.center} `}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={item.status === 'MAINTAIN'}
                      onChange={() => togglePermission(index, 'maintain')}
                      disabled={!canWrite}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No active privileges found in the system.
          </div>
        )}
      </div>
    </div>
  );
}

export default RolePrivileges;
