import { useState } from 'react';
import { useOrderNotifications } from '../../../contexts/OrderNotificationContext';

type NotificationBellVariant = 'steward' | 'admin';

export default function OrderReadyNotification({ variant }: { variant: NotificationBellVariant }) {
  const { notifications, acceptOrder } = useOrderNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  const readyNotifications = notifications.filter((n) => n.status === 'READY_TO_SERVE');
  const readyOrdersCount = readyNotifications.length;

  if (readyOrdersCount === 0) {
    return (
      <button
        className="notification-button"
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label="No orders ready to serve"
      >
        <span className="notification-button-icon">🔔</span>
        <span className="notification-button-text">Ready Orders</span>
      </button>
    );
  }

  const handleAcceptOrder = (orderNumber: string) => {
    if (variant === 'steward') {
      acceptOrder(orderNumber);
      if (readyOrdersCount === 1) {
        setPanelOpen(false);
      }
    }
  };

  return (
    <div className="notification-wrapper">
      {/* Notification Button */}
      <button
        className="notification-button"
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={`${readyOrdersCount} order${readyOrdersCount > 1 ? 's' : ''} ready to serve`}
      >
        <span className="notification-button-icon">🔔</span>
        <span className="notification-button-text">Ready Orders</span>
        {readyOrdersCount > 0 && (
          <span className="notification-badge">{readyOrdersCount}</span>
        )}
      </button>

      {/* Notification Panel - slides from right */}
      {panelOpen && (
        <div className="notification-panel slide-right">
          <div className="notification-panel-header">
            <h3>Ready to Serve Orders</h3>
            <button
              className="notification-panel-close"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="notification-panel-body">
            {readyNotifications.length === 0 ? (
              <p className="no-ready-orders">No orders ready</p>
            ) : (
              readyNotifications.map((notification) => (
                <div key={notification.id} className="ready-order-item">
                  <div className="ready-order-info">
                    <p className="ready-order-number">
                      <strong>Order:</strong> {notification.orderNumber}
                    </p>
                    <p className="ready-order-table">
                      <strong>Table:</strong> {notification.table}
                    </p>
                    <p className="ready-order-status">Status: Order Ready to Serve</p>
                    {variant === 'admin' && (
                      <p className="ready-order-timestamp">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    )}
                  </div>
                  {variant === 'steward' ? (
                    <button
                      className="accept-order-btn"
                      onClick={() => handleAcceptOrder(notification.orderNumber)}
                    >
                      Accept / Collect
                    </button>
                  ) : (
                    <span className="activity-log-label">Update logged</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
