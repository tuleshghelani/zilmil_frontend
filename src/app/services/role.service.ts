import { Injectable } from "@angular/core";
import { AuthService, UserRole } from "./auth.service";

export interface MenuPermissions {
  canViewCategory: boolean;
  canViewProduct: boolean;
  canViewCustomer: boolean;
  canViewUser: boolean;
}

@Injectable({
  providedIn: "root"
})
export class RoleService {
  constructor(private authService: AuthService) {}

  getMenuPermissions(): MenuPermissions {
    const userRoles = this.authService.getUserRoles();
    const defaultPermissions: MenuPermissions = {
      canViewCategory: false,
      canViewProduct: false,
      canViewCustomer: false,
      canViewUser: false
    };
    if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.STAFF_ADMIN)) {
      return {
        canViewCategory: true,
        canViewProduct: true,
        canViewCustomer: true,
        canViewUser: true
      };
    }
    if (userRoles.includes(UserRole.SALES_AND_MARKETING) || userRoles.includes(UserRole.DISPATCH) || userRoles.includes(UserRole.REPORTER)) {
      return {
        canViewCategory: true,
        canViewProduct: true,
        canViewCustomer: true,
        canViewUser: false
      };
    }
    return defaultPermissions;
  }

  hasMasterMenuItems(): boolean {
    const permissions = this.getMenuPermissions();
    return permissions.canViewCategory || permissions.canViewProduct ||
           permissions.canViewCustomer || permissions.canViewUser;
  }

  hasTransactionMenuItems(): boolean {
    return false;
  }

  hasDispatchQuotationMenuItems(): boolean {
    return false;
  }

  hasEmployeeMenuItems(): boolean {
    return false;
  }
}