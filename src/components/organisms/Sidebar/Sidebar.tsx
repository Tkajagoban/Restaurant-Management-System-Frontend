import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.module.css';
import { useAuth } from '../../../contexts/AuthContext';

interface SidebarProps {
  onNavigate: (view: string) => void;
  activeView: string;
  role?: 'admin' | 'steward' | 'chef';
}

function Sidebar({ onNavigate, activeView }: SidebarProps) {
  const navigate = useNavigate();
  const { rolePrivileges, userPrivileges } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    navigate('/');
  };

  const handleSettingsClick = () => {
    setSettingsOpen(!settingsOpen);
  };

  const handleMenuItemClick = (view: string) => {
    onNavigate(view);
    setSettingsOpen(false);
  };

  const hasPrivilege = (privilegeName: string) => {
    if (!privilegeName) return false;
    const name = privilegeName.trim();
    return rolePrivileges[name] === 1 || userPrivileges[name] === 1;
  };

  // Check if any settings-related privilege is present to show the Settings menu
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
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🍴</div>
        <h2>Delicious Restaurant</h2>
      </div>
      <ul className="sidebar-nav">
        {hasPrivilege('Chef Dashboard') && (
          <li className="sidebar-item">
            <button
              onClick={() => handleMenuItemClick('chef-dashboard')}
              className={`sidebar-link ${activeView === 'chef-dashboard' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <span className="sidebar-icon">🍳</span> Chef Dashboard
            </button>
          </li>
        )}

        {hasPrivilege('Steward Dashboard') && (
          <li className="sidebar-item">
            <button
              onClick={() => handleMenuItemClick('steward-dashboard')}
              className={`sidebar-link ${activeView === 'steward-dashboard' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <span className="sidebar-icon">👥</span> Steward Dashboard
            </button>
          </li>
        )}

        {hasPrivilege('Admin Dashboard') && (
          <li className="sidebar-item">
            <button
              onClick={() => handleMenuItemClick('admin-dashboard')}
              className={`sidebar-link ${activeView === 'admin-dashboard' ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <span className="sidebar-icon">👨‍💼</span> Admin Dashboard
            </button>
          </li>
        )}

        {hasSettingsPrivilege && (
          <li className="sidebar-item">
            <button
              onClick={handleSettingsClick}
              className={`sidebar-link ${settingsOpen ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <span className="sidebar-icon">⚙️</span>
              <span className="settings-pill">Settings</span>
              <span className="dropdown-arrow" style={{ marginLeft: 'auto' }}>
                {settingsOpen ? '▼' : '▶'}
              </span>
            </button>
            {settingsOpen && (
              <ul className="sidebar-submenu">
                {hasPrivilege('User Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('user-management')}
                      className={`sidebar-link ${activeView === 'user-management' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">👤</span> User Management
                    </button>
                  </li>
                )}
                {hasPrivilege('Role Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('role-management')}
                      className={`sidebar-link ${activeView === 'role-management' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🎭</span> Role Management
                    </button>
                  </li>
                )}
                {hasPrivilege('Role Privileges') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('role-privileges')}
                      className={`sidebar-link ${activeView === 'role-privileges' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🔑</span> Role Privileges
                    </button>
                  </li>
                )}
                {hasPrivilege('User Privilege') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('user-privileges')}
                      className={`sidebar-link ${activeView === 'user-privileges' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">👤</span> User Privilege
                    </button>
                  </li>
                )}

                {hasPrivilege('Email Settings') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('email-settings')}
                      className={`sidebar-link ${activeView === 'email-settings' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">✉️</span> Email Settings
                    </button>
                  </li>
                )}
                {hasPrivilege('Food Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('food-content')}
                      className={`sidebar-link ${activeView === 'food-content' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🍽️</span> Food Content (Management)
                    </button>
                  </li>
                )}
                {hasPrivilege('Restaurant Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('restaurant-management')}
                      className={`sidebar-link ${activeView === 'restaurant-management' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🏢</span> Restaurant Management
                    </button>
                  </li>
                )}
                {hasPrivilege('Table Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('table-management')}
                      className={`sidebar-link ${activeView === 'table-management' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🪑</span> Table Management
                    </button>
                  </li>
                )}
                {hasPrivilege('Tax Settings') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('tax-settings')}
                      className={`sidebar-link ${activeView === 'tax-settings' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">📜</span> Tax Settings
                    </button>
                  </li>
                )}
                {hasPrivilege('Order Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('order-management')}
                      className={`sidebar-link ${activeView === 'order-management' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">📝</span> Order Management
                    </button>
                  </li>
                )}
                {hasPrivilege('Invoice Management') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('invoice-management')}
                      className={`sidebar-link ${activeView === 'invoice-management' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🧾</span> Invoice Management
                    </button>
                  </li>
                )}
                {hasPrivilege('Restaurant Privilege') && (
                  <li>
                    <button
                      onClick={() => handleMenuItemClick('restaurant-privilege')}
                      className={`sidebar-link ${activeView === 'restaurant-privilege' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', paddingLeft: '2rem' }}
                    >
                      <span className="sidebar-icon">🗝️</span> Restaurant Privilege
                    </button>
                  </li>
                )}
              </ul>
            )}
          </li>
        )}

        <li className="sidebar-item">
          <button onClick={handleLogout} className="sidebar-link" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <span className="sidebar-icon">🚪</span> Logout
          </button>
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;

