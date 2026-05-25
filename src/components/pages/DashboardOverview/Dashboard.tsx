import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../../organisms/Header/Header';
import SettingsSidebar from '../../organisms/SettingsSidebar/SettingsSidebar';
import OrderPanel from '../../organisms/OrderPanel/OrderPanel';
import AdminDashboard from '../AdminDashboard/AdminDashboard';
import StewardDashboard from '../StewardDashboard/StewardDashboard';
import ChefDashboard from '../ChefDashboard/ChefDashboard';
import FoodContentManagement from '../FoodContentManagement/FoodContentManagement';
import UserManagement from '../UserManagement/UserManagement';
import { RoleList as RoleManagement } from '../RoleManagement/RoleList';
import RolePrivileges from '../RolePrivileges/RolePrivileges';
import RestaurantPrivileges from '../RestaurantPrivileges/RestaurantPrivileges';
import UserPrivileges from '../UserPrivileges/UserPrivileges';
import EmailSettings from '../emailSettings/EmailSettings';
import TaxManagement from '../TaxManagement/TaxManagement';
import RestaurantList from "../RestaurantManagement/RestaurantList"; // default import
import TableManagement from '../TableManagement/TableManagement';
import { getAllTables, updateTableStatusById } from '../../../api/tableManagement/TableManagement.api';
import { getStewards } from '../../../api/dashboardOverview/DashboardOverview.api';
import { getActiveTaxes, type TaxItem } from '../../../api/taxManagement/TaxManagement.api';
import { getUsers } from '../../../api/userManagement/UserManagement.api';
import OrderManagement from '../OrderManagement/OrderManagement';
import { createOrder, updateOrderSummary, getOrders } from '../../../api/order/Order.api';
import InvoiceManagement from '../InvoiceManagement/InvoiceManagement';
import type { StatusStats } from '../../molecules/StatusSummary/StatusSummary';
import ConfirmModal from '../../organisms/Modal/ConfirmModal';
import { useOrderNotifications } from '../../../contexts/OrderNotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrderWebSocket } from '../../../hooks/useOrderWebSocket';
type Role = 'admin' | 'steward' | 'chef';

// Order item type
interface OrderItem {
  id?: string;
  orderItemId?: number;
  foodId?: number;
  name: string;
  price: number;
  quantity: number;
  isRejected?: boolean;
}

// Placed order type for previous orders history
export interface PlacedOrder {
  id: string;
  orderItems: OrderItem[];
  orderType: 'dine-in' | 'take-away';
  table: string;
  tableId?: number | null;
  steward: string;
  stewardId?: number | null;
  placedAt: Date;
  status: 'placed' | 'preparing' | 'completed' | 'cancelled';
  apiOrderId?: number;
}

// Generate unique order ID (numeric-only fallback)
const generateOrderId = () => `${Date.now()}`;

// Total available tables
// Total available tables removed (now dynamic)


// Settings-related views
const SETTINGS_VIEWS = [
  'user-management',
  'role-management',
  'role-privileges',
  'user-privileges',
  'restaurant-privilege',
  'email-settings',
  'tax-settings',
  'restaurant-management',
  'table-management',
  'order-management',
  'food-content',
  'invoice-management'
];

const VIEW_TO_PRIVILEGE: Record<string, string> = {
  'admin-dashboard': 'Admin Dashboard',
  'steward-dashboard': 'Steward Dashboard',
  'chef-dashboard': 'Chef Dashboard',
  'food-content': 'Food Management',
  'user-management': 'User Management',
  'role-management': 'Role Management',
  'role-privileges': 'Role Privileges',
  'user-privileges': 'User Privilege',
  'restaurant-privilege': 'Restaurant Privilege',
  'email-settings': 'Email Settings',
  'tax-settings': 'Tax Settings',
  'restaurant-management': 'Restaurant Management',
  'table-management': 'Table Management',
  'order-management': 'Order Management',
  'invoice-management': 'Invoice Management',
};

