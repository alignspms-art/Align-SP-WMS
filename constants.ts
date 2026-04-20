import { Role, Permission } from './types';

export const THEME_COLORS = {
  primary: '#2d808e', 
  secondary: '#17a2b8',
  background: '#f1f3f4',
  card: '#ffffff',
  text: '#333333',
  muted: '#6c757d',
  border: '#dee2e6',
  danger: '#dc3545'
};

export const PERMISSIONS: Permission[] = [
  { id: 'view_dashboard', name: 'View Dashboard', description: 'Can access the main dashboard' },
  { id: 'manage_users', name: 'Manage Users', description: 'Can add, edit, and delete users' },
  { id: 'view_reports', name: 'View Reports', description: 'Can view platform statistics' },
  { id: 'edit_settings', name: 'Edit Settings', description: 'Can modify application configuration' }
];

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: ['view_dashboard', 'manage_users', 'view_reports', 'edit_settings'],
  [Role.MANAGER]: ['view_dashboard', 'view_reports'],
  [Role.USER]: ['view_dashboard']
};