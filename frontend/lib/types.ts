export type PaginatedResponse<T> = {
  count: number;
  total_pages: number;
  current_page: number;
  next_page: number | null;
  previous_page: number | null;
  page_size: number;
  results: T[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  parent?: number | null;
  children?: Category[];
};

export type Merchant = {
  id: number;
  name: string;
  logo?: string;
  logo_file?: string;
  logo_display?: string; // Unified logo URL for display (prefers logo_file over logo)
  website_url?: string;
  description?: string;
};

export type PriceOffer = {
  id: number;
  price: number | string;
  stock_status: string;
  url: string;
  date_updated: string;
  merchant?: Merchant;
  product?: {
    id: number;
    name: string;
    slug: string;
  };
  currency?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_by_email?: string;
  approved_by_email?: string;
  approved_at?: string;
  rejection_reason?: string;
  merchant_name?: string;
};

export type ProductImage = {
  id: number;
  image: string;
  image_url: string;
  order: number;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image?: string;
  image_file?: string;
  image_display?: string;
  images?: ProductImage[];
  specs: Record<string, string | number | boolean>;
  category: Category;
  subcategory?: Category | null;
  brand?: string;
  release_date?: string;
  tags: string[];
  offers: PriceOffer[];
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_by_email?: string;
  approved_by_email?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
  similar_products?: Array<{
    id: number;
    name: string;
    slug: string;
    image?: string;
    lowest_price?: number;
  }>;
};

export type Promotion = {
  id: number;
  title: string;
  products: Product[];
};
