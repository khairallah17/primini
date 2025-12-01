import api from './apiClient';

export type AdSenseConfig = {
  enabled: boolean;
  publisher_id: string;
  homepage_top?: string;
  homepage_middle?: string;
  homepage_bottom?: string;
  product_detail_sidebar?: string;
  product_detail_bottom?: string;
  category_page_top?: string;
  search_results_middle?: string;
};

export async function getAdSenseConfig(): Promise<AdSenseConfig> {
  const response = await api.get<AdSenseConfig>('/settings/adsense_config/');
  return response.data;
}

export async function updateAdSenseConfig(
  config: AdSenseConfig,
  token: string
): Promise<void> {
  await api.post(
    '/settings/adsense_config/',
    config,
    {
      headers: {
        Authorization: `Token ${token}`,
      },
    }
  );
}

