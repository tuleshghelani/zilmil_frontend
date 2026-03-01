import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RoleService, MenuPermissions } from '../../../services/role.service';
import { UserService } from '../../../services/user.service';
import { EncryptionService } from '../../../shared/services/encryption.service';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  showMasterMenu: boolean = false;
  isMobileMenuOpen: boolean = false;
  clientName: string = '';
  clientLogoImage: string | null = null;
  private authSubscription: Subscription;
  private destroy$ = new Subject<void>();
  permissions: MenuPermissions = {
    canViewCategory: false,
    canViewProduct: false,
    canViewCustomer: false,
    canViewUser: false
  };

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router,
    private userService: UserService,
    private encryptionService: EncryptionService
  ) {
    this.authSubscription = this.authService.authState$.subscribe(
      (isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          this.permissions = this.roleService.getMenuPermissions();
          this.loadCurrentUser();
        }
      }
    );
  }

  ngOnInit(): void {
    this.authService.authState$.subscribe(
      state => {
        this.isAuthenticated = state;
        if (state) {
          this.permissions = this.roleService.getMenuPermissions();
          this.loadCurrentUser();
        }
      }
    );
    this.loadClientNameFromStorage();
  }

  loadCurrentUser(): void {
    const encryptedUserData = localStorage.getItem('encryptedUserData');
    if (encryptedUserData) {
      this.loadClientNameFromStorage();
      return;
    }
    this.userService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const responseString = JSON.stringify(response);
            const encrypted = this.encryptionService.encrypt(responseString);
            localStorage.setItem('encryptedUserData', encrypted);
            if (response.data.client) {
              const logoImage = response.data.client.logoImage;
              if (logoImage && logoImage.trim() !== '') {
                this.clientLogoImage = logoImage;
                this.clientName = '';
              } else {
                this.clientLogoImage = null;
                if (response.data.client.name) {
                  this.clientName = response.data.client.name;
                }
              }
            }
          }
        },
        error: (error) => {
          console.error('Error loading current user:', error);
        }
      });
  }

  loadClientNameFromStorage(): void {
    const encryptedUserData = localStorage.getItem('encryptedUserData');
    if (encryptedUserData) {
      try {
        const decrypted: any = this.encryptionService.decrypt(encryptedUserData);
        if (decrypted) {
          let userData: any = null;
          if (typeof decrypted === 'object' && decrypted !== null) {
            userData = decrypted;
          } else if (typeof decrypted === 'string') {
            userData = JSON.parse(decrypted);
          }
          if (userData && userData.data && userData.data.client) {
            const client = userData.data.client;
            const logoImage = client.logoImage;
            if (logoImage && logoImage.trim() !== '') {
              this.clientLogoImage = logoImage;
              this.clientName = '';
            } else {
              this.clientLogoImage = null;
              if (client.name) {
                this.clientName = client.name;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error decrypting user data:', error);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.mobile-menu-toggle')) {
      this.showMasterMenu = false;
      if (!target.closest('.nav-links')) {
        this.isMobileMenuOpen = false;
      }
    }
  }

  @HostListener('document:touchend', ['$event'])
  onDocumentTouchEnd(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.mobile-menu-toggle')) {
      this.showMasterMenu = false;
      if (!target.closest('.nav-links')) {
        this.isMobileMenuOpen = false;
      }
    }
  }

  toggleMobileMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleMasterMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showMasterMenu = !this.showMasterMenu;
  }

  isMasterActive(): boolean {
    const currentUrl = this.router.url;
    return ['/category', '/product', '/customer', '/users'].some(path =>
      currentUrl.startsWith(path)
    );
  }

  closeAllMenus(): void {
    this.showMasterMenu = false;
    this.isMobileMenuOpen = false;
  }

  hasMasterMenuItems(): boolean {
    if (this.authService.hasRole('DEALER')) {
      return false;
    }
    return this.roleService.hasMasterMenuItems();
  }

  getUserDisplayName(): string {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return 'User';
      const user = JSON.parse(userStr);
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    } catch {
      return 'User';
    }
  }

  getUserRoles(): string {
    const roles = this.authService.getUserRoles();
    return roles.join(', ') || 'No roles';
  }

  logout(): void {
    this.authService.logout();
    window.location.href = window.location.origin + '/login?_t=' + new Date().getTime();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isStaffAdmin(): boolean {
    return this.authService.isStaffAdmin();
  }

  isProductManager(): boolean {
    return this.authService.isProductManager();
  }
}
