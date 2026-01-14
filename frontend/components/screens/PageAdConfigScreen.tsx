'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllPageAdConfigs,
  createPageAdConfig,
  updatePageAdConfig,
  deletePageAdConfig,
  uploadBannerImage,
  type PageAdConfig,
} from '../../lib/settingsApi';
import api from '../../lib/apiClient';

const PAGE_TYPES = [
  { value: 'homepage', label: 'Page d\'accueil' },
  { value: 'blog_list', label: 'Liste des blogs' },
  { value: 'blog_detail', label: 'Détail du blog' },
  { value: 'product_detail', label: 'Détail du produit' },
  { value: 'category_list', label: 'Liste des catégories' },
  { value: 'category_detail', label: 'Détail de la catégorie' },
  { value: 'deals', label: 'Bons plans' },
  { value: 'search', label: 'Recherche' },
  { value: 'magic_tool', label: 'Outil magique' },
  { value: 'dashboard', label: 'Tableau de bord' },
  { value: 'faq', label: 'FAQ' },
  { value: 'all', label: 'Toutes les pages' },
];

const SLOTS = [
  { value: 'top', label: 'Haut' },
  { value: 'middle', label: 'Milieu' },
  { value: 'bottom', label: 'Bas' },
  { value: 'sidebar', label: 'Barre latérale' },
  { value: 'header', label: 'En-tête' },
  { value: 'footer', label: 'Pied de page' },
];

const AD_TYPES = [
  { value: 'adsense', label: 'AdSense' },
  { value: 'banner_image', label: 'Image bannière' },
  { value: 'custom_code', label: 'Code personnalisé' },
];

export default function PageAdConfigScreen() {
  const { tokens } = useAuth();
  const [configs, setConfigs] = useState<PageAdConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PageAdConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState<{ banner: boolean; background: boolean }>({ banner: false, background: false });
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    if (!tokens?.key) return;
    try {
      setLoading(true);
      const data = await getAllPageAdConfigs(tokens.key);
      // Ensure data is an array
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load page ad configs', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des configurations' });
      setConfigs([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!tokens?.key || !confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) return;
    try {
      await deletePageAdConfig(id, tokens.key);
      setMessage({ type: 'success', text: 'Configuration supprimée avec succès' });
      loadConfigs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const handleEdit = (config: PageAdConfig) => {
    setEditing(config);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tokens?.key) return;

    const formData = new FormData(e.currentTarget);
    const configData: Partial<PageAdConfig> = {
      page_type: formData.get('page_type') as PageAdConfig['page_type'],
      slot: formData.get('slot') as PageAdConfig['slot'],
      ad_type: formData.get('ad_type') as PageAdConfig['ad_type'],
      enabled: formData.get('enabled') === 'on',
      order: parseInt(formData.get('order') as string) || 0,
      adsense_id: formData.get('adsense_id') as string || '',
      banner_image_url: formData.get('banner_image_url') as string || '',
      banner_link: formData.get('banner_link') as string || '',
      custom_code: formData.get('custom_code') as string || '',
      background_image_url: formData.get('background_image_url') as string || '',
    };

    try {
      if (editing?.id) {
        await updatePageAdConfig(editing.id, configData, tokens.key);
        setMessage({ type: 'success', text: 'Configuration mise à jour avec succès' });
      } else {
        await createPageAdConfig(configData as PageAdConfig, tokens.key);
        setMessage({ type: 'success', text: 'Configuration créée avec succès' });
      }
      setShowForm(false);
      setEditing(null);
      loadConfigs();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erreur lors de la sauvegarde' });
    }
  };

  const handleImageUpload = async (type: 'banner' | 'background', file: File) => {
    if (!tokens?.key) return;
    try {
      setUploading({ ...uploading, [type]: true });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slot_key', `${type}_${Date.now()}`);

      const response = await api.post<{ url: string; filename: string }>(
        '/settings/upload_banner_image/',
        formData,
        {
          headers: {
            Authorization: `Token ${tokens.key}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (editing) {
        const field = type === 'banner' ? 'banner_image_url' : 'background_image_url';
        await updatePageAdConfig(editing.id!, { [field]: response.data.url }, tokens.key);
        loadConfigs();
      }
      setMessage({ type: 'success', text: 'Image téléchargée avec succès' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors du téléchargement de l\'image' });
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuration des annonces par page</h1>
            <p className="mt-2 text-sm text-gray-500">Gérez les annonces et images de fond pour chaque page</p>
          </div>
          <button
            onClick={handleNew}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Nouvelle configuration
          </button>
        </div>

        {message && (
          <div className={`mb-4 rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              {editing ? 'Modifier la configuration' : 'Nouvelle configuration'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de page</label>
                  <select
                    name="page_type"
                    defaultValue={editing?.page_type || 'homepage'}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    {PAGE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emplacement</label>
                  <select
                    name="slot"
                    defaultValue={editing?.slot || 'top'}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    {SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type d&apos;annonce</label>
                  <select
                    name="ad_type"
                    defaultValue={editing?.ad_type || 'adsense'}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    {AD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ordre</label>
                  <input
                    type="number"
                    name="order"
                    defaultValue={editing?.order || 0}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={editing?.enabled !== false}
                  className="rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">Activé</label>
              </div>

              {/* AdSense fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700">ID AdSense</label>
                <input
                  type="text"
                  name="adsense_id"
                  defaultValue={editing?.adsense_id || ''}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="ca-pub-xxxxxxxxxxxxx"
                />
              </div>

              {/* Banner image fields */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Image bannière</label>
                <input
                  type="url"
                  name="banner_image_url"
                  defaultValue={editing?.banner_image_url || editing?.banner_image_url_display || ''}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="URL de l'image bannière"
                />
                <div className="flex gap-2">
                  <input
                    ref={bannerFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('banner', file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileRef.current?.click()}
                    disabled={uploading.banner}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    {uploading.banner ? 'Téléchargement...' : 'Télécharger une image'}
                  </button>
                </div>
                <input
                  type="url"
                  name="banner_link"
                  defaultValue={editing?.banner_link || ''}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Lien de la bannière (optionnel)"
                />
              </div>

              {/* Background image fields */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Image de fond</label>
                <input
                  type="url"
                  name="background_image_url"
                  defaultValue={editing?.background_image_url || editing?.background_image_url_display || ''}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="URL de l'image de fond"
                />
                <div className="flex gap-2">
                  <input
                    ref={backgroundFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('background', file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => backgroundFileRef.current?.click()}
                    disabled={uploading.background}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    {uploading.background ? 'Téléchargement...' : 'Télécharger une image'}
                  </button>
                </div>
              </div>

              {/* Custom code field */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Code personnalisé (HTML/JavaScript)</label>
                <textarea
                  name="custom_code"
                  defaultValue={editing?.custom_code || ''}
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                  placeholder="<div>...</div> ou <script>...</script>"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Emplacement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {configs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {PAGE_TYPES.find(t => t.value === config.page_type)?.label || config.page_type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {SLOTS.find(s => s.value === config.slot)?.label || config.slot}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {AD_TYPES.find(t => t.value === config.ad_type)?.label || config.ad_type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {config.enabled ? 'Activé' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-primary hover:text-primary-dark mr-4"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => config.id && handleDelete(config.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {configs.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Aucune configuration d&apos;annonce pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

