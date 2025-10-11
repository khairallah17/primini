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
  website_url?: string;
  description?: string;
};

export type PriceOffer = {
  id: number;
  price: number;
  stock_status: string;
  url: string;
  date_updated: string;
  merchant: Merchant;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image?: string;
  specs: Record<string, string | number | boolean>;
  category: Category;
  brand?: string;
  release_date?: string;
  tags: string[];
  offers: PriceOffer[];
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
