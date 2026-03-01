import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { EncryptionService } from '../shared/services/encryption.service';
import { Router } from '@angular/router';

interface TokenResponse {
  success: boolean;
  message?: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF_ADMIN = 'STAFF_ADMIN',
  DISPATCH = 'DISPATCH',
  SALES_AND_MARKETING = 'SALES_AND_MARKETING',
  DEALER = 'DEALER',
  HR = 'HR',
  REPORTER = 'REPORTER'
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStateSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  authState$ = this.authStateSubject.asObservable();
  private refreshTokenInProgress = false;

  constructor(
    private http: HttpClient,
    private encryptionService: EncryptionService,
    private router: Router
  ) { }

  login(credentials: { email: string; password: string; clientId?: number }): Observable<any> {
    const body = {
      email: credentials.email,
      password: credentials.password,
      ...(credentials.clientId != null && { clientId: credentials.clientId })
    };
    return this.http.post(`${environment.apiUrl}/api/auth/login`, body).pipe(
      tap((response: any) => {
        // Support both flat and wrapped { data: { ... } } response
        const data = response?.data ?? response;
        const accessToken = data?.accessToken ?? response?.accessToken;
        const refreshToken = data?.refreshToken ?? response?.refreshToken;
        const clientId = data?.clientId ?? response?.clientId;
        const user = data?.user ?? response?.user;

        if (accessToken) {
          localStorage.setItem('token', accessToken);
        }
        if (clientId != null) {
          localStorage.setItem('clientId', String(clientId));
        }
        if (refreshToken) {
          try {
            const encryptedRefreshToken = this.encryptionService.encrypt(refreshToken);
            localStorage.setItem('refreshToken', encryptedRefreshToken);
          } catch (_) { /* ignore encrypt error */ }
        }

        // Build user for storage when API returns flat shape (firstName, lastName, email, roles at top level)
        const userForStorage = user ?? (data && (data.firstName != null || data.email != null)
          ? { firstName: data.firstName, lastName: data.lastName, email: data.email, roles: data.roles }
          : null);
        if (userForStorage != null) {
          try {
            localStorage.setItem('user', typeof userForStorage === 'string' ? userForStorage : JSON.stringify(userForStorage));
          } catch (_) { /* ignore */ }
        }

        // Roles: API may send string "[ADMIN]" or array ["ADMIN"]; store so getUserRoles() can parse (comma-separated or [x,y])
        const rawRoles = userForStorage?.roles ?? data?.roles ?? response?.roles ?? user?.roles;
        let rolesToStore: string;
        if (rawRoles == null || rawRoles === '') {
          rolesToStore = '[]';
        } else if (typeof rawRoles === 'string') {
          rolesToStore = rawRoles.trim(); // e.g. "[ADMIN]" or "ADMIN, STAFF_ADMIN"
        } else if (Array.isArray(rawRoles)) {
          rolesToStore = rawRoles.map((r: any) => typeof r === 'string' ? r : r?.name ?? r?.authority ?? r?.role).filter(Boolean).join(', ');
        } else {
          rolesToStore = '[]';
        }
        try {
          localStorage.setItem('userRoles', this.encryptionService.encrypt(rolesToStore));
        } catch (_) { /* ignore */ }

        this.authStateSubject.next(true);
      })
    );
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }

  refreshToken(): Observable<TokenResponse> {
    if (this.refreshTokenInProgress) {
      return throwError(() => new Error('Refresh token request in progress'));
    }

    this.refreshTokenInProgress = true;
    const encryptedRefreshToken = localStorage.getItem('refreshToken');

    if (!encryptedRefreshToken) {
      this.handleAuthError();
      return throwError(() => new Error('No refresh token available'));
    }

    const refreshToken = this.encryptionService.decrypt(encryptedRefreshToken);

    return this.http.post<TokenResponse>(
      `${environment.apiUrl}/api/refresh-token/new`,
      { refreshToken },
      { headers: {} }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          localStorage.setItem('token', response.data.accessToken);
          if (response.data.refreshToken) {
            const encryptedNewRefreshToken = this.encryptionService.encrypt(response.data.refreshToken);
            localStorage.setItem('refreshToken', encryptedNewRefreshToken);
          }
        }
        this.refreshTokenInProgress = false;
      }),
      catchError(error => {
        this.refreshTokenInProgress = false;
        if (error.status === 400) {
          this.handleAuthError();
        }
        return throwError(() => error);
      })
    );
  }

  private handleAuthError(): void {
    this.logout();
    // Force hard refresh to bypass all cache like Ctrl+Shift+F5
    window.location.href = window.location.origin + '/login?_t=' + new Date().getTime();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRoles');
    localStorage.removeItem('clientId');
    this.authStateSubject.next(false);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserRoles(): string[] {
    const encryptedRoles = localStorage.getItem('userRoles');
    if (!encryptedRoles) return [];

    try {
      const rolesString = this.encryptionService.decrypt(encryptedRoles);
      if (!rolesString || typeof rolesString !== 'string') return [];
      return rolesString
        .replace('[', '')
        .replace(']', '')
        .split(',')
        .map(role => role.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  hasRole(role: string): boolean {
    const userRoles = this.getUserRoles();
    return userRoles.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isProductManager(): boolean {
    return this.hasRole('STAFF_ADMIN');
  }

  isStaffAdmin(): boolean {
    return this.hasRole(UserRole.STAFF_ADMIN);
  }

  getDefaultRoute(): string {
    const userRoles = this.getUserRoles();
    if (userRoles.length === 0) {
      return '/customer'; // /category requires ADMIN|STAFF_ADMIN; use route without RoleGuard
    }
    if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.STAFF_ADMIN) ||
        userRoles.includes(UserRole.SALES_AND_MARKETING) || userRoles.includes(UserRole.DISPATCH) ||
        userRoles.includes(UserRole.REPORTER)) {
      return '/category';
    }
    if (userRoles.includes(UserRole.DEALER)) {
      return '/customer';
    }
    return '/customer';
  }
}