'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import {
  createProduct,
  updateProduct,
  getCategories,
  getMerchants,
  type ProductCreateData,
  type PriceOfferCreateData
} from '../../lib/productApi';
import { productSchema, type ProductFormData } from '../../lib/validations';
import type { Product } from '../../lib/types';

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Merchant = {
  id: number;
  name: string;
  logo?: string;
  website?: string;
};

type OfferFormData = {
  merchant_id: number | '';
  price: string;
  url: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  currency: string;
};

function ProductFormContent() {
  const router = useRouter();
  const params = useParams();
  const { tokens } = useAuth();
  const slug = params?.slug as string | undefined;
  const isEdit = !!slug;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [offers, setOffers] = useState<OfferFormData[]>([
    { merchant_id: '', price: '', url: '', stock_status: 'in_stock', currency: 'MAD' }
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      brand: '',
      category_id: undefined,
      image: '',
      tags: [],
      specs: {},
      release_date: '',
    },
  });

  const watchedTags = watch('tags');

  useEffect(() => {
    if (!tokens?.key) return;

    // Load categories and merchants
    Promise.all([
      getCategories().catch((err) => {
        console.error('Failed to load categories', err);
        return [];
      }),
      getMerchants().catch((err) => {
        console.error('Failed to load merchants', err);
        return [];
      })
    ]).then(([cats, mers]) => {
      setCategories(cats);
      setMerchants(mers);
    });

    // If editing, load product data
    if (isEdit && slug) {
      setLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'}/products/${slug}/`, {
        headers: {
          Authorization: `Token ${tokens.key}`
        }
      })
        .then((res) => res.json())
        .then((data: Product) => {
          setProduct(data);
          reset({
            name: data.name || '',
            description: data.description || '',
            brand: data.brand || '',
            category_id: data.category?.id,
            image: data.image || '',
            tags: data.tags || [],
            specs: data.specs || {},
            release_date: data.release_date || '',
          });
          
          // Load existing offers
          if (data.offers && data.offers.length > 0) {
            setOffers(
              data.offers.map((offer) => ({
                merchant_id: offer.merchant.id,
                price: offer.price.toString(),
                url: offer.url || '',
                stock_status: (offer.stock_status as 'in_stock' | 'low_stock' | 'out_of_stock') || 'in_stock',
                currency: 'MAD',
              }))
            );
          } else {
            setOffers([{ merchant_id: '', price: '', url: '', stock_status: 'in_stock', currency: 'MAD' }]);
          }
        })
        .catch((err) => {
          console.error('Failed to load product', err);
          setError('Erreur lors du chargement du produit');
        })
        .finally(() => setLoading(false));
    }
  }, [tokens, isEdit, slug, reset]);

  const handleAddOffer = () => {
    setOffers([...offers, { merchant_id: '', price: '', url: '', stock_status: 'in_stock', currency: 'MAD' }]);
  };

  const handleRemoveOffer = (index: number) => {
    if (offers.length > 1) {
      setOffers(offers.filter((_, i) => i !== index));
    }
  };

  const handleOfferChange = (index: number, field: keyof OfferFormData, value: string | number) => {
    const updatedOffers = [...offers];
    updatedOffers[index] = { ...updatedOffers[index], [field]: value };
    setOffers(updatedOffers);
  };

  const onSubmit = async (data: ProductFormData) => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (!tokens?.key) {
        throw new Error('Non authentifié');
      }

      // Validate and prepare offers
      const validOffers: PriceOfferCreateData[] = offers
        .filter((offer) => offer.merchant_id && offer.price && !isNaN(Number(offer.price)))
        .map((offer) => ({
          merchant_id: Number(offer.merchant_id),
          price: Number(offer.price),
          url: offer.url || undefined,
          stock_status: offer.stock_status,
          currency: offer.currency || 'MAD',
        }));

      // Convert form data to API format
      const apiData: ProductCreateData = {
        name: data.name,
        description: data.description || undefined,
        brand: data.brand || undefined,
        category_id: data.category_id,
        image: data.image || undefined,
        tags: data.tags,
        specs: data.specs,
        release_date: data.release_date || undefined,
        offers: validOffers.length > 0 ? validOffers : undefined,
      };

      if (isEdit && slug) {
        await updateProduct(slug, apiData, tokens.key);
        setSuccess('Produit mis à jour avec succès!');
      } else {
        await createProduct(apiData, tokens.key);
        setSuccess('Produit créé avec succès! En attente d\'approbation.');
      }

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = watchedTags || [];
      if (!currentTags.includes(tagInput.trim())) {
        setValue('tags', [...currentTags, tagInput.trim()], { shouldValidate: true });
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter((t) => t !== tag), { shouldValidate: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Modifier le produit' : 'Créer un nouveau produit'}
          </h1>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
              {success}
            </div>
          )}

          {product && product.approval_status === 'pending' && (
            <div className="mb-4 rounded-md bg-yellow-50 p-4 text-yellow-800">
              Ce produit est en attente d'approbation.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Product Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du produit</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
                      errors.name ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    {...register('description')}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
                      errors.description ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                      Marque
                    </label>
                    <input
                      type="text"
                      id="brand"
                      {...register('brand')}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
                        errors.brand ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.brand && (
                      <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Catégorie
                    </label>
                    <select
                      id="category"
                      {...register('category_id', { valueAsNumber: true })}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
                        errors.category_id ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {errors.category_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                    URL de l'image
                  </label>
                  <input
                    type="url"
                    id="image"
                    {...register('image')}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
                      errors.image ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.image && (
                    <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="release_date" className="block text-sm font-medium text-gray-700">
                    Date de sortie (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    id="release_date"
                    {...register('release_date')}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
                      errors.release_date ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.release_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.release_date.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                    Tags
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Ajouter un tag"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                    >
                      Ajouter
                    </button>
                  </div>
                  {errors.tags && (
                    <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
                  )}
                  {watchedTags && watchedTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {watchedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-primary hover:text-primary/80"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Offers Section */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Liens de comparaison</h2>
                <button
                  type="button"
                  onClick={handleAddOffer}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  + Ajouter un lien
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Ajoutez plusieurs liens de marchands pour permettre la comparaison des prix.
              </p>

              <div className="space-y-4">
                {offers.map((offer, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-700">Lien {index + 1}</h3>
                      {offers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOffer(index)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Marchand *
                        </label>
                        <select
                          value={offer.merchant_id}
                          onChange={(e) => handleOfferChange(index, 'merchant_id', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                          required
                        >
                          <option value="">Sélectionner un marchand</option>
                          {merchants.map((merchant) => (
                            <option key={merchant.id} value={merchant.id}>
                              {merchant.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prix (MAD) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={offer.price}
                          onChange={(e) => handleOfferChange(index, 'price', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL du produit
                        </label>
                        <input
                          type="url"
                          value={offer.url}
                          onChange={(e) => handleOfferChange(index, 'url', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Statut du stock
                        </label>
                        <select
                          value={offer.stock_status}
                          onChange={(e) => handleOfferChange(index, 'stock_status', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                        >
                          <option value="in_stock">En stock</option>
                          <option value="low_stock">Stock faible</option>
                          <option value="out_of_stock">Rupture de stock</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProductFormScreen() {
  return <ProductFormContent />;
}
