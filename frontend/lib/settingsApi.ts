import api from './apiClient';

export type AdSlotConfig = {
  ad_type: 'adsense' | 'banner';
  adsense_id?: string;
  banner_image?: string;
  banner_link?: string;
};

export type AdSenseConfig = {
  enabled: boolean;
  publisher_id: string;
  homepage_top?: string | AdSlotConfig;
  homepage_middle?: string | AdSlotConfig;
  homepage_bottom?: string | AdSlotConfig;
  product_detail_sidebar?: string | AdSlotConfig;
  product_detail_bottom?: string | AdSlotConfig;
  category_page_top?: string | AdSlotConfig;
  search_results_middle?: string | AdSlotConfig;
};

export async function getAdSenseConfig(): Promise<AdSenseConfig> {
  const response = await api.get<AdSenseConfig>('/settings/adsense_config/');
  return response.data;
}

export async function uploadBannerImage(
  file: File,
  slotKey: string,
  token: string
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('slot_key', slotKey);

  const response = await api.post<{ url: string; filename: string }>(
    '/settings/upload_banner_image/',
    formData,
    {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function updateAdSenseConfig(
  config: AdSenseConfig,
  token: string
): Promise<void> {
  // Convert slot configs to JSON strings if they're objects
  const serializedConfig: any = {
    enabled: config.enabled,
    publisher_id: config.publisher_id,
  };

  const slotKeys: (keyof AdSenseConfig)[] = [
    'homepage_top',
    'homepage_middle',
    'homepage_bottom',
    'product_detail_sidebar',
    'product_detail_bottom',
    'category_page_top',
    'search_results_middle',
  ];

  slotKeys.forEach((key) => {
    const value = config[key];
    if (value === undefined || value === null || value === '') {
      serializedConfig[key] = '';
    } else if (typeof value === 'object' && 'ad_type' in value) {
      // It's an AdSlotConfig object - serialize it
      serializedConfig[key] = JSON.stringify(value);
    } else {
      // It's a string (legacy AdSense ID)
      serializedConfig[key] = value;
    }
  });

  await api.post(
    '/settings/adsense_config/',
    serializedConfig,
    {
      headers: {
        Authorization: `Token ${token}`,
      },
    }
  );
}

export type PageAdConfig = {
  id?: number;
  page_type: 'homepage' | 'blog_list' | 'blog_detail' | 'product_detail' | 'category_list' | 'category_detail' | 'deals' | 'search' | 'magic_tool' | 'dashboard' | 'faq' | 'all';
  slot: 'top' | 'middle' | 'bottom' | 'sidebar' | 'header' | 'footer';
  ad_type: 'adsense' | 'banner_image' | 'custom_code';
  adsense_id?: string;
  banner_image?: string;
  banner_image_url?: string;
  banner_image_url_display?: string;
  banner_link?: string;
  custom_code?: string;
  background_image?: string;
  background_image_url?: string;
  background_image_url_display?: string;
  enabled: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
};

export async function getPageAdConfigs(
  pageType?: string,
  slot?: string,
  token?: string | null
): Promise<PageAdConfig[]> {
  const params: Record<string, string> = {};
  if (pageType) params.page_type = pageType;
  if (slot) params.slot = slot;

  const headers = token ? { Authorization: `Token ${token}` } : {};
  const response = await api.get<PageAdConfig[]>('/page-ads/by_page/', {
    params,
    headers,
  });
  return response.data;
}

export async function getAllPageAdConfigs(token: string): Promise<PageAdConfig[]> {
  const response = await api.get<PageAdConfig[] | { results: PageAdConfig[] }>('/page-ads/', {
    headers: { Authorization: `Token ${token}` },
  });
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return (response.data as { results: PageAdConfig[] }).results || [];
}

export async function createPageAdConfig(config: PageAdConfig, token: string): Promise<PageAdConfig> {
  const response = await api.post<PageAdConfig>('/page-ads/', config, {
    headers: { Authorization: `Token ${token}` },
  });
  return response.data;
}

export async function updatePageAdConfig(id: number, config: Partial<PageAdConfig>, token: string): Promise<PageAdConfig> {
  const response = await api.patch<PageAdConfig>(`/page-ads/${id}/`, config, {
    headers: { Authorization: `Token ${token}` },
  });
  return response.data;
}

export async function deletePageAdConfig(id: number, token: string): Promise<void> {
  await api.delete(`/page-ads/${id}/`, {
    headers: { Authorization: `Token ${token}` },
  });
}

