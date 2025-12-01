import { z } from 'zod';

// Product validation schema
export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom du produit est requis')
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  description: z
    .string()
    .max(5000, 'La description ne peut pas dépasser 5000 caractères')
    .optional()
    .or(z.literal('')),
  brand: z
    .string()
    .max(120, 'La marque ne peut pas dépasser 120 caractères')
    .optional()
    .or(z.literal('')),
  category_id: z
    .union([z.number().positive('Catégorie invalide'), z.nan(), z.undefined()])
    .optional()
    .transform((val) => (typeof val === 'number' && !isNaN(val) ? val : undefined)),
  image: z
    .string()
    .refine(
      (val) => !val || z.string().url().safeParse(val).success,
      'URL invalide'
    )
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string().min(1, 'Les tags ne peuvent pas être vides'))
    .max(20, 'Maximum 20 tags autorisés')
    .optional()
    .default([]),
  specs: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .default({}),
  release_date: z
    .string()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      'Format de date invalide (YYYY-MM-DD)'
    )
    .optional()
    .or(z.literal('')),
  source_category: z
    .string()
    .max(150, 'La catégorie source ne peut pas dépasser 150 caractères')
    .optional()
    .or(z.literal('')),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse email est requise')
    .email('Format d\'email invalide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Base register validation schema (common fields)
const baseRegisterSchema = z.object({
  username: z
    .string()
    .min(1, 'Le nom d\'utilisateur est requis')
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(150, 'Le nom d\'utilisateur ne peut pas dépasser 150 caractères')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'
    ),
  email: z
    .string()
    .min(1, 'L\'adresse email est requise')
    .email('Format d\'email invalide'),
  password1: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
  password2: z.string().min(1, 'La confirmation du mot de passe est requise'),
  first_name: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(150, 'Le prénom ne peut pas dépasser 150 caractères'),
  last_name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(150, 'Le nom ne peut pas dépasser 150 caractères'),
});

// Client register validation schema (with enterprise fields)
export const clientRegisterSchema = baseRegisterSchema
  .extend({
    enterprise_name: z
      .string()
      .min(1, 'Le nom de l\'entreprise est requis')
      .max(200, 'Le nom de l\'entreprise ne peut pas dépasser 200 caractères'),
    address: z
      .string()
      .min(1, 'L\'adresse est requise')
      .max(500, 'L\'adresse ne peut pas dépasser 500 caractères'),
    phone_number: z
      .string()
      .min(1, 'Le numéro de téléphone est requis')
      .max(20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères')
      .regex(
        /^[\d\s\-\+\(\)]+$/,
        'Le numéro de téléphone contient des caractères invalides'
      ),
  })
  .refine((data) => data.password1 === data.password2, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password2'],
  });

// User register validation schema (simple, no enterprise fields)
export const userRegisterSchema = baseRegisterSchema
  .refine((data) => data.password1 === data.password2, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password2'],
  });

// Legacy register schema (for backward compatibility)
export const registerSchema = clientRegisterSchema;

export type ClientRegisterFormData = z.infer<typeof clientRegisterSchema>;
export type UserRegisterFormData = z.infer<typeof userRegisterSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// Alert validation schema
export const alertSchema = z.object({
  threshold: z
    .string()
    .min(1, 'Le prix seuil est requis')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Le prix doit être un nombre positif'
    ),
});

export type AlertFormData = z.infer<typeof alertSchema>;

// Magic tool URL validation schema
export const magicToolSchema = z.object({
  url: z
    .string()
    .min(1, 'L\'URL est requise')
    .url('Format d\'URL invalide'),
});

export type MagicToolFormData = z.infer<typeof magicToolSchema>;

// CSV file validation
export const csvFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Le fichier ne peut pas dépasser 10MB')
    .refine(
      (file) => file.name.endsWith('.csv'),
      'Le fichier doit être un fichier CSV'
    ),
});

export type CSVFileFormData = z.infer<typeof csvFileSchema>;

