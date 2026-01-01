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

