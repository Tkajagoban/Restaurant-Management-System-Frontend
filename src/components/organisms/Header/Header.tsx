import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { FiBell, FiSettings, FiLogOut, FiX, FiUser, FiShield } from 'react-icons/fi';
import { GiChefToque } from 'react-icons/gi';
import { useOrderNotifications } from '../../../contexts/OrderNotificationContext';
import { postLogout } from '../../../api/login/Login.api';
import { updateOrderSummary } from '../../../api/order/Order.api';
import styles from './Header.module.css';
import logo from '../../../assets/logo.png';
import { useAuth } from '../../../contexts/AuthContext';

type Role = 'admin' | 'steward' | 'chef';

interface HeaderProps {
    activeView: string;
    onNavigate: (view: string) => void;
    onRoleChange: (role: Role) => void;
    onSettingsClick: () => void;
    readyOrdersCount?: number;
}

const PAGE_TITLES: Record<string, string> = {
    'admin-dashboard': 'Admin Dashboard',
    'steward-dashboard': 'Steward Dashboard',
    'chef-dashboard': 'Chef Dashboard',
    'user-management': 'User Management',
    'role-management': 'Role Management',
    'role-privileges': 'Role Privileges',
    'user-privileges': 'User Privilege',
    'restaurant-management': 'Restaurant Management',
    'food-content': 'Food Management',
    'email-settings': 'Email Settings',
    'tax-settings': 'Tax Settings',
    'table-management': 'Table Management',
    'order-management': 'Order Management',
    'restaurant-privilege': 'Restaurant Privilege',
    'invoice-management': 'Invoice Management',
};