function Dashboard() {
  const { clearRejectedOrder } = useOrderNotifications();
  const { rolePrivileges, userPrivileges, userEmail, userRole: authRole, userId: authUserId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role') as Role | null;
  const viewFromUrl = searchParams.get('view');

  // Derive userRole from URL or Auth context
  const userRole = (roleFromUrl || authRole || 'admin') as Role;

  const getDefaultView = () => {
    const hasPriv = (name: string) => {
      if (!name) return false;
      const trimmedName = name.trim();
      return rolePrivileges[trimmedName] === 1 || userPrivileges[trimmedName] === 1;
    };

    if (userRole === 'steward' && hasPriv('Steward Dashboard')) return 'steward-dashboard';
    if (userRole === 'chef' && hasPriv('Chef Dashboard')) return 'chef-dashboard';

    // Fallback order
    if (hasPriv('Admin Dashboard')) return 'admin-dashboard';
    if (hasPriv('Steward Dashboard')) return 'steward-dashboard';
    if (hasPriv('Chef Dashboard')) return 'chef-dashboard';

    // If no dashboards, pick first settings view they have
    const firstSetting = SETTINGS_VIEWS.find(view => {
      const privName = VIEW_TO_PRIVILEGE[view];
      return privName && hasPriv(privName);
    });
    return firstSetting || 'no-access';
  };

  const [activeView, setActiveView] = useState(viewFromUrl || getDefaultView());
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [OrderId, setOrderId] = useState('');

  // Single order state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'take-away'>('dine-in');
  const [table, setTable] = useState('');
  const [tableId, setTableId] = useState<number | null>(null); // Track actual table ID
  const [steward, setSteward] = useState('');
  const [stewardId, setStewardId] = useState<number | null>(null); // Track actual steward ID
  const [totalTables, setTotalTables] = useState(0);
  const [activeTaxes, setActiveTaxes] = useState<TaxItem[]>([]);


  // Fetch total tables for statistics
  useEffect(() => {
    const fetchTotalTables = async () => {
      try {
        const response = await getAllTables(0, 100); // Fetch all to get total count
        setTotalTables(response.data?.totalElements || 0);
      } catch (err) {
        console.error('Failed to fetch total tables', err);
      }
    };
    fetchTotalTables();
  }, [activeView]); // Re-fetch when switching views to keep stats fresh

  // Fetch active taxes for order placement
  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        const taxes = await getActiveTaxes();
        setActiveTaxes(taxes);
      } catch (err) {
        console.error('Failed to fetch active taxes', err);
      }
    };
    fetchTaxes();
  }, []);

  // Previous orders history
  const [previousOrders, setPreviousOrders] = useState<PlacedOrder[]>([]);

  // Fetch Previous Orders from backend on mount
  useEffect(() => {
    const fetchPreviousOrders = async () => {
      try {
        const response = await getOrders({ page: 0, size: 50 });
        // Handle different response formats from backend
        let ordersData: any[] = [];
        if (Array.isArray(response)) {
          ordersData = response;
        } else if (response?.content && Array.isArray(response.content)) {
          ordersData = response.content;
        } else if (response?.data?.content && Array.isArray(response.data.content)) {
          ordersData = response.data.content;
        } else if (response?.data && Array.isArray(response.data)) {
          ordersData = response.data;
        }

        // Map backend orders to PlacedOrder format
        const mappedOrders: PlacedOrder[] = ordersData.map((order: any) => ({
          id: String(order.id || order.orderId || order.orderSummaryId || ''),
          orderItems: (order.orderItems || order.items || []).map((item: any) => ({
            id: String(item.id || item.orderItemId || ''),
            orderItemId: item.orderItemId || item.id,
            foodId: item.foodId,
            name: item.itemName || item.name || item.foodName || 'Unknown Item',
            price: item.price || 0,
            quantity: item.quantity || 1,
            isRejected: item.status === 'REJECTED'
          })),
          orderType: (order.orderType?.toLowerCase().replace('_', '-') as 'dine-in' | 'take-away') || 'dine-in',
          table: order.tableNumber ? `Table ${order.tableNumber}` : (order.table || ''),
          tableId: order.tableId || order.resturantTablesId || null,
          steward: order.stewardName || order.steward || '',
          stewardId: order.stewardId || null,
          placedAt: order.createdDateTime ? new Date(order.createdDateTime) : (order.placedAt ? new Date(order.placedAt) : new Date()),
          status: (order.status?.toLowerCase() || 'placed') as 'placed' | 'preparing' | 'completed' | 'cancelled',
          apiOrderId: typeof order.id === 'number' ? order.id : undefined
        }));

        setPreviousOrders(mappedOrders);
      } catch (err) {
        console.error('Failed to fetch previous orders from backend', err);
      }
    };

    fetchPreviousOrders();
  }, []);

  // WebSocket event handlers for real-time order updates
  const handleOrderCreated = useCallback((order: PlacedOrder) => {
    setPreviousOrders(prev => {
      // Check for duplicate by id
      const exists = prev.some(o => o.id === order.id);
      if (exists) {
        // Update existing order
        return prev.map(o => o.id === order.id ? order : o);
      }
      // Add new order at the top (newest first)
      return [order, ...prev];
    });
  }, []);

  const handleOrderUpdated = useCallback((order: PlacedOrder) => {
    setPreviousOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      if (exists) {
        // Update existing order
        return prev.map(o => o.id === order.id ? order : o);
      }
      // If not found, add to top
      return [order, ...prev];
    });
  }, []);

  const handleOrderStatusChanged = useCallback((order: PlacedOrder) => {
    setPreviousOrders(prev => {
      return prev.map(o => o.id === order.id ? { ...o, status: order.status } : o);
    });
  }, []);

  // Connect to WebSocket for real-time order updates
  useOrderWebSocket({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderStatusChanged: handleOrderStatusChanged,
    enabled: true, // Always enabled when Dashboard is mounted
  });

  // Calculate status summary stats
  const statusStats: StatusStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = previousOrders.filter(order => {
      const orderDate = new Date(order.placedAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    const todaysSales = todaysOrders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((orderSum, item) => orderSum + (item.price * item.quantity), 0);
    }, 0);

    const tablesOccupied = new Set(
      previousOrders
        .filter(o => o.status !== 'completed' && o.table)
        .map(o => o.table)
    ).size;

    const ordersInPreparation = previousOrders.filter(o => o.status === 'preparing').length;

    return {
      todaysSales,
      totalOrdersToday: todaysOrders.length,
      tablesOccupied,
      tablesFree: Math.max(0, totalTables - tablesOccupied),
      ordersInPreparation
    };
  }, [previousOrders]);

  // Note: Back navigation prevention removed to allow normal in-app navigation.
  // If login-page back prevention is needed, handle it in the Login component instead.

  // Sync activeView when URL params change (for back/forward navigation)
  useEffect(() => {
    if (viewFromUrl && viewFromUrl !== activeView) {
      setActiveView(viewFromUrl);
    }
  }, [viewFromUrl]);

  // Auto-open sidebar when navigating to a settings view
  useEffect(() => {
    if (SETTINGS_VIEWS.includes(activeView)) {
      setShowSettingsSidebar(true);
    }
    // Update search params when activeView changes
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', activeView);
    setSearchParams(newParams, { replace: false });
  }, [activeView]);

  const handleOrderTypeChange = (newType: 'dine-in' | 'take-away') => {
    setOrderType(newType);
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
    if (!SETTINGS_VIEWS.includes(view)) {
      setShowSettingsSidebar(false);
    }
  };

  const handleSettingsClick = () => {
    setShowSettingsSidebar(!showSettingsSidebar);
    if (!showSettingsSidebar && !SETTINGS_VIEWS.includes(activeView)) {
      const hasPriv = (name: string) => {
        const trimmedName = name.trim();
        return rolePrivileges[trimmedName] === 1 || userPrivileges[trimmedName] === 1;
      };

      const firstSetting = SETTINGS_VIEWS.find(view => {
        const privName = VIEW_TO_PRIVILEGE[view];
        return privName && hasPriv(privName);
      });
      if (firstSetting) setActiveView(firstSetting);
    }
  };

  const handleRoleChange = (role: Role) => {
    let newView = 'admin-dashboard';
    if (role === 'steward') newView = 'steward-dashboard';
    else if (role === 'chef') newView = 'chef-dashboard';

    setActiveView(newView);
    setSearchParams({ role, view: newView });
    setShowSettingsSidebar(false);
  };

  // Add item to order
  const addToOrder = (item: any) => {
    setOrderItems(prev => {
      const existing = prev.find(p => p.name === item.name);
      if (existing) {
        return prev.map(p => p.name === item.name ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        name: item.name,
        price: item.price,
        quantity: 1,
        foodId: typeof item.id === 'number' ? item.id : parseInt(String(item.id))
      }];
    });
  };

  const incrementItem = (name: string) => {
    setOrderItems(prev => prev.map(p => p.name === name ? { ...p, quantity: p.quantity + 1 } : p));
  };

  const decrementItem = (name: string) => {
    setOrderItems(prev =>
      prev
        .map(p => p.name === name ? { ...p, quantity: p.quantity - 1 } : p)
        .filter(p => p.quantity > 0)
    );
  };

  // Clear current order
  const clearOrder = () => {
    setOrderItems([]);
    setTable('');
    setTableId(null);
    setLoadingRejectedOrderId(null);
    setLoadedOrderData(null);

    // Only clear steward if not a steward user
    if (userRole !== 'steward') {
      setSteward('');
      setStewardId(null);
    }
  };

  // New Order button handler - resets current order
  const handleNewOrder = () => {
    // You can optionally save to previous orders here if requirement exists
    clearOrder();
    setOrderType('dine-in');
  };

  const [loadingRejectedOrderId, setLoadingRejectedOrderId] = useState<string | null>(null);
  const [loadedOrderData, setLoadedOrderData] = useState<any>(null);

  useEffect(() => {
    const handleLoadRejected = (e: any) => {
      const order = e.detail;
      // Handle both 'items' (from Chef) and 'orderItems' (from Dashboard) property names
      const itemsToLoad = order.items || order.orderItems || [];

      // Mark individual items as rejected if they are in the rejectedItems list
      const mappedItems = itemsToLoad.map((item: any) => {
        const isItemRejected = order.rejectedItems?.some((ri: any) => ri.orderItemId === item.orderItemId || ri.name === item.name);
        return {
          ...item,
          isRejected: isItemRejected,
          // Ensure we carry over orderItemId and foodId
          orderItemId: item.orderItemId,
          foodId: item.foodId
        };
      });

      setOrderItems([...mappedItems]);
      setOrderType(order.orderType?.toLowerCase().replace('_', '-') || 'dine-in');
      setTable(order.table || `Table ${order.tableId || 1}`);
      setTableId(order.tableId || (order.table ? parseInt(order.table.replace(/\D/g, '')) : null));
      setSteward(order.stewardName || order.steward || 'Default Steward');
      setStewardId(order.stewardId || null);
      setLoadingRejectedOrderId(order.id);
      setLoadedOrderData(order);
    };

    window.addEventListener('loadRejectedOrder', handleLoadRejected);
    return () => window.removeEventListener('loadRejectedOrder', handleLoadRejected);
  }, []);

  // Fetch current user details to identify steward ID
  useEffect(() => {
    const fetchCurrentSteward = async () => {
      // ✅ For Admin/Chef, steward must be selected manually from UI
      if (userRole !== 'steward') return;

      // 1. If we have the ID from Auth and stewardId is not set, use it
      // if (authUserId && !stewardId) {
      //   setStewardId(authUserId);
      // }
      // ✅ Auto-assign steward ONLY when logged-in user is a steward
      if (userRole === 'steward' && authUserId && !stewardId) {
        setStewardId(authUserId);
      }


      if (userEmail) {
        try {
          // 2. Try fetching from steward list first to get the Full Name
          const stewards = await getStewards("1");
          const foundInStewards = stewards.find(s => s.email.toLowerCase() === userEmail.toLowerCase());

          if (foundInStewards) {
            setSteward(`${foundInStewards.firstName} ${foundInStewards.lastName}`);
            if (!stewardId) setStewardId(foundInStewards.id);
            return;
          }

          // 3. Fallback: Search in all users for identifying Name
          const allUsersResponse = await getUsers(1, { size: 100 });
          const foundInAll = allUsersResponse.data.content.find(u => u.email.toLowerCase() === userEmail.toLowerCase());

          if (foundInAll) {
            setSteward(`${foundInAll.firstName} ${foundInAll.lastName}`);
            if (!stewardId) setStewardId(foundInAll.id);
          } else {
            console.warn("User not found in user list for identification:", userEmail);
          }
        } catch (err) {
          console.error("Failed to identify current user for POS", err);
        }
      }
    };

    fetchCurrentSteward();
  }, [userEmail, authUserId, stewardId]);

  // Place order and add to previous orders
  const placeOrder = async () => {
    // HARD VALIDATION: Ensure all required fields are present
    if (orderItems.length === 0) {
      return;
    }

    // Validate table selection for dine-in orders
    if (orderType === 'dine-in' && !tableId) {
      alert('Please assign a table before placing the order.');
      return;
    }

    // Validate steward selection (only for dine-in orders)
    if (orderType === 'dine-in' && !stewardId) {
      alert('Please select a steward before placing the order.');
      return;
    }

    // Handle Re-Place Order
    if (loadingRejectedOrderId) {
      try {
        console.log('Re-placing/Updating rejected order:', loadingRejectedOrderId);

        // Determine IDs
        const tableIdToUse = loadedOrderData?.tableId || parseInt(table.replace(/\D/g, '')) || 1;
        // For stewards, ALWAYS use the state variable (which is set to logged-in user)
        // For admins, use state variable or fallback to loaded data
        const stewardIdToUse = userRole === 'steward' ? stewardId! : (stewardId || loadedOrderData?.stewardId);

        // Call update API with status: PLACE_ORDER
        const updatePayload: any = {
          tableId: tableIdToUse,
          stewardId: stewardIdToUse,
          orderType: orderType.toUpperCase().replace('-', '_'),
          status: 'PLACE_ORDER',
          orderItems: orderItems.map((item: any) => {
            if (item.orderItemId) {
              return {
                orderItemId: item.orderItemId,
                quantity: item.quantity,
                foodId: item.foodId
              };
            }
            return {
              foodId: item.foodId || (item.id && !isNaN(Number(item.id)) ? Number(item.id) : 1),
              quantity: item.quantity
            };
          }),
          taxIds: activeTaxes.map(t => t.id)
        };

        // Use robust ID extraction similar to cancel logic
        const orderIdToUse = loadedOrderData?.apiOrderId ||
          (typeof loadedOrderData?.id === 'number' ? loadedOrderData.id :
            (loadingRejectedOrderId.startsWith('ORD-') ? loadingRejectedOrderId.replace('ORD-', '') : loadingRejectedOrderId));

        const response = await updateOrderSummary(orderIdToUse, updatePayload);
        console.log('Order re-placed/updated:', response);

        setShowSuccessModal(true);
        setOrderId(`ORD-${orderIdToUse}`); // Format with ORD- prefix

        // Update table status to Reserved for dine-in orders
        if (orderType === 'dine-in' && tableIdToUse) {
          try {
            await updateTableStatusById(tableIdToUse, true); // true = Reserved
          } catch (tableUpdateErr) {
            console.error('Failed to update table status:', tableUpdateErr);
          }
        }

        // Update local state - update the existing entry with newest data
        setPreviousOrders(prev => prev.map(o => o.id === loadingRejectedOrderId ? {
          ...o,
          orderItems: [...orderItems],
          table: table,
          tableId: tableId,
          steward: steward,
          stewardId: stewardId,
          status: 'placed' as any,
          placedAt: new Date()
        } : o));

        setOrderItems([]);
        setTable('');
        setTableId(null);
        if (userRole !== 'steward') {
          setSteward('');
          setStewardId(null);
        }
        setLoadingRejectedOrderId(null);
        setLoadedOrderData(null);
        clearRejectedOrder(loadingRejectedOrderId);

      } catch (err) {
        console.error('Failed to update/re-place order:', err);
        alert('Failed to update order. Please try again.');
      }
      return;
    }

    // NEW ORDER Logic
    const localPlacedOrder = {
      id: generateOrderId(),
      orderItems: [...orderItems],
      orderType,
      table: table || `Table ${tableId || '??'}`,
      steward: steward,
      placedAt: new Date(),
      status: 'placed' as 'placed'
    };

    console.log('Order placed (local):', localPlacedOrder);

    try {
      // Validate that table and steward IDs are available for DINE_IN orders
      if (orderType === 'dine-in' && !tableId) {
        alert('Please select a table.');
        return;
      }

      // Validate steward selection only for dine-in orders
      if (orderType === 'dine-in' && !stewardId) {
        alert('Your steward information is missing. Please ensure you are logged in correctly.');
        return;
      }

      const orderResp = await createOrder({
        orderItems: localPlacedOrder.orderItems.map(item => ({
          ...item,
          foodId: item.foodId || (item.id && !isNaN(Number(item.id)) ? Number(item.id) : 1)
        })),
        orderType: localPlacedOrder.orderType,
        table: localPlacedOrder.table,
        tableId: tableId!,  // Use actual table ID from state
        steward: localPlacedOrder.steward,
        stewardId: stewardId!,  // Use actual steward ID from state
        taxIds: activeTaxes.map(t => t.id) // Use all active tax IDs
      });

      console.log('API Order Response:', orderResp);

      if (orderResp) {
        const savedOrder = orderResp.data;

        // Update local state history
        setPreviousOrders(prev => {
          const others = prev.filter(o => o.id !== localPlacedOrder.id);
          const savedAsPlaced: PlacedOrder = {
            id: String(savedOrder.id),
            orderItems: savedOrder.orderItems.map(i => ({ ...i, id: String(i.id || ''), name: i.itemName || i.name || 'Unknown Item' })),
            orderType: (savedOrder.orderType.toLowerCase().replace('_', '-') as "dine-in" | "take-away") || "dine-in",
            table: savedOrder.table || '',
            tableId: savedOrder.tableId || tableId,
            steward: savedOrder.steward || '',
            stewardId: savedOrder.stewardId || stewardId,
            placedAt: savedOrder.placedAt ? new Date(savedOrder.placedAt) : new Date(),
            status: savedOrder.status as any,
            apiOrderId: typeof savedOrder.id === 'number' ? savedOrder.id : undefined
          };
          return [savedAsPlaced, ...others];
        });

        const numericId = typeof orderResp.data.id === 'number' ? orderResp.data.id : parseInt(String(orderResp.data.id).replace(/\D/g, ''));
        const formattedOrderId = `ORD-${numericId}`;
        setOrderId(formattedOrderId);
        setShowSuccessModal(true);

        // Update table status to Reserved for dine-in orders
        if (orderType === 'dine-in' && tableId) {
          try {
            await updateTableStatusById(tableId, true); // true = Reserved
          } catch (tableUpdateErr) {
            console.error('Failed to update table status:', tableUpdateErr);
            // Don't block order success - table status is secondary
          }
        }

        // Clear order state but handle steward persistence in finally or here?
        // Actually, let's remove the finally block calling handleNewOrder since we handle it here
      }

    } catch (err) {
      console.error('Order placement failed', err);
      alert('Failed to place order. Please try again.');
    } finally {
      // Reset for new order
      setOrderItems([]);
      setTable('');
      setTableId(null);
      setLoadingRejectedOrderId(null);
      setLoadedOrderData(null);

      // Only clear steward if not a steward user
      if (userRole !== 'steward') {
        setSteward('');
        setStewardId(null);
      }
    }
  };

  // Load a previous order into current order summary
  const loadPreviousOrder = (order: PlacedOrder) => {
    setOrderItems([...order.orderItems]);
    setOrderType(order.orderType);
    setTable(order.table);
    setTableId(order.tableId || (order.table ? parseInt(order.table.replace(/\D/g, '')) : null));
    setSteward(order.steward);
    setStewardId(order.stewardId || null);
    setLoadingRejectedOrderId(order.id);
    setLoadedOrderData(order);
  };



  const showOrderPanel = ['admin-dashboard', 'steward-dashboard'].includes(activeView);

  const renderContent = () => {
    const hasPrivilege = (privilegeName: string) => {
      if (!privilegeName) return false;
      const name = privilegeName.trim();
      return rolePrivileges[name] === 1 || userPrivileges[name] === 1;
    };

    const requiredPrivilege = VIEW_TO_PRIVILEGE[activeView];
    if (requiredPrivilege && !hasPrivilege(requiredPrivilege)) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#1a1a2e' }}>Access Denied</h1>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>You do not have permission to view this module.</p>
        </div>
      );
    }

    switch (activeView) {
      case 'admin-dashboard':
        return <AdminDashboard searchQuery={searchQuery} setSearchQuery={setSearchQuery} onAddToOrder={addToOrder} table={table} steward={steward} orderType={orderType} orderItems={orderItems} statusStats={statusStats} totalTables={totalTables} />;
      case 'steward-dashboard':
        return <StewardDashboard searchQuery={searchQuery} setSearchQuery={setSearchQuery} onAddToOrder={addToOrder} totalTables={totalTables} />;
      case 'chef-dashboard':
        return <ChefDashboard />;
      case 'food-content':
        return <FoodContentManagement />;
      case 'user-management':
        return <UserManagement />;
      case 'role-management':
        return <RoleManagement />;
      case 'role-privileges':
        return <RolePrivileges />;
      case 'user-privileges':
        return <UserPrivileges />;
      case 'restaurant-privilege':
        return <RestaurantPrivileges />;
      case 'email-settings':
        return <EmailSettings />;
      case 'tax-settings':
        return <TaxManagement />;
      case 'restaurant-management':
        return <RestaurantList />;
      case 'table-management':
        return <TableManagement />;
      case 'order-management':
        return <OrderManagement />;
      case 'invoice-management':
        return <InvoiceManagement />;

      default:
        // Basic fallback - try to find first available dashboard
        if (hasPrivilege('Admin Dashboard')) return <AdminDashboard searchQuery={searchQuery} setSearchQuery={setSearchQuery} onAddToOrder={addToOrder} table={table} steward={steward} orderType={orderType} orderItems={orderItems} statusStats={statusStats} />;
        if (hasPrivilege('Steward Dashboard')) return <StewardDashboard searchQuery={searchQuery} setSearchQuery={setSearchQuery} onAddToOrder={addToOrder} />;
        if (hasPrivilege('Chef Dashboard')) return <ChefDashboard />;

        return <div style={{ padding: '2rem', textAlign: 'center' }}>Please contact administrator for access.</div>;
    }
  };

  // Cancel order handler
  const cancelRejectedOrder = async () => {
    if (!loadingRejectedOrderId) return;

    try {
      console.log('Cancelling rejected order:', loadingRejectedOrderId);

      // Determine IDs
      const tableId = loadedOrderData?.tableId || parseInt(table.replace(/\D/g, '')) || 1;
      const stewardId = loadedOrderData?.stewardId || 1;
      const grandTotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0); // Approx total

      // Call update API with status: CANCELLED
      // User requested explicit payload structure for cancellation
      const updatePayload: any = {
        grandTotal: grandTotal,
        orderType: orderType.toUpperCase().replace('-', '_'),
        orderstatus: 'CANCELLED',
        status: 'CANCELLED',
        subtotal: grandTotal,
        resturantTablesId: tableId,
        tableId: tableId,
        stewardId,
        orderItems: orderItems.map((item: any) => {
          if (item.orderItemId) {
            return {
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              status: 'PENDING'
            };
          }
          return {
            foodId: item.foodId || (typeof item.id === 'number' ? item.id : parseInt(String(item.id))) || 1,
            quantity: item.quantity,
            status: 'PENDING'
          };
        }),
        taxIds: loadedOrderData?.taxIds || [1, 2]
      };

      // Use robust ID extraction similar to Header.tsx to ensure we target the correct backend ID
      const orderIdToUse = loadedOrderData?.apiOrderId ||
        (typeof loadedOrderData?.id === 'number' ? loadedOrderData.id :
          (loadingRejectedOrderId.startsWith('ORD-') ? loadingRejectedOrderId.replace('ORD-', '') : loadingRejectedOrderId));

      await updateOrderSummary(orderIdToUse, updatePayload);

      // Clear from rejected orders in context
      clearRejectedOrder(loadingRejectedOrderId);

      // Update local state - maybe mark as cancelled/removed from history or update status?
      setPreviousOrders(prev => prev.map(o => o.id === loadingRejectedOrderId ? { ...o, status: 'cancelled' as any } : o));

      setOrderId(loadingRejectedOrderId);
      // Optional: Show success modal or just clear?
      clearOrder();
    } catch (err) {
      console.error('Cancellation failed', err);
      alert('Failed to cancel order. Please try again.');
    }
  };

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
  ].some(priv => {
    const name = priv.trim();
    return rolePrivileges[name] === 1 || userPrivileges[name] === 1;
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f7fb',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <Header activeView={activeView} onNavigate={handleNavigate} onRoleChange={handleRoleChange} onSettingsClick={handleSettingsClick} />

      <SettingsSidebar activeView={activeView} onNavigate={handleNavigate} isOpen={showSettingsSidebar && hasSettingsPrivilege} />

      <div style={{
        display: 'flex',
        paddingTop: '64px',
        paddingLeft: showSettingsSidebar && hasSettingsPrivilege ? '260px' : '0',
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'padding-left 0.2s ease',
      }}>
        <div style={{ 
          flex: 1, 
          minWidth: 0, 
          maxWidth: '100%', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          margin: '16px 16px 0 16px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
        }}>
          {renderContent()}
        </div>

        {showOrderPanel && (
          <OrderPanel
            orderItems={orderItems}
            orderType={orderType}
            setOrderType={handleOrderTypeChange}
            table={table}
            setTable={setTable}
            setTableId={setTableId}
            setSteward={setSteward}
            stewardId={stewardId}
            setStewardId={setStewardId}
            placeOrder={placeOrder}
            clearOrder={clearOrder}
            onCancelOrder={cancelRejectedOrder}
            incrementItem={incrementItem}
            decrementItem={decrementItem}
            userRole={userRole}
            previousOrders={previousOrders}
            onNewOrder={handleNewOrder}
            onLoadPreviousOrder={loadPreviousOrder}
            isRejectedOrder={!!loadingRejectedOrderId}
            canPlaceOrder={orderItems.length > 0 && (orderType === 'take-away' || (!!tableId && !!stewardId))}
          />
        )}
      </div>
      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={`Order ${OrderId} placed successfully!`}
        showSuccess={true}
      />
    </div>
  );
}

export default Dashboard;

