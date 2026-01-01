'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import {
  createProduct,
  updateProduct,
  getMerchants,
  type ProductCreateData,
  type PriceOfferCreateData
} from '../../lib/productApi';
import { getAllCategories } from '../../lib/categoryApi';
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
  merchant_name?: string;
  price: string;
  url: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  currency: string;
};

// Static list of common brands - moved outside component to prevent rerenders
const staticBrands = [
  'Samsung',
  'Apple',
  'LG',
  'Sony',
  'HP',
  'Dell',
  'Lenovo',
  'Asus',
  'Acer',
  'Microsoft',
  'Canon',
  'Nikon',
  'Panasonic',
  'Philips',
  'Bosch',
  'Whirlpool',
  'Electrolux',
  'Tefal',
  'SEB',
  'Moulinex',
  'Xiaomi',
  'Huawei',
  'Oppo',
  'OnePlus',
  'Realme',
  'Vivo',
  'Motorola',
  'Nokia',
  'Google',
  'Amazon',
  'JBL',
  'Bose',
  'Sennheiser',
  'Logitech',
  'Razer',
  'Corsair',
  'HyperX',
  'SteelSeries',
  'Intel',
  'AMD',
  'NVIDIA',
  'Western Digital',
  'Seagate',
  'Kingston',
  'SanDisk',
  'Crucial',
  'Garmin',
  'Fitbit',
  'Apple Watch',
  'Samsung Galaxy',
  'iPad',
  'Surface',
  'MacBook',
  'ThinkPad',
  'Alienware',
  'ROG',
  'Predator',
  'Nitro',
  'Inspiron',
  'XPS',
  'Vostro',
  'Latitude',
  'Yoga',
  'IdeaPad',
  'Legion',
  'ZenBook',
  'VivoBook',
  'TUF',
  'ProArt',
  'Chromebook',
  'AirPods',
  'Beats',
  'Sony WH',
  'Sony WF',
  'Bose QuietComfort',
  'Bose SoundLink',
  'JBL Flip',
  'JBL Charge',
  'UE Boom',
  'Anker',
  'Belkin',
  'Mophie',
  'Spigen',
  'OtterBox',
  'Case-Mate',
  'Incipio',
  'Tech21',
  'ZAGG',
  'Tempered Glass',
  'Screen Protector',
  'Wireless Charger',
  'Power Bank',
  'USB-C Cable',
  'Lightning Cable',
  'HDMI Cable',
  'Ethernet Cable',
  'Router',
  'Modem',
  'Switch',
  'Access Point',
  'Range Extender',
  'Mesh System',
  'Smart Home',
  'Smart Speaker',
  'Smart Display',
  'Smart Thermostat',
  'Smart Lock',
  'Smart Camera',
  'Smart Doorbell',
  'Smart Light',
  'Smart Plug',
  'Smart Switch',
  'Smart Hub',
  'HomeKit',
  'Alexa',
  'Google Home',
  'Nest',
  'Ring',
  'Arlo',
  'Wyze',
  'Eufy',
  'TP-Link',
  'Netgear',
  'Linksys',
  'ASUS Router',
  'D-Link',
  'Zyxel',
  'Ubiquiti',
  'MikroTik',
  'Fritz!Box',
  'AVM',
  'Speedport',
  'Easybox',
  'Magenta',
  'Orange',
  'SFR',
  'Bouygues',
  'Free',
  'Red',
  'Sosh',
  'B&You',
  'La Poste Mobile',
  'NRJ Mobile',
  'Prixtel',
  'Cdiscount Mobile',
  'Lebara',
  'LycaMobile',
  'Vectone',
  'Reglo Mobile',
  'Cora Mobile',
  'Auchan Mobile',
  'Carrefour Mobile',
  'Leclerc Mobile',
  'Intermarché Mobile',
  'Système U Mobile',
  'Casino Mobile',
  'Monoprix Mobile',
  'Fnac Mobile',
  'Darty Mobile',
  'Boulanger Mobile',
  'LDLC Mobile',
  'Materiel.net Mobile',
  'Rue du Commerce Mobile',
  'Cdiscount',
  'Amazon',
  'Fnac',
  'Darty',
  'Boulanger',
  'LDLC',
  'Materiel.net',
  'Rue du Commerce',
  'Rakuten',
  'eBay',
  'AliExpress',
  'Wish',
  'Veepee',
  'Vente-privee.com',
  'Showroomprive.com',
  'Brandalley',
  'Spartoo',
  'Zalando',
  'ASOS',
  'Vinted',
  'Le Bon Coin',
  'Leboncoin',
  'Facebook Marketplace',
  'Marketplace',
  'Autre',
].sort();

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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]); // Track image URLs separately
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [brandInputMode, setBrandInputMode] = useState<'select' | 'manual'>('select');
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [merchantInputModes, setMerchantInputModes] = useState<Record<number, 'select' | 'manual'>>({});
  const [merchantSearchTerms, setMerchantSearchTerms] = useState<Record<number, string>>({});
  const [showMerchantDropdowns, setShowMerchantDropdowns] = useState<Record<number, boolean>>({});
  const [offers, setOffers] = useState<OfferFormData[]>([
    { merchant_id: '', merchant_name: '', price: '', url: '', stock_status: 'in_stock', currency: 'MAD' }
  ]);

  // Filter brands based on search term
  const filteredBrands = brandSearchTerm
    ? staticBrands.filter((brand) =>
        brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
      )
    : staticBrands;

  // Filter categories based on search term
  const filteredCategories = categorySearchTerm
    ? categories.filter((category) =>
        category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
      )
    : categories;

  // Filter merchants based on search term for each offer
  const getFilteredMerchants = (offerIndex: number) => {
    const searchTerm = merchantSearchTerms[offerIndex] || '';
    if (!searchTerm) return merchants;
    return merchants.filter((merchant) =>
      merchant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

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
      tags: [] as string[],
      specs: {} as Record<string, string | number | boolean>,
      release_date: '',
    },
  });

  const watchedTags = watch('tags');
  const watchedImageUrl = watch('image');

  // Update image previews when image URL changes
  useEffect(() => {
    if (watchedImageUrl && watchedImageUrl.trim()) {
      // Validate URL
      try {
        const url = new URL(watchedImageUrl.trim());
        const urlString = url.toString();
        
        // Get current file previews (data URLs from file uploads)
        const currentFilePreviews = imagePreviews.filter(preview => preview.startsWith('data:'));
        
        // Check if this URL is already in previews
        const urlIndex = imagePreviews.findIndex(preview => 
          !preview.startsWith('data:') && preview === urlString
        );
        
        if (urlIndex === -1) {
          // URL not in previews, add it
          const newPreviews = [...currentFilePreviews, urlString];
          setImagePreviews(newPreviews);
          setImageUrls([urlString]);
          // Show the newly added URL image
          setCurrentImageIndex(currentFilePreviews.length);
        } else {
          // URL already in previews, just switch to it
          setCurrentImageIndex(urlIndex);
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    } else {
      // URL field is empty, remove URL previews but keep file previews
      const filePreviews = imagePreviews.filter(preview => preview.startsWith('data:'));
      if (filePreviews.length !== imagePreviews.length) {
        setImagePreviews(filePreviews);
        setImageUrls([]);
        if (filePreviews.length > 0) {
          const newIndex = currentImageIndex < filePreviews.length ? currentImageIndex : filePreviews.length - 1;
          setCurrentImageIndex(newIndex);
        } else {
          setCurrentImageIndex(0);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedImageUrl]);

  // Function to load product data
  const loadProductData = useCallback(async (productSlug: string, merchantsList: Merchant[]) => {
    if (!tokens?.key) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/products/${productSlug}/`, {
        headers: {
          Authorization: `Token ${tokens.key}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load product');
      }
      
      const data: Product = await response.json();
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
      
      // Set brand input mode based on whether brand exists in static list
      if (data.brand) {
        const isInStaticList = staticBrands.includes(data.brand);
        setBrandInputMode(isInStaticList ? 'select' : 'manual');
        if (isInStaticList) {
          setBrandSearchTerm(data.brand);
        }
      } else {
        setBrandInputMode('select');
        setBrandSearchTerm('');
      }
      
      // Load existing images
      if (data.images && data.images.length > 0) {
        const sortedImages = [...data.images].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        const imageUrlsList = sortedImages
          .map((img: { image_url?: string; image?: string }) => img.image_url || img.image || '')
          .filter((url: string) => url && (url.startsWith('http://') || url.startsWith('https://')));
        setImagePreviews(imageUrlsList);
        setImageUrls(imageUrlsList);
      } else if (data.image) {
        // Fallback to single image URL if no images array
        const imageUrl = data.image;
        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
          setImagePreviews([imageUrl]);
          setImageUrls([imageUrl]);
        }
      }
      
      // Note: The watchedImageUrl useEffect will handle updating previews when the form image field changes
      
      // Load existing offers
      if (data.offers && data.offers.length > 0) {
        const loadedOffers = data.offers.map((offer, index) => {
          const offerData: OfferFormData = {
            merchant_id: offer.merchant?.id || '',
            merchant_name: '', // Will be set if merchant is not in the list
            price: offer.price?.toString() || '',
            url: offer.url || '',
            stock_status: (offer.stock_status as 'in_stock' | 'low_stock' | 'out_of_stock') || 'in_stock',
            currency: offer.currency || 'MAD',
          };
          
          // Set merchant input mode based on whether merchant exists in the list
          if (offer.merchant?.id) {
            const merchantExists = merchantsList.some(m => m.id === offer.merchant!.id);
            if (merchantExists) {
              setMerchantInputModes(prev => ({ ...prev, [index]: 'select' }));
            } else {
              setMerchantInputModes(prev => ({ ...prev, [index]: 'manual' }));
              offerData.merchant_name = offer.merchant.name;
              offerData.merchant_id = '';
            }
          }
          
          return offerData;
        });
        setOffers(loadedOffers);
      } else {
        setOffers([{ merchant_id: '', merchant_name: '', price: '', url: '', stock_status: 'in_stock', currency: 'MAD' }]);
      }
    } catch (err) {
      console.error('Failed to load product', err);
      setError('Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  }, [tokens, reset]);

  useEffect(() => {
    if (!tokens?.key) return;

    // Load categories and merchants
    Promise.all([
      getAllCategories().catch((err) => {
        console.error('Failed to load categories', err);
        return [];
      }),
      getMerchants().catch((err) => {
        console.error('Failed to load merchants', err);
        return [];
      })
    ]).then(([cats, mers]) => {
      // Show all categories (both parent and subcategories)
      // The backend will handle the category assignment correctly
      console.log('Loaded categories:', cats.length);
      setCategories(cats);
      setMerchants(mers);
      
      // If editing, load product data after merchants are loaded
      if (isEdit && slug) {
        loadProductData(slug, mers);
      }
    });

    // Load available tags from products
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/products/?page_size=1000`)
      .then((res) => res.json())
      .then((data) => {
        const allTags = new Set<string>();
        (data.results || []).forEach((p: Product) => {
          if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach((tag) => {
              if (tag && typeof tag === 'string') {
                allTags.add(tag.toLowerCase().trim());
              }
            });
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      })
      .catch((err) => {
        console.error('Failed to load tags', err);
    });

    // Product loading is now handled in the Promise.all callback after merchants are loaded
  }, [tokens, isEdit, slug, loadProductData]);

  const handleAddOffer = () => {
    setOffers([...offers, { merchant_id: '', merchant_name: '', price: '', url: '', stock_status: 'in_stock', currency: 'MAD' }]);
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
        .filter((offer) => {
          // Must have either merchant_id or merchant_name
          const hasMerchant = (offer.merchant_id !== '' && offer.merchant_id !== null && offer.merchant_id !== undefined) || (offer.merchant_name && offer.merchant_name.trim() !== '');
          // Must have a valid price
          const hasValidPrice = offer.price && offer.price.toString().trim() !== '' && !isNaN(Number(offer.price)) && Number(offer.price) > 0;
          return hasMerchant && hasValidPrice;
        })
        .map((offer) => ({
          merchant_id: offer.merchant_id !== '' && typeof offer.merchant_id === 'number' ? offer.merchant_id : undefined,
          merchant_name: offer.merchant_name && offer.merchant_name.trim() !== '' ? offer.merchant_name.trim() : undefined,
          price: Number(offer.price),
          url: offer.url && offer.url.trim() !== '' ? offer.url.trim() : undefined,
          stock_status: offer.stock_status || 'in_stock',
          currency: offer.currency || 'MAD',
        }));

      // Prepare FormData for file uploads
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.brand) formData.append('brand', data.brand);
      if (data.category_id) formData.append('category_id', data.category_id.toString());
      if (data.image) formData.append('image', data.image);
      if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => formData.append('tags', tag));
      }
      if (data.specs) formData.append('specs', JSON.stringify(data.specs));
      if (data.release_date) formData.append('release_date', data.release_date);
      
      // Append image files
      productImages.forEach((imageFile) => {
        formData.append('images', imageFile);
      });
      
      // Append image URLs
      imageUrls.forEach((url) => {
        formData.append('image_urls', url);
      });

      // Append offers (DRF expects nested format for nested serializers)
      // Always send offers array when updating to ensure offers are updated
      if (isEdit) {
        // When updating, always send offers (even if empty) to update the offers
        if (validOffers.length > 0) {
          validOffers.forEach((offer, index) => {
            if (offer.merchant_id) {
              formData.append(`offers[${index}][merchant_id]`, offer.merchant_id.toString());
            }
            if (offer.merchant_name) {
              formData.append(`offers[${index}][merchant_name]`, offer.merchant_name);
            }
            // Price is required - always append it since we've already validated it
            formData.append(`offers[${index}][price]`, offer.price.toString());
            if (offer.url) {
              formData.append(`offers[${index}][url]`, offer.url);
            }
            if (offer.stock_status) {
              formData.append(`offers[${index}][stock_status]`, offer.stock_status);
            }
            if (offer.currency) {
              formData.append(`offers[${index}][currency]`, offer.currency);
            }
          });
        }
        // If no valid offers, don't send offers field - backend will keep existing offers
        // To clear all offers, send an empty array (but we'll handle that differently)
      } else {
        // When creating, only send offers if there are valid ones
        if (validOffers.length > 0) {
          validOffers.forEach((offer, index) => {
            if (offer.merchant_id) {
              formData.append(`offers[${index}][merchant_id]`, offer.merchant_id.toString());
            }
            if (offer.merchant_name) {
              formData.append(`offers[${index}][merchant_name]`, offer.merchant_name);
            }
            // Price is required - always append it since we've already validated it
            formData.append(`offers[${index}][price]`, offer.price.toString());
            if (offer.url) {
              formData.append(`offers[${index}][url]`, offer.url);
            }
            if (offer.stock_status) {
              formData.append(`offers[${index}][stock_status]`, offer.stock_status);
            }
            if (offer.currency) {
              formData.append(`offers[${index}][currency]`, offer.currency);
            }
          });
        }
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/products/`;
      const method = isEdit && slug ? 'PUT' : 'POST';
      const url = isEdit && slug 
        ? `${apiUrl}${slug}/`
        : apiUrl;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Token ${tokens.key}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update error:', errorData);
        // Display validation errors more clearly
        if (errorData.offers) {
          const offerErrors = errorData.offers.map((err: any, idx: number) => 
            `Offre ${idx + 1}: ${JSON.stringify(err)}`
          ).join('\n');
          throw new Error(`Erreurs de validation des offres:\n${offerErrors}`);
        }
        throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData) || 'Une erreur est survenue');
      }

      if (isEdit && slug) {
        setSuccess('Produit mis à jour avec succès!');
      } else {
        setSuccess('Produit créé avec succès! En attente d\'approbation.');
      }

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTag = (tag?: string) => {
    const tagToAdd = (tag || tagInput).trim().toLowerCase();
    if (tagToAdd) {
      const currentTags = watchedTags || [];
      if (!currentTags.map(t => t.toLowerCase()).includes(tagToAdd)) {
        setValue('tags', [...currentTags, tagToAdd], { shouldValidate: true });
        setTagInput('');
        setTagSuggestions([]);
      }
    }
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    
    // Show suggestions based on input
    if (value.trim().length > 0) {
      const query = value.trim().toLowerCase();
      const suggestions = availableTags
        .filter(tag => tag.includes(query) && !(watchedTags || []).map(t => t.toLowerCase()).includes(tag))
        .slice(0, 5);
      setTagSuggestions(suggestions);
    } else {
      setTagSuggestions([]);
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagSuggestions.length > 0) {
        // If suggestions exist, use the first one
        handleAddTag(tagSuggestions[0]);
      } else {
        handleAddTag();
      }
    } else if (e.key === ',' || e.key === ';') {
      // Allow comma/semicolon to add tag
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter((t) => t !== tag), { shouldValidate: true });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== files.length) {
      setError('Certains fichiers ne sont pas des images valides (JPEG, PNG, WebP, GIF uniquement)');
      return;
    }

    // Validate file sizes (max 5MB each)
    const oversizedFiles = validFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Certaines images sont trop volumineuses (maximum 5MB par image)');
      return;
    }

    // Add new files
    const newFiles = [...productImages, ...validFiles];
    setProductImages(newFiles);

    // Create previews
    const newPreviews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newPreviews.push(result);
        setImagePreviews([...imagePreviews, ...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    // Check if it's a file or URL
    const preview = imagePreviews[index];
    const isUrl = imageUrls.includes(preview);
    
    if (isUrl) {
      // Remove from URLs
      const newUrls = imageUrls.filter((_, i) => {
        const urlIndex = imagePreviews.findIndex(p => p === imageUrls[i]);
        return urlIndex !== index;
      });
      setImageUrls(newUrls);
    } else {
      // Remove from files
      const fileIndex = imagePreviews.slice(0, index).filter(p => !imageUrls.includes(p)).length;
      const newImages = productImages.filter((_, i) => i !== fileIndex);
      setProductImages(newImages);
    }
    
    // Remove from previews
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    
    if (currentImageIndex >= newPreviews.length && newPreviews.length > 0) {
      setCurrentImageIndex(newPreviews.length - 1);
    } else if (newPreviews.length === 0) {
      setCurrentImageIndex(0);
    }
  };

  const handleNextImage = () => {
    if (imagePreviews.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % imagePreviews.length);
    }
  };

  const handlePrevImage = () => {
    if (imagePreviews.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length);
    }
  };

  const handleAddImageUrl = (url: string) => {
    // Validate URL
    try {
      new URL(url);
      // Check if URL is already in previews
      if (!imagePreviews.includes(url)) {
        setImagePreviews([...imagePreviews, url]);
        setImageUrls([...imageUrls, url]);
        setCurrentImageIndex(imagePreviews.length); // Set to newly added image
      } else {
        setError('Cette URL d\'image est déjà ajoutée');
      }
    } catch (e) {
      setError('URL invalide. Veuillez entrer une URL valide (ex: https://example.com/image.jpg)');
    }
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
              Ce produit est en attente d&apos;approbation.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Product Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du produit</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className={`mt-1 block w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      errors.name 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                    }`}
                    placeholder="Entrez le nom du produit"
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-sm font-medium text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                    Description *
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (Minimum 500 caractères)
                    </span>
                  </label>
                  <textarea
                    id="description"
                    rows={6}
                    {...register('description')}
                    className={`mt-1 block w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y ${
                      errors.description 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                    }`}
                    placeholder="Décrivez le produit en détail (minimum 500 caractères)..."
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {errors.description ? (
                      <p className="text-sm font-medium text-red-600">{errors.description.message}</p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {watch('description')?.length || 0} / 500 caractères minimum
                      </p>
                    )}
                    {watch('description') && watch('description')!.length >= 500 && (
                      <p className="text-xs text-green-600 font-medium">✓ Longueur suffisante</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand" className="block text-sm font-semibold text-gray-900 mb-2">
                      Marque
                    </label>
                    <div className="space-y-2">
                      {/* Brand Selection Mode Toggle */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBrandInputMode('select');
                            setBrandSearchTerm('');
                            if (!staticBrands.includes(watch('brand') || '')) {
                              setValue('brand', '');
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            brandInputMode === 'select'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Liste
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBrandInputMode('manual');
                            setBrandSearchTerm('');
                            setShowBrandDropdown(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            brandInputMode === 'manual'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Autre
                        </button>
                      </div>

                      {/* Brand Dropdown or Manual Input */}
                      {brandInputMode === 'select' ? (
                        <div className="relative">
                          <div className="relative">
                            <input
                              type="text"
                              id="brand"
                              value={watch('brand') || brandSearchTerm}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBrandSearchTerm(value);
                                setValue('brand', value);
                                setShowBrandDropdown(true);
                              }}
                              onFocus={() => {
                                setShowBrandDropdown(true);
                              }}
                              onBlur={() => {
                                // Delay to allow clicking on dropdown items
                                setTimeout(() => {
                                  setShowBrandDropdown(false);
                                  // If current value is not in the list, keep it as custom
                                  const currentValue = watch('brand') || '';
                                  if (currentValue && !staticBrands.some(b => b.toLowerCase() === currentValue.toLowerCase())) {
                                    // Keep the custom value
                                  } else if (currentValue) {
                                    // Find exact match and set it
                                    const exactMatch = staticBrands.find(b => b.toLowerCase() === currentValue.toLowerCase());
                                    if (exactMatch) {
                                      setValue('brand', exactMatch);
                                      setBrandSearchTerm('');
                                    }
                                  }
                                }, 200);
                              }}
                              placeholder="Rechercher ou sélectionner une marque..."
                              className={`block w-full rounded-lg border-2 px-4 py-2.5 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                errors.brand 
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                  : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                              }`}
                            />
                            {/* Search Icon */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                            </div>
                          </div>
                          
                          {/* Dropdown List */}
                          {showBrandDropdown && (filteredBrands.length > 0 || brandSearchTerm) && (
                            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-primary/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredBrands.length > 0 ? (
                                filteredBrands.map((brand) => (
                                  <button
                                    key={brand}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Prevent blur
                                      setValue('brand', brand);
                                      setBrandSearchTerm('');
                                      setShowBrandDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors border-b border-gray-100 last:border-b-0"
                                  >
                                    {brand}
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-2.5 text-sm text-gray-500">
                                  Aucune marque trouvée. Utilisez le bouton &quot;Autre&quot; pour ajouter une nouvelle marque.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                    <input
                      type="text"
                      id="brand"
                      {...register('brand')}
                          className={`block w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            errors.brand 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                              : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                          }`}
                          placeholder="Entrez le nom de la marque"
                        />
                      )}
                    </div>
                    {errors.brand && (
                      <p className="mt-1.5 text-sm font-medium text-red-600">{errors.brand.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-900 mb-2">
                      Catégorie
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                      id="category"
                          value={categories.find(c => c.id === watch('category_id'))?.name || categorySearchTerm}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCategorySearchTerm(value);
                            setShowCategoryDropdown(true);
                            // If the value matches a category exactly, set it
                            const exactMatch = categories.find(c => c.name.toLowerCase() === value.toLowerCase());
                            if (exactMatch) {
                              setValue('category_id', exactMatch.id);
                              setCategorySearchTerm('');
                              setShowCategoryDropdown(false);
                            } else {
                              setValue('category_id', undefined);
                            }
                          }}
                          onFocus={() => {
                            setShowCategoryDropdown(true);
                          }}
                          onBlur={() => {
                            // Delay to allow clicking on dropdown items
                            setTimeout(() => {
                              setShowCategoryDropdown(false);
                              // If current value is not in the list, clear it
                              const currentValue = watch('category_id');
                              if (currentValue) {
                                const selectedCategory = categories.find(c => c.id === currentValue);
                                if (selectedCategory) {
                                  setCategorySearchTerm('');
                                }
                              }
                            }, 200);
                          }}
                          placeholder="Rechercher ou sélectionner une catégorie..."
                          className={`block w-full rounded-lg border-2 px-4 py-2.5 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            errors.category_id 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                              : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                          }`}
                        />
                        {/* Search Icon */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Dropdown List */}
                      {showCategoryDropdown && (filteredCategories.length > 0 || categorySearchTerm) && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-primary/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => (
                              <button
                                key={category.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent blur
                                  setValue('category_id', category.id);
                                  setCategorySearchTerm('');
                                  setShowCategoryDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                {category.name}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2.5 text-sm text-gray-500">
                              Aucune catégorie trouvée
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.category_id && (
                      <p className="mt-1.5 text-sm font-medium text-red-600">{errors.category_id.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="images" className="block text-sm font-semibold text-gray-900 mb-2">
                    Images du produit *
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (Vous pouvez télécharger plusieurs images)
                    </span>
                  </label>
                  
                  {/* Image Upload Input */}
                  <div className="mt-1">
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="images"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                    >
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-primary" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-semibold text-primary">Cliquez pour télécharger</span> ou glissez-déposez
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP, GIF jusqu&apos;à 5MB</p>
                      </div>
                    </label>
                  </div>

                  {/* Image Slideshow Preview */}
                  {imagePreviews.length > 0 && (
                    <div className="mt-4">
                      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        {/* Main Image Display */}
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={imagePreviews[currentImageIndex]}
                            alt={`Image ${currentImageIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              // Handle broken image URLs
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              // Show error message
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.image-error')) {
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'image-error text-red-500 text-sm p-4 text-center';
                                errorDiv.textContent = 'Impossible de charger cette image';
                                parent.appendChild(errorDiv);
                              }
                            }}
                            onLoad={(e) => {
                              // Hide any error messages when image loads successfully
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              const errorDiv = parent?.querySelector('.image-error');
                              if (errorDiv) {
                                errorDiv.remove();
                              }
                              target.style.display = 'block';
                            }}
                          />
                          
                          {/* Navigation Arrows */}
                          {imagePreviews.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={handlePrevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                                aria-label="Image précédente"
                              >
                                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={handleNextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                                aria-label="Image suivante"
                              >
                                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </>
                          )}
                          
                          {/* Image Counter */}
                          {imagePreviews.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                              {currentImageIndex + 1} / {imagePreviews.length}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail Gallery */}
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {imagePreviews.map((preview, index) => (
                          <div
                            key={index}
                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                              index === currentImageIndex
                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                : 'border-gray-200 hover:border-primary/50'
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                          >
                            <img
                              src={preview}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index);
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              aria-label="Supprimer l'image"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy URL input (optional) */}
                  <div className="mt-4">
                    <label htmlFor="image_url" className="block text-xs font-medium text-gray-600 mb-1">
                      Ou URL de l&apos;image (optionnel)
                    </label>
                    <input
                      type="url"
                      id="image_url"
                      {...register('image')}
                      className={`block w-full rounded-lg border-2 px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        errors.image 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                      }`}
                      placeholder="https://example.com/image.jpg"
                    />
                    {errors.image && (
                      <p className="mt-1.5 text-sm font-medium text-red-600">{errors.image.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="release_date" className="block text-sm font-semibold text-gray-900 mb-2">
                    Date de sortie (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    id="release_date"
                    {...register('release_date')}
                    className={`mt-1 block w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      errors.release_date 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                    }`}
                  />
                  {errors.release_date && (
                    <p className="mt-1.5 text-sm font-medium text-red-600">{errors.release_date.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-semibold text-gray-900 mb-2">
                    Tags
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (Appuyez sur Entrée ou utilisez une virgule pour ajouter)
                    </span>
                  </label>
                  <div className="mt-1 relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                    <input
                      type="text"
                      id="tags"
                      value={tagInput}
                          onChange={(e) => handleTagInputChange(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Tapez un tag et appuyez sur Entrée..."
                          className="w-full rounded-lg border-2 border-primary/30 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
                        />
                        {tagSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {tagSuggestions.map((suggestion) => (
                    <button
                                key={suggestion}
                      type="button"
                                onClick={() => handleAddTag(suggestion)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    <button
                      type="button"
                        onClick={() => handleAddTag()}
                        disabled={!tagInput.trim()}
                        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                  {errors.tags && (
                    <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
                  )}
                  {watchedTags && watchedTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                      {watchedTags.map((tag) => (
                        <span
                          key={tag}
                            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary border border-primary/20"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                              className="text-primary hover:text-primary/80 font-bold text-base leading-none"
                              aria-label={`Supprimer le tag ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                    {availableTags.length > 0 && tagInput.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        Tags populaires: {availableTags.slice(0, 10).join(', ')}
                        {availableTags.length > 10 && '...'}
                      </p>
                    )}
                  </div>
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
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Marchand *
                        </label>
                        <div className="space-y-2">
                          {/* Merchant Selection Mode Toggle */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMerchantInputModes(prev => ({ ...prev, [index]: 'select' }));
                                setMerchantSearchTerms(prev => ({ ...prev, [index]: '' }));
                                const currentMerchantId = offer.merchant_id;
                                if (currentMerchantId && typeof currentMerchantId === 'number') {
                                  const merchant = merchants.find(m => m.id === currentMerchantId);
                                  if (!merchant) {
                                    handleOfferChange(index, 'merchant_id', '');
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                (merchantInputModes[index] || 'select') === 'select'
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Liste
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMerchantInputModes(prev => ({ ...prev, [index]: 'manual' }));
                                setMerchantSearchTerms(prev => ({ ...prev, [index]: '' }));
                                setShowMerchantDropdowns(prev => ({ ...prev, [index]: false }));
                                handleOfferChange(index, 'merchant_id', '');
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                (merchantInputModes[index] || 'select') === 'manual'
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Autre
                            </button>
                          </div>

                          {(merchantInputModes[index] || 'select') === 'select' ? (
                            <div className="relative">
                              <input
                                type="text"
                                value={
                                  offer.merchant_id && typeof offer.merchant_id === 'number'
                                    ? merchants.find(m => m.id === offer.merchant_id)?.name || merchantSearchTerms[index] || ''
                                    : merchantSearchTerms[index] || ''
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setMerchantSearchTerms(prev => ({ ...prev, [index]: value }));
                                  const exactMatch = merchants.find(m => m.name.toLowerCase() === value.toLowerCase());
                                  if (exactMatch) {
                                    handleOfferChange(index, 'merchant_id', exactMatch.id);
                                    setMerchantSearchTerms(prev => ({ ...prev, [index]: '' }));
                                    setShowMerchantDropdowns(prev => ({ ...prev, [index]: false }));
                                  } else {
                                    handleOfferChange(index, 'merchant_id', '');
                                    setShowMerchantDropdowns(prev => ({ ...prev, [index]: true }));
                                  }
                                }}
                                onFocus={() => {
                                  if (merchantSearchTerms[index] || !offer.merchant_id) {
                                    setShowMerchantDropdowns(prev => ({ ...prev, [index]: true }));
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setShowMerchantDropdowns(prev => ({ ...prev, [index]: false }));
                                    if (merchantSearchTerms[index] && !merchants.some(m => m.name.toLowerCase() === merchantSearchTerms[index]?.toLowerCase())) {
                                      setMerchantSearchTerms(prev => ({ ...prev, [index]: '' }));
                                    }
                                  }, 200);
                                }}
                                placeholder="Rechercher ou sélectionner un marchand..."
                                className={`block w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                  !offer.merchant_id && index === 0
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                    : 'border-primary/30 focus:border-primary focus:ring-primary bg-white'
                                }`}
                              />
                              {/* Search icon */}
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                              {showMerchantDropdowns[index] && (getFilteredMerchants(index).length > 0 || merchantSearchTerms[index]) && (
                                <div className="absolute z-50 w-full mt-1 bg-white border-2 border-primary/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {getFilteredMerchants(index).length > 0 ? (
                                    getFilteredMerchants(index).map((merchant) => (
                                      <button
                                        key={merchant.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleOfferChange(index, 'merchant_id', merchant.id);
                                          setMerchantSearchTerms(prev => ({ ...prev, [index]: '' }));
                                          setShowMerchantDropdowns(prev => ({ ...prev, [index]: false }));
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors border-b border-gray-100 last:border-b-0"
                                      >
                                        {merchant.name}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-4 py-2.5 text-sm text-gray-500">
                                      Aucun marchand trouvé. Utilisez le bouton &quot;Autre&quot; pour ajouter un nouveau marchand.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={offer.merchant_name || ''}
                              onChange={(e) => {
                                const updatedOffers = [...offers];
                                updatedOffers[index] = { ...updatedOffers[index], merchant_name: e.target.value };
                                setOffers(updatedOffers);
                              }}
                              placeholder="Entrez le nom du marchand manuellement"
                              className="block w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 border-primary/30 focus:border-primary focus:ring-primary bg-white"
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Prix (MAD) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={offer.price}
                          onChange={(e) => handleOfferChange(index, 'price', e.target.value)}
                          className="w-full rounded-lg border-2 border-primary/30 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          URL du produit
                        </label>
                        <input
                          type="url"
                          value={offer.url}
                          onChange={(e) => handleOfferChange(index, 'url', e.target.value)}
                          className="w-full rounded-lg border-2 border-primary/30 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Statut du stock
                        </label>
                        <select
                          value={offer.stock_status}
                          onChange={(e) => handleOfferChange(index, 'stock_status', e.target.value)}
                          className="w-full rounded-lg border-2 border-primary/30 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
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

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border-2 border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {submitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le produit'}
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
