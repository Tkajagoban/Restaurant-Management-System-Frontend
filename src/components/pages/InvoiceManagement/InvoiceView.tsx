import styles from './InvoiceView.module.css';
import type { Invoice } from './InvoiceManagement'; // We will ensure this is exported

interface InvoiceViewProps {
  invoice: Invoice;
}

const InvoiceView = ({ invoice }: InvoiceViewProps) => {

  return (
    <div className={styles.invoiceContainer}>
      {/* Header Section */}
      <div className={styles.invoiceHeader}>
        <div className={styles.restaurantInfo}>
          {invoice.restaurantDetails?.logo && (
            <div className={styles.logoContainer}>
              <img
                src={invoice.restaurantDetails.logo}
                alt="Restaurant Logo"
                className={styles.restaurantLogo}
              />
            </div>
          )}
          <h2>{invoice.restaurantDetails?.restaurantName || 'RESTAURANT NAME'}</h2>
          <p>{invoice.restaurantDetails?.address || '123 Food Street, City'}{invoice.restaurantDetails?.city ? `, ${invoice.restaurantDetails.city}` : ''}</p>
          {invoice.restaurantDetails?.email && <p>Email: {invoice.restaurantDetails.email}</p>}
          <p>Tel: {invoice.restaurantDetails?.phone || '+123 456 7890'}</p>
        </div>
        <div className={styles.invoiceMeta}>
          <h3>{invoice.invoiceId}</h3>
          <p>{invoice.dateTime}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Order ID</span>
          <span className={styles.infoValue}>{invoice.orderId}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Order Type</span>
          <span className={styles.infoValue}>{invoice.orderType}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Table</span>
          <span className={styles.infoValue}>{invoice.tableNumber || '-'}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Steward</span>
          <span className={styles.infoValue}>{invoice.stewardName || invoice.createdBy}</span>
        </div>

      </div>

      {/* Items Table */}
      <div className={styles.tableContainer}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Item Name</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th className={styles.totalCol}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'left' }}>{item.name}</td>
                  <td style={{ textAlign: 'right' }}>Rs. {item.price.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td className={styles.totalCol}>
                    Rs. {(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>
                  No items available in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Summary */}
      <div className={styles.summarySection}>
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>Rs.{(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Tax</span>
            <span>Rs.{(invoice.taxAmount || 0).toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Service Charge</span>
            <span>Rs.{(invoice.serviceCharge || 0).toFixed(2)}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.total}`}>
            <span>Grand Total</span>
            <span>Rs.{((invoice.subtotal || 0) + (invoice.taxAmount || 0) + (invoice.serviceCharge || 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InvoiceView;
