import styles from './InvoiceView.module.css';
import { FaPrint } from 'react-icons/fa';
import type { Invoice } from './InvoiceManagement'; // We will ensure this is exported

interface InvoiceViewProps {
  invoice: Invoice;
}

const InvoiceView = ({ invoice }: InvoiceViewProps) => {

  const printInvoice = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceId}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${invoice.restaurantDetails?.restaurantName || 'RESTAURANT NAME'}</h2>
            <p>${invoice.restaurantDetails?.address || '123 Food Street, City'}</p>
            <p>Tel: ${invoice.restaurantDetails?.phone || '+123 456 7890'}</p>
          </div>
          
          <div class="row"><span>Invoice:</span> <span>${invoice.invoiceId}</span></div>
          <div class="row"><span>Date:</span> <span>${invoice.dateTime}</span></div>
          <div class="row"><span>Order ID:</span> <span>${invoice.orderId}</span></div>
          <div class="row"><span>Type:</span> <span>${invoice.orderType}</span></div>
          ${invoice.tableNumber ? `<div class="row"><span>Table:</span> <span>${invoice.tableNumber}</span></div>` : ''}
          
          <div class="divider"></div>
          
          <!-- Items -->
          ${invoice.items ? invoice.items.map(item => `
            <div class="row">
              <span>${item.name} x${item.quantity}</span>
              <span>Rs. ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('') : ''}
          
          <div class="divider"></div>
          
          <div class="row"><span>Subtotal:</span> <span>Rs.${invoice.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Tax:</span> <span>Rs.${invoice.taxAmount.toFixed(2)}</span></div>
          <div class="row"><span>Service Charge:</span> <span>Rs.${invoice.serviceCharge.toFixed(2)}</span></div>
          
          <div class="divider"></div>
          
          <div class="row total"><span>GRAND TOTAL:</span> <span>Rs.${(invoice.subtotal + invoice.taxAmount + invoice.serviceCharge).toFixed(2)}</span></div>
          
          <div class="divider"></div>
        
          <div class="row"><span>Steward:</span> <span>${invoice.stewardName || invoice.createdBy}</span></div>
          
          <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>Please come again.</p>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
