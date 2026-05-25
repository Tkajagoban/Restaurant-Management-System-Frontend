import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { FaUtensils, FaChair, FaChevronDown, FaTimes, FaHistory } from 'react-icons/fa';
import type { PlacedOrder } from '../../pages/DashboardOverview/Dashboard';
import { getAllTables, type FetchTablesData } from '../../../api/tableManagement/TableManagement.api';
import { getStewards } from '../../../api/dashboardOverview/DashboardOverview.api';
import { Modal } from '../Modal/Modal';
import type { User } from '../../../api/userManagement/UserManagement.api';
import { getActiveTaxes, type TaxItem } from '../../../api/taxManagement/TaxManagement.api';
import { useAuth } from '../../../contexts/AuthContext';

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  isRejected?: boolean;
}

type Props = {
  orderItems: OrderItem[]
  orderType: 'dine-in' | 'take-away'
  setOrderType: (type: 'dine-in' | 'take-away') => void
  table: string
  setTable: Dispatch<SetStateAction<string>>
  setTableId: Dispatch<SetStateAction<number | null>>
  setSteward: Dispatch<SetStateAction<string>>
  stewardId: number | null
  setStewardId: Dispatch<SetStateAction<number | null>>
  placeOrder: () => void
  clearOrder: () => void
  incrementItem: (name: string) => void
  decrementItem: (name: string) => void
  userRole?: 'admin' | 'steward' | 'chef'
  // New/Previous Orders props
  previousOrders: PlacedOrder[]
  onNewOrder: () => void
  onLoadPreviousOrder: (order: PlacedOrder) => void

  isRejectedOrder?: boolean
  onCancelOrder?: () => void
  canPlaceOrder?: boolean
}

