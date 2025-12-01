// Category image mapping based on category names
export const categoryImageMap: Record<string, string> = {
  'autre': '/images/categories/autre.jpg',
  'image et son': '/images/categories/image-son.jpg',
  'informatique': '/images/categories/informatique.jpg',
  'petit électroménager': '/images/categories/electromenager.jpg',
  'photo et caméra': '/images/categories/photo-camera.jpg',
  'santé et beauté': '/images/categories/sante-beaute.jpg',
  'smartphones': '/images/categories/smartphones.jpg',
  'téléphonie': '/images/categories/telephone.jpg',
  'électroménager': '/images/categories/electromenager.jpg',
  // Additional mappings for variations
  'smartphone': '/images/categories/smartphones.jpg',
  'telephonie': '/images/categories/telephone.jpg',
  'sante et beaute': '/images/categories/sante-beaute.jpg',
  'photo et camera': '/images/categories/photo-camera.jpg',
  'petit electromenager': '/images/categories/electromenager.jpg',
  'electromenager': '/images/categories/electromenager.jpg',
};

/**
 * Get the image path for a category based on its name
 * @param categoryName - The name of the category
 * @returns The image path or null if not found
 */
export function getCategoryImage(categoryName: string): string | null {
  const normalizedName = categoryName.toLowerCase().trim();
  return categoryImageMap[normalizedName] || null;
}

