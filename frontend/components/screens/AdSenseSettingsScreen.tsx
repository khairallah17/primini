'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdSenseConfig, updateAdSenseConfig, uploadBannerImage, type AdSenseConfig, type AdSlotConfig } from '../../lib/settingsApi';

type SlotKey = 'homepage_top' | 'homepage_middle' | 'homepage_bottom' | 'product_detail_sidebar' | 'product_detail_bottom' | 'category_page_top' | 'search_results_middle';

const SLOT_LABELS: Record<SlotKey, string> = {
  homepage_top: 'Page d\'accueil - Haut',
  homepage_middle: 'Page d\'accueil - Milieu',
  homepage_bottom: 'Page d\'accueil - Bas',
  product_detail_sidebar: 'Page produit - Barre latérale',
  product_detail_bottom: 'Page produit - Bas',
  category_page_top: 'Page catégorie - Haut',
  search_results_middle: 'Résultats de recherche - Milieu',
};

function normalizeSlotConfig(value: string | AdSlotConfig | undefined): AdSlotConfig {
  if (!value) {
    return { ad_type: 'adsense', adsense_id: '', banner_image: '', banner_link: '' };
  }
  
  if (typeof value === 'string') {
    // Legacy: simple string is AdSense ID
    return { ad_type: 'adsense', adsense_id: value, banner_image: '', banner_link: '' };
  }
  
  // Already an AdSlotConfig object
  return {
    ad_type: value.ad_type || 'adsense',
    adsense_id: value.adsense_id || '',
    banner_image: value.banner_image || '',
    banner_link: value.banner_link || '',
  };
}

