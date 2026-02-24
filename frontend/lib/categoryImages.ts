// Category image mapping based on category names
export const categoryImageMap: Record<string, string> = {
  'autre': '/images/categories/autre.jpg',
  'image et son': '/images/categories/image-son.png',
  'image & son': '/images/categories/image-son.png',
  'informatique': '/images/categories/informatique.png',
  'petit électroménager': '/images/categories/petit_electromenager.png',
  'petit electromenager': '/images/categories/petit_electromenager.png',
  'photo et caméra': '/images/categories/photo-camera.png',
  'photo & caméra': '/images/categories/photo-camera.png',
  'photo et camera': '/images/categories/photo-camera.png',
  'photo & camera': '/images/categories/photo-camera.png',
  'santé et beauté': '/images/categories/sante-beaute.png',
  'santé - beauté': '/images/categories/sante-beaute.png',
  'sante et beaute': '/images/categories/sante-beaute.png',
  'sante - beaute': '/images/categories/sante-beaute.png',
  'smartphones': '/images/categories/smartphones.jpg',
  'smartphone': '/images/categories/smartphones.jpg',
  'téléphonie': '/images/categories/telephone.png',
  'telephonie': '/images/categories/telephone.png',
  'électroménager': '/images/categories/electromenager.png',
  'electromenager': '/images/categories/electromenager.png',
};

/**
 * Normalize category name for matching
 * Handles variations like "&" vs "et", "-" vs "et", accents, etc.
 */
function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace "&" with "et"
    .replace(/\s*&\s*/g, ' et ')
    // Replace "-" with "et" (for "Santé - Beauté" -> "Santé et Beauté")
    .replace(/\s*-\s*/g, ' et ')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get the image path for a category based on its name
 * @param categoryName - The name of the category
 * @returns The image path or null if not found
 */
export function getCategoryImage(categoryName: string): string | null {
  const normalizedName = normalizeCategoryName(categoryName);
  
  // Try exact match first
  if (categoryImageMap[normalizedName]) {
    return categoryImageMap[normalizedName];
  }
  
  // Try without accents
  const withoutAccents = normalizedName
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c');
  
  if (categoryImageMap[withoutAccents]) {
    return categoryImageMap[withoutAccents];
  }
  
  return null;
}

