export type AppRole = 'Admin' | 'Editor' | 'Submitter' | 'Viewer' | 'Kiosk';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  tenantId: string;
  personId: string;
}

export interface AuthToken {
  userId: string;
  role: AppRole;
  tenantId: string;
  personId: string;
  iat: number;
  exp: number;
}
