export interface Category {
  id?: number;
  name: string;
  status: 'A' | 'I';
  remainingQuantity?: number;
  tenKgPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CategoryResponse {
  success?: boolean;
  message?: string;
  data: Category[];
}

export interface CategorySearchRequest {
  search?: string;
  status?: string;
  name?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}
