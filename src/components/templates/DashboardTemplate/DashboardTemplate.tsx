import React, { type ReactNode } from 'react';
import Sidebar from '../../organisms/Sidebar/Sidebar';
import styles from './DashboardTemplate.module.css';

interface DashboardTemplateProps {
    children: ReactNode;
    title: string;
    actions?: ReactNode;
    currentView: string;
    onNavigate: (view: string) => void;
}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
    children,
    title,
    actions,
    currentView,
    onNavigate
}) => {
    return (
        <div className={styles.layout}>
            <Sidebar onNavigate={onNavigate} activeView={currentView} />
            <div className={styles.content}>
                <main className={styles.main}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>{title}</h1>
                        {actions}
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
};
