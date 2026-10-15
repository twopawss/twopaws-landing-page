import taxonomy from "./catalogueTaxonomy.json" with { type: "json" };

/**
 * Taxonomy logic shared by the client (through @shared) and the build scripts, so a product lands on
 * the same category page everywhere. Data lives in catalogueTaxonomy.json.
 *
 * Classification order:
 *   1. a raw supplier category name listed under a category, within the product's pet type;
 *   2. otherwise keywords in the product name (most supplier feeds only say "Cat" or "Dog"), with the
 *      pet type taken from petTypes or, when that is empty, from the name.
 */

const normalize = (value) => String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

export const TAXONOMY_PETS = Object.entries(taxonomy.pets).map(([key, pet]) => ({ key, ...pet }));
export const TAXONOMY_CATEGORIES = taxonomy.categories;

export const petByKey = (key) => TAXONOMY_PETS.find((pet) => pet.key === key) ?? null;
export const categoryPath = (category) => `/shop/${category.pet}/${category.slug}/`;
export const petPath = (pet) => `/shop/${pet.key}/`;
export const findCategory = (pet, slug) => TAXONOMY_CATEGORIES.find((category) => category.pet === pet && category.slug === slug) ?? null;
export const categoriesForPet = (pet) => TAXONOMY_CATEGORIES.filter((category) => category.pet === pet);

// Pet hints: species words, breed and size words, and brands that only make products for one species.
const CAT_WORDS = /\b(cat|cats|kitten|kittens|feline|catnip|persian|siamese|maine coon|british shorthair|sphynx|ragdoll|bengal|sheba|whiskas|felix|meow mix|temptations|catsome|catmoon|kiki kat|sani cat|procat|cat'?s white|purina one|inaba|churu|tomi|قط|قطط)\b/i;
const DOG_WORDS = /\b(dog|dogs|puppy|puppies|canine|maxi|mini|giant|medium|labrador|pomeranian|bulldog|shepherd|golden|retriever|husky|poodle|chihuahua|yorkshire|dachshund|beagle|rottweiler|pedigree|wags|woof|kong|frisbee|kennel|muzzle|كلب|كلاب)\b/i;

/** Name keyword rules, first match wins. "pets" categories apply to any pet; the others need a pet. */
const NAME_RULES = [
  { pattern: /\b(flea|fleas|tick|ticks|frontline|bravecto|advantix|advocate|revolution|spot[- ]?on|nexgard|simparica)\b/i, slug: "flea-and-tick", pet: "pets" },
  { pattern: /\b(shampoo|conditioner|perfume|cologne|deodori[sz]ing|perfuim)\b/i, slug: "shampoo-and-perfume", pet: "pets" },
  { pattern: /\b(vitamin|vitamins|supplement|dewormer|deworming|drontal|probiotic|omega|calcium|syrup|tablets?|drops|ointment|antibiotic|wound|eye|ear|toothpaste|oral care|digestive|recovery|hepatic|heptone|liver support)\b/i, slug: "pharmacy-and-vitamins", pet: "pets" },
  { pattern: /\b(brush|comb|clipper|clippers|nail|deshedding|grooming|trimmer|glove)\b/i, slug: "grooming", pet: "pets" },
  { pattern: /\b(litter|sand|bentonite|silica|tofu litter|clumping)\b/i, slug: "litter", pet: "cats" },
  { pattern: /\b(pad|pads|diaper|diapers|nappies|nappy)\b/i, slug: "training-pads", pet: "dogs" },
  { pattern: /\b(collar|collars|leash|leashes|lead|harness|muzzle)\b/i, slug: "collars-leashes", pet: "dogs" },
  { pattern: /\b(bed|beds|house|cushion|mattress|kennel|crate)\b/i, slug: "beds", pet: "dogs" },
  { pattern: /\b(toy|toys|catnip|ball|balls|teaser|scratcher|scratching|rope|plush|squeak|squeaky|frisbee|tunnel)\b/i, slug: "toys" },
  { pattern: /\b(treat|treats|chips|chipes|ice cream|stick|sticks|biscuit|biscuits|snack|snacks|chew|chews|churu|dental|jerky|bone|bones)\b/i, slug: "treats" },
  { pattern: /\b(fresh|freshly|cooked)\b/i, slug: "fresh-food", pet: "dogs" },
  { pattern: /\b(wet|pouch|pouches|can|cans|canned|loaf|gravy|jelly|sachet|sachets|mousse|pate|paté|terrine|chunks)\b/i, slug: "wet-food" },
  { pattern: /\b(dry|kibble|food|adult|kitten|puppy|senior|sterili[sz]ed|neutered|indoor|urinary|renal|gastro|hypoallergenic|breed|mini|maxi|medium|giant|kg)\b/i, slug: "dry-food" },
  { pattern: /\b(bowl|bowls|feeder|fountain|bottle|carrier|cage|box|tray|scoop|mat|stroller|dispenser)\b/i, slug: "accessories" },
];

const petKeyFor = (product) => {
  const pets = new Set(product.petTypes ?? []);
  const name = String(product.name ?? "");
  const saysCat = CAT_WORDS.test(name), saysDog = DOG_WORDS.test(name);
  if (pets.has("cat") && !pets.has("dog")) return "cats";
  if (pets.has("dog") && !pets.has("cat")) return "dogs";
  if (saysCat && !saysDog) return "cats";
  if (saysDog && !saysCat) return "dogs";
  if (pets.has("cat") && pets.has("dog")) return "cats";
  return "";
};

/** The taxonomy category a product belongs to, or null. */
export const categoryForProduct = (product) => {
  const raw = new Set((product.categoryNames ?? []).map(normalize));
  const pets = new Set(product.petTypes ?? []);
  for (const category of TAXONOMY_CATEGORIES) {
    const pet = petByKey(category.pet);
    const petOk = !pet?.petType || pets.has(pet.petType) || (!pets.size && petKeyFor(product) === category.pet);
    if (petOk && category.raw.some((name) => raw.has(normalize(name)))) return category;
  }
  const petKey = petKeyFor(product);
  const name = String(product.name ?? "");
  // A raw category we know, but no pet signal anywhere: file it under the first (cat) page that lists it rather than dropping it.
  if (!pets.size && !petKey) {
    const byRaw = TAXONOMY_CATEGORIES.find((category) => category.raw.some((value) => raw.has(normalize(value))));
    if (byRaw) return byRaw;
  }
  for (const rule of NAME_RULES) {
    if (!rule.pattern.test(name)) continue;
    // Supplies with no pet signal go to the general "pets" accessories page rather than being guessed.
    const targetPet = rule.pet ?? petKey ?? "";
    if (!targetPet && rule.slug !== "accessories") continue;
    const found = findCategory(targetPet || "pets", rule.slug) ?? (targetPet && targetPet !== "pets" ? findCategory("pets", rule.slug) : null);
    if (found) return found;
  }
  return null;
};
