import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { trigger, transition, style, animate } from '@angular/animations';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
  standalone: true,
  imports: [
    LoaderComponent,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    PaginationComponent,
    RouterModule
  ],
  animations: [
    trigger('dialogAnimation', [
      transition(':enter', [
        style({ transform: 'translate(-50%, -48%) scale(0.95)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translate(-50%, -48%) scale(0.95)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProductComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  categories: Category[] = [];
  productForm!: FormGroup;
  searchForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  editingId?: number;

  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;
  isDialogOpen = false;
  private destroy$ = new Subject<void>();
  private readonly isBrowser = typeof window !== 'undefined';
  private dropdownPinned = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private snackbarService: SnackbarService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.setupCalculatedPriceUpdates();
  }

  private setupCalculatedPriceUpdates(): void {
    this.productForm.get('categoryId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCalculatedPrices());
    this.productForm.get('quantity')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCalculatedPrices());
    this.productForm.get('tinPrice')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCalculatedPrices());
  }

  /** price = (category.tenKgPrice / 10) * quantity; totalPrice = price + tinPrice */
  updateCalculatedPrices(): void {
    const categoryId = this.productForm.get('categoryId')?.value;
    const quantity = this.productForm.get('quantity')?.value != null && this.productForm.get('quantity')?.value !== ''
      ? Number(this.productForm.get('quantity')?.value) : null;
    const tinPrice = this.productForm.get('tinPrice')?.value != null && this.productForm.get('tinPrice')?.value !== ''
      ? Number(this.productForm.get('tinPrice')?.value) : null;
    const category = this.categories.find(c => c.id === +categoryId);
    const tenKgPrice = category?.tenKgPrice != null ? Number(category.tenKgPrice) : null;
    let price: number | null = null;
    let totalPrice: number | null = null;
    if (tenKgPrice != null && quantity != null) {
      price = (tenKgPrice / 10) * quantity;
      totalPrice = price + (tinPrice ?? 0);
    }
    const priceDisplay = price != null ? this.formatNumber(price) : '';
    const totalPriceDisplay = totalPrice != null ? this.formatNumber(totalPrice) : '';
    this.productForm.get('price')?.setValue(priceDisplay, { emitEvent: false });
    this.productForm.get('totalPrice')?.setValue(totalPriceDisplay, { emitEvent: false });
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  private initializeForms(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      categoryId: ['', [Validators.required]],
      status: ['A'],
      description: [''],
      tinPrice: [null as number | null, [Validators.min(0)]],
      quantity: [null as number | null, [Validators.min(0)]],
      price: [{ value: '', disabled: true }],
      totalPrice: [{ value: '', disabled: true }]
    });

    this.searchForm = this.fb.group({
      search: [''],
      categoryId: [''],
      status: ['A']
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories({ status: 'A' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categories = response.data;
          this.updateCalculatedPrices();
        },
        error: () => {
          this.snackbarService.error('Failed to load categories');
        }
      });
  }

  loadProducts(): void {
    if (!this.isLoading) {
      this.isLoading = true;
    }

    const searchParams = {
      ...this.searchForm.value,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'id',
      sortDir: 'desc'
    };

    this.productService.searchProducts(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.data.content;
          this.totalPages = response.data.totalPages;
          this.totalElements = response.data.totalElements;
          this.startIndex = this.currentPage * this.pageSize;
          this.endIndex = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
          this.isLoading = false;
        },
        error: () => {
          this.snackbarService.error('Failed to load products');
          this.isLoading = false;
        }
      });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isLoading) {
      return;
    }

    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isLoading = true;
    const raw = this.productForm.getRawValue();
    const productData: Product = {
      name: raw.name,
      categoryId: Number(raw.categoryId),
      status: raw.status,
      description: raw.description ?? undefined,
      tinPrice: raw.tinPrice != null && raw.tinPrice !== '' ? Number(raw.tinPrice) : undefined,
      quantity: raw.quantity != null && raw.quantity !== '' ? Number(raw.quantity) : undefined
    };

    const request = this.isEditing
      ? this.productService.updateProduct(this.editingId!, productData)
      : this.productService.createProduct(productData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.snackbarService.success(
          this.isEditing
            ? 'Product updated successfully'
            : 'Product created successfully'
        );
        // this.loadProducts();
        this.productService.refreshProducts()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
            },
            error: (error) => {
            }
          });
        this.closeDialog();
        this.isLoading = false;
      },
      error: (error) => {
        this.snackbarService.error(error?.error?.message);
        console.error('Error:', error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  editProduct(product: Product): void {
    this.isEditing = true;
    this.editingId = product.id;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = product.name;
    const plainTextName = tempDiv.textContent || tempDiv.innerText || product.name;

    this.productForm.patchValue({
      name: plainTextName,
      categoryId: product.categoryId,
      description: product.description ?? '',
      status: product.status,
      tinPrice: product.tinPrice ?? null,
      quantity: product.quantity ?? null
    });
    this.updateCalculatedPrices();

    this.isDialogOpen = true;
  }

  deleteProduct(id: number): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.isLoading = true;
      this.productService.deleteProduct(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackbarService.success('Product deleted successfully');
            this.productService.refreshProducts()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (response) => {
                },
                error: (error) => {
                }
              });
            this.loadProducts();
            // this.isLoading = false;
          },
          error: (error) => {
            this.snackbarService.error(error?.error?.message || 'Failed to delete product');
            this.isLoading = false;
          }
        });
    }
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingId = undefined;
    this.productForm.reset({
      status: 'A',
      description: '',
      tinPrice: null,
      quantity: null
    });
    this.updateCalculatedPrices();
  }

  onSearch(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isLoading) {
      return;
    }

    this.currentPage = 0;
    this.isLoading = true;
    this.loadProducts();
  }

  resetFilters(): void {
    this.searchForm.reset({
      search: '',
      categoryId: '',
      status: 'A'
    });
    this.onSearch();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadProducts();
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.editingId = undefined;
    this.productForm.reset({
      status: 'A',
      description: '',
      tinPrice: null,
      quantity: null
    });
    this.updateCalculatedPrices();
    this.isDialogOpen = true;
  }

  closeDialog(): void {
    if (!this.productForm.dirty) {
      this.isLoading = false;
    }
    this.isDialogOpen = false;
    this.resetForm();
    this.loadProducts();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  exportProducts(): void {
    const params = {
      ...this.searchForm.value,
      sortBy: 'id',
      sortDir: 'desc'
    };
    this.productService.exportProducts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Blob) => {
          const blob = new Blob([response], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'products.pdf';
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.snackbarService.error('Failed to export products');
        }
      });
  }

  ngOnDestroy(): void {
    // Complete destroy subject to clean up all takeUntil subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up DOM classes
    if (this.dropdownPinned && this.isBrowser) {
      document.body.classList.remove('dropdown-open');
    }

    // Clear arrays to release memory
    this.products = [];
    this.categories = [];

    // Reset forms to release form subscriptions
    if (this.productForm) {
      this.productForm.reset();
    }
    if (this.searchForm) {
      this.searchForm.reset();
    }
  }

  @HostListener('touchstart', ['$event'])
  handleTouchStart(event: Event): void {
    if (!this.isBrowser) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target?.closest('select')) {
      this.dropdownPinned = true;
      document.body.classList.add('dropdown-open');
    }
  }

  @HostListener('touchend')
  handleTouchEnd(): void {
    if (!this.isBrowser || !this.dropdownPinned) {
      return;
    }
    this.dropdownPinned = false;
    document.body.classList.remove('dropdown-open');
  }
}