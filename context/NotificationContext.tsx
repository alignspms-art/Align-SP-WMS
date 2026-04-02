
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'PR' | 'PO' | 'MO' | 'STOCK';
  title: string;
  message: string;
  timestamp: string;
  link: string;
  read: boolean;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const newNotifications: Notification[] = [];

    try {
      // 1. Pending PRs
      const { data: prs } = await supabase
        .from('requisitions')
        .select('*')
        .eq('status', 'Pending');
      
      if (prs) {
        prs.forEach(pr => {
          newNotifications.push({
            id: `PR-${pr.id}`,
            type: 'PR',
            title: 'Pending PR Approval',
            message: `Requisition ${pr.pr_no} is waiting for approval.`,
            timestamp: pr.created_at,
            link: '/requisition',
            read: false,
            data: pr
          });
        });
      }

      // 2. Pending POs
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('status', 'Pending');
      
      if (pos) {
        pos.forEach(po => {
          newNotifications.push({
            id: `PO-${po.id}`,
            type: 'PO',
            title: 'Pending PO Approval',
            message: `Purchase Order ${po.po_no} is waiting for approval.`,
            timestamp: po.created_at,
            link: '/purchase-order',
            read: false,
            data: po
          });
        });
      }

      // 3. Pending MOs
      const { data: mos } = await supabase
        .from('move_orders')
        .select('*')
        .eq('status', 'Pending');
      
      if (mos) {
        mos.forEach(mo => {
          newNotifications.push({
            id: `MO-${mo.id}`,
            type: 'MO',
            title: 'Pending MO Approval',
            message: `Move Order ${mo.mo_no} is waiting for approval.`,
            timestamp: mo.created_at,
            link: '/overview',
            read: false,
            data: mo
          });
        });
      }

      // 4. Low Stock (Grouped)
      const { data: items } = await supabase
        .from('items')
        .select('*');
      
      if (items) {
        const lowStockItems = items.filter(item => 
          item.on_hand_stock <= (item.safety_stock || 0) && item.safety_stock > 0
        );

        if (lowStockItems.length > 0) {
          newNotifications.push({
            id: 'LOW-STOCK-SUMMARY',
            type: 'STOCK',
            title: 'Low Stock Alert',
            message: `${lowStockItems.length} items are below safety stock level. Click to view details.`,
            timestamp: new Date().toISOString(),
            link: 'LOW_STOCK_MODAL',
            read: false,
            data: lowStockItems
          });
        }
      }

      // Sort by timestamp
      newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      await fetchNotifications();
    };
    load();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      refreshNotifications: fetchNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