export function Header({ activeView, onNavigate, onRoleChange, onSettingsClick }: HeaderProps) {
    const { rolePrivileges, userPrivileges, logout } = useAuth();
    const navigate = useNavigate();
    const [showNotificationPopup, setShowNotificationPopup] = useState(false);
    const [showRejectPopup, setShowRejectPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const rejectPopupRef = useRef<HTMLDivElement>(null);
    const { orders, rejectedOrders, updateOrderStatus } = useOrderNotifications();

    const readyOrders = orders.filter(order => order.status === 'READY_TO_SERVE' || order.status === 'ready');

    const handleLogout = async () => {
        try {
            await postLogout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            logout();
            navigate('/login', { replace: true });
        }
    };

    const hasPrivilege = (privilegeName: string) => {
        if (!privilegeName) return false;
        const name = privilegeName.trim();
        return rolePrivileges[name] === 1 || userPrivileges[name] === 1;
    };

    const pageTitle = PAGE_TITLES[activeView] || 'Dashboard';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowNotificationPopup(false);
            }
            if (rejectPopupRef.current && !rejectPopupRef.current.contains(event.target as Node)) {
                setShowRejectPopup(false);
            }
        };

        if (showNotificationPopup || showRejectPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotificationPopup, showRejectPopup]);

    const handleLoadRejectedOrder = (orderId: string) => {
        const order = rejectedOrders.find(o => o.id === orderId);
        if (order) {
            onNavigate('admin-dashboard');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('loadRejectedOrder', { detail: order }));
            }, 100);
            setShowRejectPopup(false);
        }
    };

    const handlePicked = async (order: any) => {
        const apiOrderId = order.apiOrderId || (typeof order.id === 'number' ? order.id : parseInt(String(order.id)));

        if (apiOrderId) {
            try {
                const updatePayload: any = {
                    tableId: order.tableId || 1,
                    stewardId: order.stewardId || 1,
                    orderType: order.orderType || 'DINE_IN',
                    status: 'READY_TO_ORDER',
                    orderItems: (order.items || []).map((item: any) => ({
                        orderItemId: item.orderItemId || (typeof item.id === 'string' && item.id.includes('-') ? parseInt(item.id.split('-')[1]) : (typeof item.id === 'number' ? item.id : 1)),
                        quantity: item.quantity,
                        status: 'PENDING'
                    }))
                };
                console.log('Completing order from Header:', apiOrderId, updatePayload);
                await updateOrderSummary(apiOrderId, updatePayload);
                updateOrderStatus(order.id, 'READY_TO_ORDER');
            } catch (error) {
                console.error('Failed to complete order:', error);
            }
        }
    };

    const showRoleSwitcher = hasPrivilege('Admin Dashboard') || hasPrivilege('Steward Dashboard') || hasPrivilege('Chef Dashboard');

    const hasSettingsPrivilege = [
        'User Management',
        'Role Management',
        'Role Privileges',
        'User Privilege',
        'Email Settings',
        'Food Management',
        'Restaurant Management',
        'Table Management',
        'Tax Settings',
        'Order Management',
        'Invoice Management',
        'Restaurant Privilege'
    ].some(hasPrivilege);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.logoSection} onClick={() => {
                    const dashboards = ['admin-dashboard', 'steward-dashboard', 'chef-dashboard'];
                    const firstDashboard = dashboards.find(d => {
                        const privName = d === 'admin-dashboard' ? 'Admin Dashboard' :
                            d === 'steward-dashboard' ? 'Steward Dashboard' : 'Chef Dashboard';
                        return hasPrivilege(privName);
                    });
                    if (firstDashboard) onNavigate(firstDashboard);
                    else onSettingsClick(); // Fallback to settings if no dashboard
                }}>
                    <div className={styles.logoIcon}>
                        <img src={logo} alt="இது நம்ம கடை" style={{ width: '80px', height: 'auto', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <span className={styles.logoText}>இது நம்ம கடை</span>
                </div>

                <div className={styles.centerSection}>
                    <span className={styles.pageTitle}>{pageTitle}</span>
                </div>

                <div className={styles.rightSection}>
                    {hasPrivilege('Order Management') && (
                        <button
                            className={styles.readyOrdersBtn}
                            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
                        >
                            <FiBell size={18} />
                            <span>Ready Orders</span>
                            {readyOrders.length > 0 && <span className={styles.badge}>{readyOrders.length}</span>}
                        </button>
                    )}

                    {hasPrivilege('Order Management') && (
                        <button
                            className={styles.rejectedOrdersBtn}
                            onClick={() => setShowRejectPopup(!showRejectPopup)}
                            title="Rejected Orders"
                        >
                            <FiX size={18} />
                            <span>Reject</span>
                            {rejectedOrders.length > 0 && <span className={styles.rejectBadge}>{rejectedOrders.length}</span>}
                        </button>
                    )}

                    {showRoleSwitcher && (
                        <div className={styles.roleSwitcher}>
                            {hasPrivilege('Admin Dashboard') && (
                                <button
                                    className={`${styles.roleBtn} ${activeView === 'admin-dashboard' ? styles.active : ''}`}
                                    onClick={() => onRoleChange('admin')}
                                    title="Admin Dashboard"
                                >
                                    <FiShield size={14} />
                                </button>
                            )}
                            {hasPrivilege('Steward Dashboard') && (
                                <button
                                    className={`${styles.roleBtn} ${activeView === 'steward-dashboard' ? styles.active : ''}`}
                                    onClick={() => onRoleChange('steward')}
                                    title="Steward Dashboard"
                                >
                                    <FiUser size={14} />
                                </button>
                            )}
                            {hasPrivilege('Chef Dashboard') && (
                                <button
                                    className={`${styles.roleBtn} ${activeView === 'chef-dashboard' ? styles.active : ''}`}
                                    onClick={() => onRoleChange('chef')}
                                    title="Chef Dashboard"
                                >
                                    <GiChefToque size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {hasSettingsPrivilege && (
                        <button className={styles.dropdownBtn} onClick={onSettingsClick} title="Settings">
                            <FiSettings size={20} />
                        </button>
                    )}

                    <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
                        <FiLogOut size={20} />
                    </button>
                </div>
            </header>

            {showNotificationPopup && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >
                    <div
                        ref={popupRef}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            width: '90%',
                            maxWidth: '500px',
                            maxHeight: '80vh',
                            overflow: 'hidden',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid #e5e7eb',
                            background: '#fbbf24'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#000' }}>
                                🔔 Ready to Serve Orders
                            </h3>
                            <button
                                onClick={() => setShowNotificationPopup(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto', background: '#f3f4f6' }}>
                            {readyOrders.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280',
                                    background: '#fff',
                                    borderRadius: '12px'
                                }}>
                                    <FiBell size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                    <p>No orders ready to serve</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {readyOrders.map((order, index) => (
                                        <div
                                            key={order.id || index}
                                            style={{
                                                background: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '12px',
                                                padding: '1.25rem',
                                                borderLeft: '5px solid #22c55e',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '0.75rem'
                                            }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '1rem',
                                                    color: '#111827'
                                                }}>
                                                    {order.orderNumber}
                                                </span>
                                                <span style={{
                                                    background: '#dcfce7',
                                                    color: '#16a34a',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700
                                                }}>
                                                    READY
                                                </span>
                                            </div>

                                            <div style={{
                                                fontSize: '0.9rem',
                                                color: '#6b7280',
                                                marginBottom: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem'
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <span style={{ color: '#ef4444' }}>📍</span> {order.table}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <span style={{ color: '#6b7280' }}>🕐</span> {order.time || new Date().toLocaleTimeString()}
                                                </span>
                                            </div>

                                            {order.items && order.items.length > 0 && (
                                                <div style={{
                                                    background: '#fff',
                                                    borderRadius: '8px',
                                                    padding: '0.75rem 1rem',
                                                    border: '1px solid #e5e7eb',
                                                    marginBottom: '1rem'
                                                }}>
                                                    {order.items.map((item: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                padding: '0.4rem 0',
                                                                borderBottom: idx < order.items.length - 1 ? '1px solid #f3f4f6' : 'none'
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 500 }}>
                                                                {item.name}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.9rem',
                                                                fontWeight: 600,
                                                                color: '#6b7280'
                                                            }}>
                                                                ×{item.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handlePicked(order)}
                                                style={{
                                                    background: '#22c55e',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '0.8rem 1rem',
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.2)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#16a34a'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#22c55e'}
                                            >
                                                Picked
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showRejectPopup && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >
                    <div
                        ref={rejectPopupRef}
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            width: '90%',
                            maxWidth: '500px',
                            maxHeight: '80vh',
                            overflow: 'hidden',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid #e5e7eb',
                            background: '#ef4444'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                                🚫 Rejected Orders
                            </h3>
                            <button
                                onClick={() => setShowRejectPopup(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff'
                                }}
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                            {rejectedOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    <FiX size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                    <p>No rejected orders</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {rejectedOrders.map((order, index) => (
                                        <div
                                            key={order.id || index}
                                            onClick={() => handleLoadRejectedOrder(order.id)}
                                            style={{
                                                background: '#f9fafb',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                borderLeft: '4px solid #ef4444',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: '#111827' }}>{order.orderNumber || order.id}</span>
                                                <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 500 }}>REJECTED</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                                <strong>Reason:</strong> {order.rejectedReason || 'No reason provided'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                📍 {order.table} • 🕐 {(() => {
                                                    try {
                                                        const date = new Date(order.placedAt);
                                                        if (isNaN(date.getTime())) return new Date().toLocaleTimeString();
                                                        return date.toLocaleTimeString();
                                                    } catch (e) {
                                                        return new Date().toLocaleTimeString();
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Header;
