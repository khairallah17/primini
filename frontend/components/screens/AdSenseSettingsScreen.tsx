'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdSenseConfig, updateAdSenseConfig, type AdSenseConfig } from '../../lib/settingsApi';

function AdSenseSettingsContent() {
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
              Trouvez votre Publisher ID dans votre compte Google AdSense
            </p>
          </div>

          {/* Ad Slots */}
          <div className="border-t pt-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Emplacements des publicités</h2>
            <p className="mb-6 text-sm text-gray-500">
              Configurez les emplacements de publicités. Laissez vide pour désactiver un emplacement.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Page d'accueil - Haut
                </label>
                <input
                  type="text"
                  value={config.homepage_top || ''}
                  onChange={(e) => handleChange('homepage_top', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Page d'accueil - Milieu
                </label>
                <input
                  type="text"
                  value={config.homepage_middle || ''}
                  onChange={(e) => handleChange('homepage_middle', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Page d'accueil - Bas
                </label>
                <input
                  type="text"
                  value={config.homepage_bottom || ''}
                  onChange={(e) => handleChange('homepage_bottom', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Page produit - Barre latérale
                </label>
                <input
                  type="text"
                  value={config.product_detail_sidebar || ''}
                  onChange={(e) => handleChange('product_detail_sidebar', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Page produit - Bas
                </label>
                <input
                  type="text"
                  value={config.product_detail_bottom || ''}
                  onChange={(e) => handleChange('product_detail_bottom', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Page catégorie - Haut
                </label>
                <input
                  type="text"
                  value={config.category_page_top || ''}
                  onChange={(e) => handleChange('category_page_top', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Résultats de recherche - Milieu
                </label>
                <input
                  type="text"
                  value={config.search_results_middle || ''}
                  onChange={(e) => handleChange('search_results_middle', e.target.value)}
                  placeholder="ID du slot publicitaire"
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
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

