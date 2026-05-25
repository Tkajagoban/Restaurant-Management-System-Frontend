import { useEffect, useState, useMemo } from 'react';
import styles from './OrderManagement.module.css';
import { SearchBar } from '../../molecules/SearchBar/SearchBar';
import { DataTable, type Column } from '../../organisms/DataTable/DataTable';
import { Pagination } from '../../molecules/Pagination/Pagination';
import { Modal } from '../../organisms/Modal/Modal';
import { FaEye } from 'react-icons/fa';
import { getOrders, type Order } from '../../../api/order/Order.api';
import { getOrderSummaryById } from '../../../api/orderSummary/OrderSummary.api';

const ITEMS_PER_PAGE = 10;

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    load();
  }, [statusFilter]);

  const load = async () => {
    try {
      const params: any = { size: 1000 }; // Fetch a large batch to support client-side filter if backend ignores
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }

      const response = await getOrders(params);

      // Handle various possible response structures
      let orderList = [];
      if (Array.isArray(response)) {
        orderList = response;
      } else if (response && response.data && Array.isArray(response.data.content)) {
        orderList = response.data.content;
      } else if (response && response.content && Array.isArray(response.content)) {
        orderList = response.content;
      } else if (response && response.data && Array.isArray(response.data)) {
        orderList = response.data;
      }

      // Sort orders by ID in descending order so newest orders appear at the top
      orderList.sort((a: any, b: any) => Number(b.id) - Number(a.id));

      setOrders(orderList);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load orders', err);
    }
  };

  // Derived filtered list
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    const f = orders.filter(o => {
      if (q) {
        const inId = o.id.toString().includes(q) || (o.orderId && o.orderId.toLowerCase().includes(q));
        const inSteward = (o.stewardName || '').toLowerCase().includes(q);
        if (!inId && !inSteward) return false;
      }

      if (statusFilter !== 'All' && o.status !== statusFilter) return false;

      return true;
    });

    setFiltered(f);
    setCurrentPage(1);
  }, [orders, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const columns: Column<Order>[] = useMemo(() => [
    { header: 'Order ID', accessor: (o) => o.orderId || `ORD-${o.id}` },
    { header: 'Date & Time', accessor: (o) => o.createdDateTime || '-' },
    { header: 'Table', accessor: (o) => o.tableNumber || '-' },
    { header: 'Steward', accessor: (o) => o.stewardName || '-' },
    { header: 'Order Type', accessor: (o) => o.orderType || '-' },
    {
      header: 'Status', accessor: (o) => (
        <span className={`${styles.statusBadge} ${o.status === 'ACCEPTED' || o.status === 'PLACED' ? styles.paid : styles.unpaid}`}>
          {o.status || 'N/A'}
        </span>
      )
    },
    { header: 'Total Amount', accessor: (o) => `Rs.${(o.grandTotal || 0).toFixed(2)}` },
    {
      header: 'Action', accessor: (o) => (
        <div className={styles.actions}>
          <button className={styles.actionBtn} title="View" onClick={async () => {
            try {
              const fullDetails = await getOrderSummaryById(Number(o.id));
              if (fullDetails) {
                // Get items from API response, or fallback to original order items
                const apiItems = fullDetails.orderItems || [];
                const originalItems = o.orderItems || [];

                // Use API items if available, otherwise use original - never lose items
                const sourceItems = apiItems.length > 0 ? apiItems : originalItems;

                const updatedOrder: Order = {
                  ...o,
                  subTotal: fullDetails.subTotal ?? o.subTotal ?? 0,
                  taxTotal: fullDetails.taxTotal ?? o.taxTotal ?? 0,
                  serviceCharge: fullDetails.serviceCharge ?? o.serviceCharge ?? 0,
                  grandTotal: fullDetails.grandTotal ?? o.grandTotal ?? 0,
                  // Map items with comprehensive fallback handling
                  orderItems: sourceItems.map((item: any) => ({
                    itemName: item.foodName || item.itemName || item.name || 'Deleted Item',
                    name: item.name || item.itemName || item.foodName || 'Deleted Item',
                    price: item.price ?? item.unitPrice ?? 0,
                    quantity: item.quantity ?? 1,
                    status: item.status
                  }))
                };
                setSelectedOrder(updatedOrder);
              } else {
                setSelectedOrder(o);
              }
            } catch (err) {
              console.error('Failed to fetch order details', err);
              setSelectedOrder(o);
            }
            setIsViewOpen(true);
          }}><FaEye size={20} /></button>

        </div>
      )
    }
  ], [orders]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Order Management</h1>
      </div>

      <div className={styles.toolbar}>
        <SearchBar placeholder="Search by Order ID or Steward..." onSearch={(v) => setSearchQuery(v)} />

        <div className={styles.filters}>
          <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="PLACE_ORDER">Place Order</option>
            <option value="IN_PREPARED">In Preparation (Accepted)</option>
            <option value="READY_TO_SERVE">Ready to Serve</option>
            <option value="READY_TO_ORDER">Ready to Order (Picked)</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

        </div>
      </div>

      <DataTable columns={columns} data={pageData} keyExtractor={(o) => o.id.toString()} />

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Order Details">
        {selectedOrder && (
          <div className={styles.orderDetailContent}>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}><strong>Order ID:</strong> ORD-{selectedOrder.id}</div>
              <div className={styles.detailItem}><strong>Date:</strong> {selectedOrder.createdDateTime || 'N/A'}</div>
              <div className={styles.detailItem}><strong>Type:</strong> {selectedOrder.orderType}</div>
              <div className={styles.detailItem}><strong>Status:</strong> {selectedOrder.status}</div>
              <div className={styles.detailItem}><strong>Table:</strong> {selectedOrder.tableNumber || 'N/A'}</div>
              <div className={styles.detailItem}><strong>Steward:</strong> {selectedOrder.stewardName || 'N/A'}</div>
            </div>

            <div className={styles.itemListContainer}>
              <h3>Item List</h3>
              <table className={styles.itemTable}>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.orderItems.map((it, idx) => {
                    // Use fallback values to ensure items always display
                    const itemName = it.itemName || it.name || 'Deleted Item';
                    const itemPrice = it.price ?? 0;
                    const itemQty = it.quantity ?? 1;
                    return (
                      <tr key={idx}>
                        <td>{itemName}</td>
                        <td>Rs.{itemPrice.toFixed(2)}</td>
                        <td>{itemQty}</td>
                        <td>Rs.{(itemPrice * itemQty).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.orderSummary}>
              <div className={styles.summaryRow}>
                <span>Sub Total:</span>
                <strong>Rs.{(selectedOrder.subTotal || 0).toFixed(2)}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Tax:</span>
                <strong>Rs.{(selectedOrder.taxTotal || 0).toFixed(2)}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Service Charge:</span>
                <strong>Rs.{(selectedOrder.serviceCharge || 0).toFixed(2)}</strong>
              </div>

              <div className={styles.summaryRow} style={{ borderTop: '2px solid #eee', paddingTop: '10px', marginTop: '10px' }}>
                <span>Grand Total:</span>
                <strong style={{ fontSize: '1.2rem', color: '#2c3e50' }}>Rs.{((selectedOrder.subTotal || 0) + (selectedOrder.taxTotal || 0) + (selectedOrder.serviceCharge || 0)).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
}
