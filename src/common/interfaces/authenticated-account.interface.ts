/**
 * Account payload attached to request.user
 * after successful JWT authentication.
 */

export interface AuthenticatedAccount {
  id: number;

  phone: string;

  roles: {
    id: number;

    permissions: string[];
  }[];
}