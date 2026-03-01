import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product, ProductResponse, ProductSearchRequest } from '../models/product.model';
import { CacheService } from '../shared/services/cache.service';
import { EncryptionService } from '../shared/services/encryption.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly CACHE_KEY = 'active_products';
  private apiUrl = `${environment.apiUrl}/api/products`;
  
  // In-memory cache for decrypted product data (avoids repeated decryption)
  private cachedProducts: Product[] | null = null;
  private productsSubject = new BehaviorSubject<Product[]>([]);
  
  /** Observable stream of cached products for reactive access */
  public readonly products$ = this.productsSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private cacheService: CacheService,
    private encryptionService: EncryptionService
  ) {}

  searchProducts(params: ProductSearchRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(`${this.apiUrl}/search`, params);
  }

  getProducts(params: ProductSearchRequest): Observable<any> {
    if (params.status === 'A') {
      // Return in-memory cache if available (no re-decryption needed)
      if (this.cachedProducts) {
        return of({ success: true, data: this.cachedProducts });
      }
      
      // Try localStorage cache (decrypt once and store in memory)
      const encryptedData = localStorage.getItem(this.CACHE_KEY);
      if (encryptedData) {
        const decryptedData = this.encryptionService.decrypt(encryptedData) as any;
        if (decryptedData && decryptedData.data) {
          this.cachedProducts = decryptedData.data;
          this.productsSubject.next(this.cachedProducts!);
          return of(decryptedData);
        }
      }
    }

    return this.http.post<any>(`${this.apiUrl}/getProducts`, {
      search: params.search,
      categoryId: params.categoryId,
      status: params.status,
      page: params.page,
      size: params.size,
      sortBy: params.sortBy,
      sortDir: params.sortDir
    }).pipe(
      tap(response => {
        if (params.status === 'A' && response.success) {
          // Update in-memory cache
          this.cachedProducts = response.data;
          this.productsSubject.next(this.cachedProducts!);
          
          // Persist to localStorage (encrypted)
          const encryptedData = this.encryptionService.encrypt(response);
          localStorage.setItem(this.CACHE_KEY, encryptedData);
        }
      })
    );
  }

  refreshProducts(): Observable<any> {
    // Invalidate in-memory cache
    this.cachedProducts = null;
    localStorage.removeItem(this.CACHE_KEY);
    return this.getProducts({ status: 'A' });
  }

  createProduct(product: Product): Observable<any> {
    const body = {
      name: product.name,
      categoryId: product.categoryId,
      status: product.status,
      description: product.description,
      taxPercentage: product.taxPercentage,
      tinPrice: product.tinPrice,
      quantity: product.quantity
    };
    return this.http.post(`${this.apiUrl}`, body);
  }

  updateProduct(id: number, product: Product): Observable<any> {
    const body = {
      name: product.name,
      categoryId: product.categoryId,
      status: product.status,
      description: product.description,
      taxPercentage: product.taxPercentage,
      tinPrice: product.tinPrice,
      quantity: product.quantity
    };
    return this.http.put(`${this.apiUrl}/${id}`, body);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  exportProducts(params: ProductSearchRequest): Observable<Blob> {
    const headers = new HttpHeaders({
      'Accept': 'application/pdf'
    });
    const body = {
      search: params.search,
      status: params.status,
      categoryId: params.categoryId,
      sortBy: params.sortBy ?? 'id',
      sortDir: params.sortDir ?? 'desc'
    };
    return this.http.post(`${this.apiUrl}/export-pdf`, body, {
      headers: headers,
      responseType: 'blob'
    });
  }
}