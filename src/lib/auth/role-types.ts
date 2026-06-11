// Type-safe enum for user roles
export enum UserRole {
  ADMIN = 'admin',
  GESTOR = 'gestor',
  VIEWER = 'viewer',
}

export type UserRoleType = `${UserRole}`;

// Helper to validate role string
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