function AdSenseSettingsContent() {
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [config, setConfig] = useState<AdSenseConfig>({
    enabled: false,
    publisher_id: '',
    homepage_top: '',
    homepage_middle: '',
    homepage_bottom: '',
    product_detail_sidebar: '',
    product_detail_bottom: '',
    category_page_top: '',
    search_results_middle: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdSenseConfig();
        setConfig(data);
      } catch (error) {
        console.error('Failed to load AdSense config', error);
        setMessage({ type: 'error', text: 'Erreur lors du chargement de la configuration' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.key) {
      setMessage({ type: 'error', text: 'Vous devez être connecté' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await updateAdSenseConfig(config, tokens.key);
      setMessage({ type: 'success', text: 'Configuration AdSense mise à jour avec succès!' });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Erreur lors de la mise à jour' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AdSenseConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateSlotConfig = (slotKey: SlotKey, updates: Partial<AdSlotConfig>) => {
    const currentValue = config[slotKey];
    const currentConfig = normalizeSlotConfig(currentValue);
    const newConfig: AdSlotConfig = { ...currentConfig, ...updates };
    
    // If it's a simple AdSense ID (legacy), convert to object format
    setConfig(prev => ({
      ...prev,
      [slotKey]: newConfig,
    }));
  };

  const getSlotConfig = (slotKey: SlotKey): AdSlotConfig => {
    return normalizeSlotConfig(config[slotKey]);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20">Chargement...</div>;
  }

  return (
    <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Configuration Google AdSense</h1>

        {message && (
          <div className={`mb-6 rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-8 shadow">
          {/* Enable/Disable */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Activer Google AdSense</span>
            </label>
          </div>

          {/* Publisher ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Publisher ID (ca-pub-XXXXXXXXXX)
            </label>
            <input
              type="text"
              value={config.publisher_id}
              onChange={(e) => handleChange('publisher_id', e.target.value)}
              placeholder="ca-pub-XXXXXXXXXX"
              className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              Trouvez votre Publisher ID dans votre compte Google AdSense (requis pour les publicités AdSense)
            </p>
          </div>

          {/* Ad Slots */}
          <div className="border-t pt-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Emplacements des publicités</h2>
            <p className="mb-6 text-sm text-gray-500">
              Pour chaque emplacement, vous pouvez choisir entre une publicité AdSense ou une bannière image personnalisée.
            </p>

            <div className="space-y-8">
              {(Object.keys(SLOT_LABELS) as SlotKey[]).map((slotKey) => {
                const slotConfig = getSlotConfig(slotKey);
                return (
                  <div key={slotKey} className="rounded-lg border border-gray-200 p-6">
                    <h3 className="mb-4 text-lg font-medium text-gray-900">
                      {SLOT_LABELS[slotKey]}
                    </h3>

                    {/* Ad Type Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type de publicité
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`${slotKey}_type`}
                            value="adsense"
                            checked={slotConfig.ad_type === 'adsense'}
                            onChange={(e) => updateSlotConfig(slotKey, { ad_type: 'adsense' })}
                            className="mr-2 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">AdSense ID</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`${slotKey}_type`}
                            value="banner"
                            checked={slotConfig.ad_type === 'banner'}
                            onChange={(e) => updateSlotConfig(slotKey, { ad_type: 'banner' })}
                            className="mr-2 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">Bannière Image</span>
                        </label>
                      </div>
                    </div>

                    {/* AdSense ID Input */}
                    {slotConfig.ad_type === 'adsense' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          AdSense Slot ID
                        </label>
                        <input
                          type="text"
                          value={slotConfig.adsense_id || ''}
                          onChange={(e) => updateSlotConfig(slotKey, { adsense_id: e.target.value })}
                          placeholder="ID du slot publicitaire (ex: 1234567890)"
                          className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Laissez vide pour désactiver cet emplacement
                        </p>
                      </div>
                    )}

                    {/* Banner Image Input */}
                    {slotConfig.ad_type === 'banner' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image de la bannière
                          </label>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <input
                                ref={(el) => {
                                  fileInputRefs.current[slotKey] = el;
                                }}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !tokens?.key) return;

                                  setUploading(prev => ({ ...prev, [slotKey]: true }));
                                  try {
                                    const result = await uploadBannerImage(file, slotKey, tokens.key);
                                    updateSlotConfig(slotKey, { banner_image: result.url });
                                    setMessage({ type: 'success', text: 'Image téléchargée avec succès!' });
                                  } catch (error: any) {
                                    setMessage({
                                      type: 'error',
                                      text: error.response?.data?.detail || 'Erreur lors du téléchargement de l\'image'
                                    });
                                  } finally {
                                    setUploading(prev => ({ ...prev, [slotKey]: false }));
                                  }
                                }}
                                className="hidden"
                                id={`file-input-${slotKey}`}
                              />
                              <label
                                htmlFor={`file-input-${slotKey}`}
                                className="flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                {uploading[slotKey] ? 'Téléchargement...' : 'Choisir un fichier'}
                              </label>
                            </div>
                            {slotConfig.banner_image && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateSlotConfig(slotKey, { banner_image: '' });
                                  if (fileInputRefs.current[slotKey]) {
                                    fileInputRefs.current[slotKey]!.value = '';
                                  }
                                }}
                                className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Formats acceptés: JPEG, PNG, GIF, WebP (max 5MB)
                          </p>
                          {slotConfig.banner_image && (
                            <p className="mt-1 text-xs text-blue-600">
                              Image actuelle: {slotConfig.banner_image}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Lien de destination (optionnel)
                          </label>
                          <input
                            type="url"
                            value={slotConfig.banner_link || ''}
                            onChange={(e) => updateSlotConfig(slotKey, { banner_link: e.target.value })}
                            placeholder="https://example.com"
                            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            URL vers laquelle rediriger lorsque l&apos;utilisateur clique sur la bannière
                          </p>
                        </div>
                        {slotConfig.banner_image && (
                          <div className="mt-4">
                            <p className="mb-2 text-sm font-medium text-gray-700">Aperçu:</p>
                            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                              {slotConfig.banner_link ? (
                                <a
                                  href={slotConfig.banner_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={slotConfig.banner_image}
                                    alt="Banner preview"
                                    className="max-w-full h-auto"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </a>
                              ) : (
                                <img
                                  src={slotConfig.banner_image}
                                  alt="Banner preview"
                                  className="max-w-full h-auto"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdSenseSettingsScreen() {
  return <AdSenseSettingsContent />;
}
