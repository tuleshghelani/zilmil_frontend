export interface Product {
  id?: number;
  name: string;
  categoryId?: number;
  categoryName?: string;
  categoryTenKgPrice?: number;
  description?: string;
  status: 'A' | 'I';
  taxPercentage?: number;
  tinPrice?: number;
  quantity?: number;
  price?: number;
  totalPrice?: number;
}

export interface ProductSearchRequest {
  search?: string;
  status?: string;
  categoryId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface ProductResponse {
  success?: boolean;
  message?: string;
  data: {
    content: Product[];
    totalElements: number;
    totalPages: number;
  };
}
