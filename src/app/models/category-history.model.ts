export interface CategoryHistory {
  id: number;
  categoryId: number;
  categoryName: string;
  oldTenKgPrice: number;
  newTenKgPrice: number;
  createdAt: string;
}

/** Request for POST /getCategoryHistory (no pagination) */
export interface GetCategoryHistoryRequest {
  categoryId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Request for POST /search (with pagination) */
export interface CategoryHistorySearchRequest extends GetCategoryHistoryRequest {
  page?: number;
  size?: number;
  sortBy?: 'id' | 'createdAt' | 'categoryName' | 'oldTenKgPrice' | 'newTenKgPrice';
  sortDir?: 'asc' | 'desc';
}
