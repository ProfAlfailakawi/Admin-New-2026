const BOOT_INLINE_ASSET_FIELDS = ["imageUrl", "image", "photo"] as const;

type BootInlineAssetField = (typeof BOOT_INLINE_ASSET_FIELDS)[number];

type BootInlineAssetReference =
  | {
      target: "product";
      productIndex: number;
      field: BootInlineAssetField;
      assetIndex: number;
    }
  | {
      target: "invoiceItemProduct";
      invoiceIndex: number;
      itemIndex: number;
      field: BootInlineAssetField;
      assetIndex: number;
    };

type BootInlineAssetPack = {
  formatVersion: 1;
  assets: string[];
  references: BootInlineAssetReference[];
};

// Firestore currently contains the same inline product image in the product shard
// and in historical invoice item snapshots. This transport-only representation
// sends each exact inline image once and records every original location.
export function packBootInlineAssets(sourceData: any) {
  const data = { ...sourceData };
  const assets: string[] = [];
  const references: BootInlineAssetReference[] = [];
  const assetIndexes = new Map<string, number>();
  let originalInlineChars = 0;

  const registerAsset = (
    record: any,
    makeReference: (
      field: BootInlineAssetField,
      assetIndex: number,
    ) => BootInlineAssetReference,
  ) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    for (const field of BOOT_INLINE_ASSET_FIELDS) {
      const value = record[field];
      if (
        typeof value !== "string" ||
        !value.startsWith("data:") ||
        value.length < 256
      ) {
        continue;
      }

      originalInlineChars += value.length;
      let assetIndex = assetIndexes.get(value);
      if (assetIndex === undefined) {
        assetIndex = assets.length;
        assets.push(value);
        assetIndexes.set(value, assetIndex);
      }
      record[field] = "";
      references.push(makeReference(field, assetIndex));
    }
  };

  if (Array.isArray(sourceData?.products)) {
    data.products = sourceData.products.map(
      (sourceProduct: any, productIndex: number) => {
        if (!sourceProduct || typeof sourceProduct !== "object") {
          return sourceProduct;
        }
        const product = { ...sourceProduct };
        registerAsset(product, (field, assetIndex) => ({
          target: "product",
          productIndex,
          field,
          assetIndex,
        }));
        return product;
      },
    );
  }

  if (Array.isArray(sourceData?.invoices)) {
    data.invoices = sourceData.invoices.map(
      (sourceInvoice: any, invoiceIndex: number) => {
        if (!sourceInvoice || typeof sourceInvoice !== "object") {
          return sourceInvoice;
        }
        if (!Array.isArray(sourceInvoice.items)) return sourceInvoice;
        let invoiceChanged = false;
        const items = sourceInvoice.items.map(
          (sourceItem: any, itemIndex: number) => {
            const sourceProduct = sourceItem?.product;
            if (
              !sourceProduct ||
              typeof sourceProduct !== "object" ||
              Array.isArray(sourceProduct)
            ) {
              return sourceItem;
            }
            const product = { ...sourceProduct };
            const referenceCountBefore = references.length;
            registerAsset(product, (field, assetIndex) => ({
              target: "invoiceItemProduct",
              invoiceIndex,
              itemIndex,
              field,
              assetIndex,
            }));
            if (references.length === referenceCountBefore) return sourceItem;
            invoiceChanged = true;
            return { ...sourceItem, product };
          },
        );
        return invoiceChanged ? { ...sourceInvoice, items } : sourceInvoice;
      },
    );
  }

  const uniqueInlineChars = assets.reduce(
    (total, value) => total + value.length,
    0,
  );
  return {
    data,
    assetPack:
      references.length > 0
        ? ({
            formatVersion: 1,
            assets,
            references,
          } satisfies BootInlineAssetPack)
        : null,
    stats: {
      uniqueAssets: assets.length,
      references: references.length,
      savedInlineChars: Math.max(0, originalInlineChars - uniqueInlineChars),
    },
  };
}

const ALLOWED_BOOT_INLINE_ASSET_FIELDS = new Set<string>(
  BOOT_INLINE_ASSET_FIELDS,
);

// Rebuild every value before the response enters application state. Validation
// fails closed so an incomplete transport pack can never be displayed or saved.
export function restoreBootInlineAssets(payload: any): any {
  const data = payload?.data;
  const pack = payload?.bootAssetPack;
  if (!pack) return data;
  if (
    pack.formatVersion !== 1 ||
    !Array.isArray(pack.assets) ||
    !Array.isArray(pack.references) ||
    !data ||
    typeof data !== "object"
  ) {
    throw new Error("INVALID_BOOT_ASSET_PACK");
  }

  const operations: Array<{
    record: Record<string, any>;
    field: string;
    value: string;
  }> = [];
  for (const reference of pack.references) {
    const field = String(reference?.field || "");
    const assetIndex = Number(reference?.assetIndex);
    const value = pack.assets[assetIndex];
    if (
      !ALLOWED_BOOT_INLINE_ASSET_FIELDS.has(field) ||
      !Number.isInteger(assetIndex) ||
      assetIndex < 0 ||
      typeof value !== "string" ||
      !value.startsWith("data:")
    ) {
      throw new Error("INVALID_BOOT_ASSET_REFERENCE");
    }

    let record: any = null;
    if (reference?.target === "product") {
      record = data.products?.[Number(reference.productIndex)];
    } else if (reference?.target === "invoiceItemProduct") {
      record =
        data.invoices?.[Number(reference.invoiceIndex)]?.items?.[
          Number(reference.itemIndex)
        ]?.product;
    }
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("MISSING_BOOT_ASSET_TARGET");
    }
    operations.push({ record, field, value });
  }

  operations.forEach(({ record, field, value }) => {
    record[field] = value;
  });
  return data;
}