export default function OrderPanel({
  orderItems,
  orderType,
  setOrderType,
  table,
  setTable,
  setTableId,
  setSteward,
  stewardId,
  setStewardId,
  placeOrder,
  clearOrder,
  onCancelOrder,
  incrementItem,
  decrementItem,
  previousOrders,
  onNewOrder,
  onLoadPreviousOrder,
  isRejectedOrder = false,
  canPlaceOrder = true,
}: Props) {
  const { rolePrivileges } = useAuth();
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [showPreviousOrdersPopup, setShowPreviousOrdersPopup] = useState(false);
  const [tables, setTables] = useState<FetchTablesData[]>([]);
  const [stewardList, setStewardList] = useState<User[]>([]);

  // Tax Management state
  const [taxes, setTaxes] = useState<TaxItem[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);
  const [taxError, setTaxError] = useState(false);

  const hasPrivilege = (privilegeName: string) => rolePrivileges[privilegeName] === 1;

  // Fetch taxes on component mount
  useEffect(() => {
    let mounted = true;
    const fetchTaxes = async () => {
      try {
        setTaxLoading(true);
        const activeTaxes = await getActiveTaxes();
        if (!mounted) return;
        setTaxes(activeTaxes);
        setTaxError(false);
      } catch (err) {
        console.error('Failed to load taxes', err);
        if (!mounted) return;
        setTaxError(true);
      } finally {
        if (mounted) setTaxLoading(false);
      }
    };
    fetchTaxes();
    return () => { mounted = false; };
  }, []);

  // Helper to detect service charge based on name (matches backend logic)
  const isServiceChargeName = (name: string) => {
    const n = name.toLowerCase().trim();
    return n.includes('service charge') ||
      n === 'sc' || n === 's.c.' || n === 'svc' ||
      n.startsWith('service ');
  };

  const serviceChargeTax = taxes.find(t => isServiceChargeName(t.name));
  const taxItems = taxes.filter(t => !isServiceChargeName(t.name));

  const SERVICE_CHARGE_PERCENT = serviceChargeTax?.percentage ?? 0;
  const TAX_PERCENT = taxItems.reduce((sum, t) => sum + t.percentage, 0);

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Service Charge applies ONLY for Dine-In orders
  const serviceCharge = orderType === 'dine-in' ? (subtotal * SERVICE_CHARGE_PERCENT) / 100 : 0;
  const tax = (subtotal * TAX_PERCENT) / 100;
  const grandTotal = subtotal + serviceCharge + tax;

  const handleTableSelect = (tableData: FetchTablesData) => {
    // Prevent selecting reserved tables
    if (tableData.status === true) return;
    setTable(`Table ${tableData.tableNumber}`);
    setTableId(tableData.id); // Save the actual database ID
    setShowTablePopup(false);
  };

  // Fetch table status list when popup opens
  useEffect(() => {
    if (!showTablePopup) return;
    let mounted = true;
    (async () => {
      try {
        const response = await getAllTables();
        if (!mounted) return;
        setTables(response.data.content || response);
      } catch (err) {
        console.error('Failed to load tables', err);
      }
    })();
    return () => { mounted = false; };
  }, [showTablePopup]);

  // Fetch Stewards
  useEffect(() => {
    if (orderType === 'dine-in' && hasPrivilege('Admin Dashboard')) {
      const fetchStewards = async () => {
        try {
          const stewards = await getStewards("1");
          setStewardList(stewards);
        } catch (err) {
          console.error("Failed to load stewards", err);
        }
      };

      fetchStewards();
    }
  }, [orderType, rolePrivileges]);

  const handleLoadOrder = (order: PlacedOrder) => {
    onLoadPreviousOrder(order);
    setShowPreviousOrdersPopup(false);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle ESC key to close Previous Orders popup
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPreviousOrdersPopup) {
        setShowPreviousOrdersPopup(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showPreviousOrdersPopup]);

  return (
    <div className="right-panel">
      {/* New and Previous Orders Buttons */}
      <div className="order-action-buttons">
        <button className="order-action-btn new-btn" onClick={onNewOrder}>
          New
        </button>
        <button
          className="order-action-btn previous-btn"
          onClick={() => setShowPreviousOrdersPopup(true)}
        >
          <FaHistory /> Previous Orders
        </button>
      </div>

      {/* Previous Orders Modal */}
      <Modal
        isOpen={showPreviousOrdersPopup}
        onClose={() => setShowPreviousOrdersPopup(false)}
        title="Previous Orders"
      >
        <div className="previous-orders-list">
          {previousOrders.length === 0 ? (
            <p className="no-previous-orders">No previous orders</p>
          ) : (
            previousOrders.map((order) => (
              <button
                key={order.id}
                className="previous-order-item"
                onClick={() => handleLoadOrder(order)}
              >
                <div className="previous-order-header">
                  <span className="previous-order-id">{order.id}</span>
                  <span className="previous-order-time">{formatTime(order.placedAt)}</span>
                </div>
                <div className="previous-order-details">
                  <span>{order.table || 'No table'}</span>
                  <span>•</span>
                  <span>{order.steward || 'No steward'}</span>
                  <span>•</span>
                  <span>{order.orderItems.length} items</span>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      <h3>Order Summary</h3>
      <p className="order-date">{new Date().toLocaleString()}</p>

      {/* Table Selection with Popup Modal */}
      {orderType === 'dine-in' && (
        <div className="table-selection-container">
          <button
            className="table-select-btn"
            onClick={() => setShowTablePopup(true)}
          >
            <span className="table-icon"><FaUtensils /></span>
            <span className="table-text">{table || 'Select Table'}</span>
            <span className="table-arrow"><FaChevronDown /></span>
          </button>

          {/* Table Selection Popup Modal */}
          {showTablePopup && (
            <>
              <div
                className="table-popup-overlay"
                onClick={() => setShowTablePopup(false)}
              />
              <div className="table-popup-modal">
                <div className="table-popup-header">
                  <h4>Select Table</h4>
                  <button
                    className="table-popup-close"
                    onClick={() => setShowTablePopup(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="table-popup-grid">
                  {tables.length === 0 ? (
                    // Fallback: no tables available - show message instead of fake tables
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      No tables available. Please add tables in Table Management.
                    </div>
                  ) : (
                    tables.map(t => {
                      const isReserved = t.status === true;
                      return (
                        <button
                          key={t.tableNumber}
                          className={`table-popup-item ${table === `Table ${t.tableNumber}` ? 'selected' : ''} ${isReserved ? 'reserved' : 'unreserved'}`}
                          onClick={() => handleTableSelect(t)}
                          disabled={isReserved}
                          aria-disabled={isReserved}
                          style={{
                            opacity: isReserved ? 0.6 : 1,
                            cursor: isReserved ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <span className="table-popup-icon"><FaChair /></span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                            <span className="table-popup-number">Table {t.tableNumber}</span>
                            <span className="guest-count-badge">Guests: {t.guestCount}</span>
                            <span className={`table-status-badge ${isReserved ? 'reserved' : 'unreserved'}`}>
                              {isReserved ? 'Reserved' : 'unreserved'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Show Assign Steward only for users with Admin Dashboard access when dine-in */}
      {orderType === 'dine-in' && hasPrivilege('Admin Dashboard') && (
        <select
          className="assign-select"
          value={stewardId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            const sId = val === '' ? null : Number(val);
            setStewardId(sId);

            // Find the steward name for UI display
            const selectedSteward = stewardList.find(s => s.id === sId);
            if (selectedSteward) {
              setSteward(`${selectedSteward.firstName} ${selectedSteward.lastName}`);
            } else {
              setSteward('');
            }
          }}
        >
          <option value="">Assign Steward</option>
          {stewardList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      )}

      <div className="order-items">
        {orderItems.length === 0 ? (
          <p>No items in order.</p>
        ) : (
          orderItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className={`order-item ${item.isRejected ? 'rejected-item' : ''}`}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span className="order-item-name">{item.name}</span>
                {item.isRejected && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>REJECTED</span>
                )}
              </div>
              <div className="order-qty-controls">
                <button className="qty-btn" onClick={() => decrementItem(item.name)}>-</button>
                <span className="qty-value">{item.quantity}</span>
                <button className="qty-btn" onClick={() => incrementItem(item.name)}>+</button>
              </div>
              <span className="order-item-price">Rs. {(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

      {/* Order Summary Breakdown */}
      {/* Tax Error Modal - Only for API failure */}
      <Modal
        isOpen={taxError}
        onClose={() => setTaxError(false)}
        title="Error"
      >
        <p>Failed to load tax configuration. Please try again later.</p>
        <button
          className="place-order-btn"
          style={{ marginTop: '1rem' }}
          onClick={() => setTaxError(false)}
        >
          OK
        </button>
      </Modal>

      {/* Order Summary Breakdown */}
      {orderItems.length > 0 && !taxLoading && (
        <div className="order-summary-breakdown">
          <div className="order-summary-row">
            <span>Subtotal:</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>

          {/* Service Charge */}
          <div className="order-summary-row">
            <span>
              {orderType === 'dine-in'
                ? `${serviceChargeTax?.name || 'Service Charge'} (${SERVICE_CHARGE_PERCENT}%):`
                : 'Service Charge:'}
            </span>
            <span>Rs. {serviceCharge.toFixed(2)}</span>
          </div>

          {/* Tax / VAT */}
          <div className="order-summary-row">
            <span>{taxItems.length > 0 ? `${taxItems.map(t => t.name).join(' + ')} (${TAX_PERCENT}%):` : `Tax (${TAX_PERCENT}%):`}</span>
            <span>Rs. {tax.toFixed(2)}</span>
          </div>

          <div className="order-summary-divider"></div>
          <div className="order-summary-row order-grand-total">
            <span>Grand Total:</span>
            <span>Rs. {grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {hasPrivilege('Order Management') && (
        <div className="order-type-btns">
          <button className={`order-type-btn ${orderType === 'dine-in' ? 'dine-in' : ''}`} onClick={() => setOrderType('dine-in')}>Dine-in</button>
          <button className={`order-type-btn ${orderType === 'take-away' ? 'dine-in' : 'take-away'}`} onClick={() => setOrderType('take-away')}>Take-Away</button>
        </div>
      )}

      <button
        className="place-order-btn"
        onClick={placeOrder}
        disabled={!canPlaceOrder}
        type="button"
        style={{
          opacity: canPlaceOrder ? 1 : 0.5,
          cursor: canPlaceOrder ? 'pointer' : 'not-allowed'
        }}
      >
        {isRejectedOrder ? 'Update Order' : 'Place Order'}
      </button>
      <button className="clear-order-btn" onClick={isRejectedOrder && onCancelOrder ? onCancelOrder : clearOrder}>
        {isRejectedOrder ? 'Cancel Order' : 'Clear Order'}
      </button>
    </div>
  )
}
