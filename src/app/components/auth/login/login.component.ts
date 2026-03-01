import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SnackbarService } from '../../../shared/services/snackbar.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.loginForm.valid) {
      this.isLoading = true;
      this.authService.login(this.loginForm.value)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: () => {
            this.snackbar.success('Login successful');
            const route = this.authService.getDefaultRoute();
            this.router.navigateByUrl(route, { replaceUrl: true }).then(
              navigated => {
                if (!navigated) {
                  // Guard or router blocked in-app navigation; force full redirect
                  const hash = route.startsWith('/') ? route : '/' + route;
                  window.location.href = `${window.location.origin}${window.location.pathname}#${hash}`;
                }
              }
            );
          },
          error: (err) => {
            const message = err?.error?.message ?? err?.message ?? 'Login failed';
            this.snackbar.error(message);
          }
        });
    } else {
      this.snackbar.warning('Please fill in all required fields correctly');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}