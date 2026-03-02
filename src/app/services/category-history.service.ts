import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategoryHistory,
  GetCategoryHistoryRequest,
  CategoryHistorySearchRequest
} from '../models/category-history.model';
import { ApiResponse, PaginatedResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryHistoryService {
  private apiUrl = `${environment.apiUrl}/api/category-history`;

  constructor(private http: HttpClient) {}

  /**
   * List all category history with optional filters (no pagination).
   * POST /api/category-history/getCategoryHistory
   */
  getCategoryHistory(
    params: GetCategoryHistoryRequest = {}
  ): Observable<ApiResponse<CategoryHistory[]>> {
    return this.http.post<ApiResponse<CategoryHistory[]>>(
      `${this.apiUrl}/getCategoryHistory`,
      params
    );
  }

  /**
   * Search category history with pagination and filters.
   * POST /api/category-history/search
   */
  search(
    params: CategoryHistorySearchRequest
  ): Observable<ApiResponse<PaginatedResponse<CategoryHistory>>> {
    return this.http.post<ApiResponse<PaginatedResponse<CategoryHistory>>>(
      `${this.apiUrl}/search`,
      params
    );
  }
}
