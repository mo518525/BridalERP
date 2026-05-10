import { useAuthStore } from '../store/authStore';

export function usePermissions() {
  const { user, hasPermission } = useAuthStore();
  return {
    canViewFinance: hasPermission('finance'),
    canViewSettings: hasPermission('settings'),
    canViewUsers: hasPermission('users'),
    canDelete: hasPermission('delete'),
    canExport: hasPermission('export'),
    isOwner: user?.role === 'owner',
    isEmployee: user?.role === 'employee',
    isCashier: user?.role === 'cashier',
    role: user?.role,
  };
}
