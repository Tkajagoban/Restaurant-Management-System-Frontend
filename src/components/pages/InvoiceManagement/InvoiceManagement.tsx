import { useState, useMemo, useEffect } from 'react';
import styles from './InvoiceManagement.module.css';
import { FaDownload, FaEye, FaPrint, FaSpinner } from 'react-icons/fa';
import { Modal } from '../../organisms/Modal/Modal';
import InvoiceView from './InvoiceView';
import { getAllOrderSummary, getOrderSummaryById, type OrderSummaryItem } from '../../../api/orderSummary/OrderSummary.api';
import { getAllOrderItems, type OrderItemDetail } from '../../../api/orderItem/OrderItem.api';
import { getRestaurantDetails, type RestaurantDetails } from '../../../api/restaurant/Restaurant.api';

// Export Invoice type so it can be used in InvoiceView
export interface InvoiceItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Invoice {
  invoiceId: string;
  orderId: string;
  dateTime: string;
  orderType: 'Dine-In' | 'Takeaway';
  tableNumber?: string;
  stewardName: string;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  grandTotal: number;
  createdBy: string;
  items: InvoiceItem[];
  status: string;
  restaurantDetails?: RestaurantDetails;
}

const InvoiceManagement = () => {
  const [searchId, setSearchId] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // API State
  const [orderSummaryList, setOrderSummaryList] = useState<OrderSummaryItem[]>([]);
  const [orderItemList, setOrderItemList] = useState<OrderItemDetail[]>([]);
  const [restaurantDetails, setRestaurantDetails] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch APIs on component load
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch Order Summaries, Order Items, and Restaurant Details concurrently
        const [orderSummaryResponse, orderItemsResponse, restaurantData] = await Promise.all([
          getAllOrderSummary(0, 100),
          getAllOrderItems(0, 100),
          getRestaurantDetails()
        ]);

        // Filter orders to only show READY_TO_ORDER status
        const allOrders = orderSummaryResponse.content || orderSummaryResponse as any;
        const readyOrders = allOrders.filter((order: any) => order.status === 'READY_TO_ORDER');
        setOrderSummaryList(readyOrders);

        // Set restaurant details
        setRestaurantDetails(restaurantData);

        // Handle order items - they might come from different structure
        if (Array.isArray(orderItemsResponse)) {
          setOrderItemList(orderItemsResponse);
        } else if (orderItemsResponse.content) {
          setOrderItemList(orderItemsResponse.content);
        } else {
          // Extract order items from order summaries if not available separately
          const allItems: OrderItemDetail[] = [];
          readyOrders.forEach((order: any) => {
            if (order.orderItems && Array.isArray(order.orderItems)) {
              allItems.push(...order.orderItems);
            }
          });
          setOrderItemList(allItems);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch invoice data:', err);
        setError(err.message || 'Failed to load invoice data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Map Order Summaries to Invoice format (already filtered by READY_TO_ORDER)
  const invoicesFromAPI = useMemo(() => {
    return orderSummaryList.map((order): Invoice => {
      // Use nested order items directly from the response
      // Fallback to filtering only if nested items are missing (which shouldn't happen with current DTO)
      const orderItems = (order.orderItems && Array.isArray(order.orderItems))
        ? order.orderItems
        : orderItemList.filter((item) => item.orderSummaryId === order.id);

      return {
        invoiceId: `INV-${order.id}`,
        orderId: order.orderId || `ORD-${order.id}`,
        dateTime: order.createdDateTime || new Date().toLocaleString(),
        orderType: order.orderType === 'DINE_IN' ? 'Dine-In' : 'Takeaway',
        tableNumber: order.tableNumber || (order.tableId ? `Table ${order.tableId}` : undefined),
        stewardName: order.stewardName || 'System',
        subtotal: order.subTotal || 0,
        taxAmount: order.taxTotal || 0,
        serviceCharge: order.serviceCharge || 0,
        grandTotal: order.grandTotal || 0,
        createdBy: order.stewardName || 'System',
        status: order.status,
        restaurantDetails: restaurantDetails || undefined,
        items: orderItems.map((item: any) => ({
          name: item.foodName || item.variant?.name || item.itemName || 'Unknown Item',
          price: item.price || 0,
          quantity: item.quantity || 1
        }))
      };
    });
  }, [orderSummaryList, orderItemList, restaurantDetails]);

  const filteredData = useMemo(() => {
    return invoicesFromAPI.filter((inv) => {
      const matchesSearch = inv.orderId.toLowerCase().includes(searchId.toLowerCase());
      const matchesType = typeFilter === 'All' || inv.orderType === typeFilter; // Keep original type comparison for Invoice type
      return matchesSearch && matchesType;
    });
  }, [invoicesFromAPI, searchId, typeFilter]);

  const handleExport = () => {
    const headers = 'Invoice ID,Order ID,Date,Type,Table,Subtotal,Tax,Service Charge,Grand Total,Created By\\n';
    const csvData = filteredData.map(inv =>
      `${inv.invoiceId},${inv.orderId},${inv.dateTime},${inv.orderType},${inv.tableNumber || '-'},${inv.subtotal},${inv.taxAmount},${inv.serviceCharge},${inv.grandTotal},${inv.createdBy}`
    ).join('\\n');

    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const printInvoice = (inv: Invoice) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Invoice - ${inv.invoiceId}</title>
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
            <h2>RESTAURANT NAME</h2>
            <p>123 Food Street, City</p>
            <p>Tel: +123 456 7890</p>
          </div>
          
          <div class="row"><span>Invoice:</span> <span>${inv.invoiceId}</span></div>
          <div class="row"><span>Date:</span> <span>${inv.dateTime}</span></div>
          <div class="row"><span>Order ID:</span> <span>${inv.orderId}</span></div>
          <div class="row"><span>Type:</span> <span>${inv.orderType}</span></div>
          ${inv.tableNumber ? `<div class="row"><span>Table:</span> <span>${inv.tableNumber}</span></div>` : ''}
          
          <div class="divider"></div>
          
          <!-- Items -->
          ${inv.items ? inv.items.map(item => `
            <div class="row">
              <span>${item.name} x${item.quantity}</span>
              <span>Rs. ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('') : ''}
          
          <div class="divider"></div>
          
          <!-- Summary Only -->
          <div class="row"><span>Subtotal:</span> <span>Rs. ${inv.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Tax:</span> <span>Rs. ${inv.taxAmount.toFixed(2)}</span></div>
          <div class="row"><span>Service Charge:</span> <span>Rs. ${inv.serviceCharge.toFixed(2)}</span></div>
          
          <div class="divider"></div>
          
          <div class="row total"><span>GRAND TOTAL:</span> <span>Rs. ${inv.grandTotal.toFixed(2)}</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span>Server:</span> <span>${inv.createdBy}</span></div>
          
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

  const openDetails = async (inv: Invoice) => {
    try {
      // Fetch full order details to get latest tax/service charge/items
      const orderId = inv.invoiceId.replace('INV-', '');
      const fullOrder = await getOrderSummaryById(Number(orderId));

      if (fullOrder) {
        // Merge full order details into the invoice object
        const updatedInvoice: Invoice = {
          ...inv,
          subtotal: fullOrder.subTotal || 0,
          taxAmount: fullOrder.taxTotal || 0,
          serviceCharge: fullOrder.serviceCharge || 0,
          grandTotal: fullOrder.grandTotal || 0,
          items: fullOrder.orderItems?.map((item: any) => ({
            name: item.foodName || item.itemName || 'Unknown Item',
            price: item.price || 0,
            quantity: item.quantity || 1
          })) || inv.items
        };
        setSelectedInvoice(updatedInvoice);
      } else {
        setSelectedInvoice(inv);
      }
    } catch (err) {
      console.error('Failed to fetch full order details:', err);
      // Fallback to existing invoice data if API fails
      setSelectedInvoice(inv);
    }
    setIsModalOpen(true);
  };

  // Loading State
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} size={50} />
          <p>Loading invoice data...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button
            className={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!loading && filteredData.length === 0 && searchId === '' && typeFilter === 'All') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Invoice Management</h1>
        </div>
        <div className={styles.emptyContainer}>
          <h2>No Invoices Ready</h2>
          <p>There are no invoices with READY_TO_ORDER status yet.</p>
          <p>Invoice will be available once the order is ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Invoice Management</h1>
        <div className={styles.headerRight}>
          <p className={styles.count}>Total Invoices: {filteredData.length}</p>
          <button className={styles.exportBtn} onClick={handleExport}>
            <FaDownload /> Export All
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchGroup}>
          {/* <label>Search:</label> */}
          <input
            type="text"
            placeholder="Search by Order ID,Invoice Id..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All types</option>
            <option value="Dine-In">Dine-In</option>
            <option value="Takeaway">Takeaway</option>
          </select>
        </div>
        
      </div>

      {filteredData.length === 0 ? (
        <div className={styles.noResults}>
          <p>No invoices match your search criteria.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Order ID</th>
                <th>Date & Time</th>
                <th>Order Type</th>
                <th>Table No</th>
                <th>Grand Total</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((inv) => (
                <tr key={inv.invoiceId}>
                  <td>{inv.invoiceId}</td>
                  <td>{inv.orderId}</td>
                  <td>{inv.dateTime}</td>
                  <td className={styles.typeTag}>
                    <span className={inv.orderType === 'Dine-In' ? styles.dineIn : styles.takeaway}>
                      {inv.orderType}
                    </span>
                  </td>
                  <td>{inv.tableNumber || '-'}</td>
                  <td className={styles.grandTotal}>Rs. {inv.grandTotal.toFixed(2)}</td>
                  <td>{inv.createdBy}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.viewBtn} onClick={() => openDetails(inv)} title="View Details">
                        <FaEye size={20} />
                      </button>
                      <button className={styles.downloadBtn} onClick={() => printInvoice(inv)} title="Download Details">
                        <FaDownload size={20} />
                      </button>
                      <button className={styles.printBtn} onClick={() => printInvoice(inv)} title="Print Details">
                        <FaPrint size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invoice Details" maxWidth="900px">
        {selectedInvoice && (
          <InvoiceView invoice={selectedInvoice} />
        )}
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
