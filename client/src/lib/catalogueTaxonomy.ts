import { brandSlugPath, productSlugPath, slugify } from "@shared/catalogueSlug";

/** The checked-in category taxonomy (shared/catalogueTaxonomy.json) and its classification rules (shared/catalogueTaxonomy.js). */
export {
  TAXONOMY_CATEGORIES, TAXONOMY_PETS, categoriesForPet, categoryForProduct, categoryPath, findCategory, petByKey, petPath,
  type TaxonomyCategory, type TaxonomyPet,
} from "@shared/catalogueTaxonomy";
export { brandSlugPath, productSlugPath, slugify };
