import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { CategoryHistoryService } from '../../services/category-history.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { CategoryHistory } from '../../models/category-history.model';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-category-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoaderComponent,
    FormsModule,
    PaginationComponent
  ],
  templateUrl: './category-history.component.html',
  styleUrls: ['./category-history.component.scss']
})
export class CategoryHistoryComponent implements OnInit, OnDestroy {
  history: CategoryHistory[] = [];
  categories: Category[] = [];
  searchForm: FormGroup;
  isLoading = false;
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  totalPages = 0;
  totalElements = 0;
  startIndex = 0;
  endIndex = 0;
  private destroy$ = new Subject<void>();

  sortByOptions: { value: 'id' | 'createdAt' | 'categoryName' | 'oldTenKgPrice' | 'newTenKgPrice'; label: string }[] = [
    { value: 'id', label: 'ID' },
    { value: 'createdAt', label: 'Date' },
    { value: 'categoryName', label: 'Category' },
    { value: 'oldTenKgPrice', label: 'Old price' },
    { value: 'newTenKgPrice', label: 'New price' }
  ];

  constructor(
    private categoryHistoryService: CategoryHistoryService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private snackbar: SnackbarService
  ) {
    this.searchForm = this.fb.group({
      categoryId: [null as number | null],
      search: [''],
      dateFrom: [''],
      dateTo: [''],
      sortBy: ['createdAt'],
      sortDir: ['desc']
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.history = [];
  }

  loadCategories(): void {
    this.categoryService.getCategories({ status: 'A' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categories = res.data || [];
        },
        error: () => {
          this.categories = [];
        }
      });
  }

  loadHistory(): void {
    this.isLoading = true;
    const raw = this.searchForm.getRawValue();
    const params = {
      categoryId: raw.categoryId != null && raw.categoryId !== '' ? Number(raw.categoryId) : undefined,
      search: raw.search || undefined,
      dateFrom: raw.dateFrom || undefined,
      dateTo: raw.dateTo || undefined,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: raw.sortBy || 'createdAt',
      sortDir: raw.sortDir || 'desc'
    };

    this.categoryHistoryService.search(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (response) => {
          this.history = response.data?.content ?? [];
          this.totalPages = response.data?.totalPages ?? 0;
          this.totalElements = response.data?.totalElements ?? 0;
          this.startIndex = this.currentPage * this.pageSize;
          this.endIndex = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
        },
        error: (error) => {
          const msg = error?.error?.message || 'Failed to load category history';
          this.snackbar.error(msg);
          this.history = [];
        }
      });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadHistory();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadHistory();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadHistory();
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleString();
    } catch {
      return value;
    }
  }
}
