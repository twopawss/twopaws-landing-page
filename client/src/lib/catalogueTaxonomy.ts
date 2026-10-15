import taxonomy from "@shared/catalogueTaxonomy.json";
import { brandSlugPath, productSlugPath, slugify } from "@shared/catalogueSlug";
import type { PublicProduct } from "@/lib/catalogueApi";

/** The checked-in category taxonomy (shared/catalogueTaxonomy.json): raw supplier categories mapped onto landing pages. */

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

const normalize = (value: unknown) => String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

export const TAXONOMY_PETS: TaxonomyPet[] = Object.entries(taxonomy.pets).map(([key, pet]) => ({ key, ...(pet as Omit<TaxonomyPet, "key">) }));
export const TAXONOMY_CATEGORIES: TaxonomyCategory[] = taxonomy.categories as TaxonomyCategory[];

export const petByKey = (key: string) => TAXONOMY_PETS.find((pet) => pet.key === key) ?? null;
export const categoryPath = (category: TaxonomyCategory) => `/shop/${category.pet}/${category.slug}/`;
export const findCategory = (pet: string, slug: string) =>
  TAXONOMY_CATEGORIES.find((category) => category.pet === pet && category.slug === slug) ?? null;
export const categoriesForPet = (pet: string) => TAXONOMY_CATEGORIES.filter((category) => category.pet === pet);

/** The taxonomy category a product belongs to: the first category whose raw names and pet type match. */
export const categoryForProduct = (product: Pick<PublicProduct, "categoryNames" | "petTypes">) => {
  const raw = new Set(product.categoryNames.map(normalize));
  const pets = new Set(product.petTypes);
  for (const category of TAXONOMY_CATEGORIES) {
    const pet = petByKey(category.pet);
    const petOk = !pet?.petType || pets.has(pet.petType);
    if (petOk && category.raw.some((name) => raw.has(normalize(name)))) return category;
  }
  return null;
};

export { brandSlugPath, productSlugPath, slugify };
