import { FiUsers, FiShield, FiMail, FiFileText } from 'react-icons/fi';
import { MdRestaurant } from 'react-icons/md';
import { GiKnifeFork } from 'react-icons/gi';
import { FaTable } from 'react-icons/fa';
import { FaFileInvoiceDollar } from 'react-icons/fa';
import styles from './SettingsSidebar.module.css';
import { useAuth } from '../../../contexts/AuthContext';

interface SettingsSidebarProps {
    activeView: string;
    onNavigate: (view: string) => void;
    isOpen: boolean;
}

const SETTINGS_ITEMS = [
    { id: 'role-management', label: 'Role Management', icon: FiShield },
    { id: 'user-management', label: 'User Management', icon: FiUsers },
    { id: 'role-privileges', label: 'Role Privileges', icon: FiShield },
    { id: 'user-privileges', label: 'User Privilege', icon: FiUsers },
    { id: 'restaurant-privilege', label: 'Restaurant Privilege', icon: MdRestaurant },
    { id: 'email-settings', label: 'Email Settings', icon: FiMail },
    { id: 'tax-settings', label: 'Tax Settings', icon: FiFileText },
    { id: 'restaurant-management', label: 'Restaurant Management', icon: MdRestaurant },
    { id: 'food-content', label: 'Food Management', icon: GiKnifeFork },
    { id: 'table-management', label: 'Table Management', icon: FaTable },
    { id: 'order-management', label: 'Order Management', icon: FaFileInvoiceDollar },
    { id: 'invoice-management', label: 'Invoice Management', icon: FaFileInvoiceDollar },
];

export function SettingsSidebar({ activeView, onNavigate, isOpen }: SettingsSidebarProps) {
    const { rolePrivileges, userPrivileges } = useAuth();

    if (!isOpen) return null;

    const filteredItems = SETTINGS_ITEMS.filter(item => {
        const name = item.label.trim();
        return rolePrivileges[name] === 1 || userPrivileges[name] === 1;
    });

    if (filteredItems.length === 0) return null;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <span className={styles.headerIcon}>⚙️</span>
                <h3 className={styles.headerTitle}>Settings</h3>
            </div>
            <nav className={styles.nav}>
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            onClick={() => onNavigate(item.id)}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

export default SettingsSidebar;
