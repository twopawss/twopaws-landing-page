type SeoProduct = {
  name: string;
  brand?: string | null;
  description?: string | null;
  minimumPriceMinor: number;
  variants?: { label?: string | null }[];
  offers?: { sellingPriceMinor: number; supplierName?: string | null }[];
  suppliers?: { name?: string | null }[];
};

export declare const formatSeoPrice: (minor: number) => string;
export declare const cleanCatalogueDescription: (value: unknown) => string;
export declare const productSeoTitle: (product: SeoProduct, selectedVariantLabel?: string | null) => string;
export declare const productSeoDescription: (product: SeoProduct) => string;
export declare const productSchemaDescription: (product: SeoProduct) => string;
export declare const supplierDeliveryRateEgp: (supplierName: unknown) => number | null;
export declare const productOffersSchema: (input: {
  product: SeoProduct;
  baseUrl: string;
  canonicalUrl: string;
  shippingRateEgp?: number | null;
  now?: Date;
}) => Record<string, unknown>;
