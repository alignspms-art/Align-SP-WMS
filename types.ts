export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER'
}

// Added Permission interface to fix import error in constants.ts
export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface ModulePermissions {
  view: boolean;
  edit: boolean;
  dl: boolean;
  prepared?: boolean;
  checked?: boolean;
  confirmed?: boolean;
  approved?: boolean;
  accepted?: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  password?: string;
  officeId?: string;
  contactNumber?: string;
  department?: string;
  roleTemplate?: string;
  role: Role;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  avatarUrl?: string;
  permissions: string[]; // Legacy support
  granularPermissions: Record<string, ModulePermissions>;
  createdAt: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  description: string;
  uom_id: string;
  group_id: string;
  type_id: string;
  on_hand_qty: number;
  avg_price: number;
  last_price: number;
}

export interface Requisition {
  id: string;
  pr_no: string;
  reference: string;
  status: string;
  type: string;
  total_value: number;
  created_at: string;
  req_by_name?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}