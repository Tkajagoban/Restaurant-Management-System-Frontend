import { FaMoneyBillWave, FaClipboardList, FaChair, FaUtensils } from 'react-icons/fa';
import styles from './StatusSummary.module.css';

export interface StatusStats {
    todaysSales: number;
    totalOrdersToday: number;
    tablesOccupied: number;
    tablesFree: number;
    ordersInPreparation: number;
}

interface StatusSummaryProps {
    stats: StatusStats;
}

export default function StatusSummary({ stats }: StatusSummaryProps) {
    return (
        <div className={styles.statusSummaryContainer}>
            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <FaMoneyBillWave />
                </div>
                <div className={styles.statContent}>
                    <span className={styles.statValue}>Rs. {stats.todaysSales.toLocaleString()}</span>
                    <span className={styles.statLabel}>Today's Sales</span>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
                    <FaClipboardList />
                </div>
                <div className={styles.statContent}>
                    <span className={styles.statValue}>{stats.totalOrdersToday}</span>
                    <span className={styles.statLabel}>Orders Today</span>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
                    <FaChair />
                </div>
                <div className={styles.statContent}>
                    <span className={styles.statValue}>{stats.tablesOccupied}</span>
                    <span className={styles.statLabel}>Tables Occupied</span>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>
                    <FaChair />
                </div>
                <div className={styles.statContent}>
                    <span className={styles.statValue}>{stats.tablesFree}</span>
                    <span className={styles.statLabel}>Tables Free</span>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fae8ff', color: '#a855f7' }}>
                    <FaUtensils />
                </div>
                <div className={styles.statContent}>
                    <span className={styles.statValue}>{stats.ordersInPreparation}</span>
                    <span className={styles.statLabel}>In Preparation</span>
                </div>
            </div>
        </div>
    );
}
