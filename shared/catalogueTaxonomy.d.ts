export type TaxonomyPet = { key: string; petType: "" | "dog" | "cat" | "other"; name: string; nameAr: string; description: string };
export type TaxonomyCategory = {
  pet: string;
  slug: string;
  name: string;
  nameAr: string;
  googleProductCategory: string;
  raw: string[];
  description: string;
};
type ProductLike = { name?: string; categoryNames?: string[]; petTypes?: string[] };
export declare const TAXONOMY_PETS: TaxonomyPet[];
export declare const TAXONOMY_CATEGORIES: TaxonomyCategory[];
export declare const petByKey: (key: string) => TaxonomyPet | null;
export declare const categoryPath: (category: TaxonomyCategory) => string;
export declare const petPath: (pet: TaxonomyPet) => string;
export declare const findCategory: (pet: string, slug: string) => TaxonomyCategory | null;
export declare const categoriesForPet: (pet: string) => TaxonomyCategory[];
export declare const categoryForProduct: (product: ProductLike) => TaxonomyCategory | null;
