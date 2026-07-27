import { db } from '../firebase';
import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { normalizeArabic, robustNormalize } from '../lib/utils';

export const seedClientDatabase = async (data: any) => {
  let operationsCount = 0;
  let batch = writeBatch(db);
  const commitBatch = async () => {
    if (operationsCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      operationsCount = 0;
    }
  };

  const addOperation = async (operation: Function) => {
    operation();
    operationsCount++;
    if (operationsCount >= 450) {
      await commitBatch();
    }
  };

  console.log('Starting sync to Client Database...');

  // 0. Clean old synced products to remove duplicates and zombies
  try {
    const existingProducts = await getDocs(collection(db, 'app_products'));
    for (const pDoc of existingProducts.docs) {
      await addOperation(() => batch.delete(pDoc.ref));
    }
  } catch (error) {
    console.warn("Could not fetch existing app_products for cleanup", error);
  }
  
  try {
    const legacyProducts = await getDocs(collection(db, 'products'));
    for (const pDoc of legacyProducts.docs) {
      await addOperation(() => batch.delete(pDoc.ref));
    }
  } catch (error) {
    console.warn("Could not fetch legacy products for cleanup", error);
  }
  
  try {
    const existingRegions = await getDocs(collection(db, 'regions'));
    for (const rDoc of existingRegions.docs) {
      await addOperation(() => batch.delete(rDoc.ref));
    }
  } catch (error) {
    console.warn("Could not fetch existing regions for cleanup", error);
  }

  // FORCE COMMIT before starting writes to avoid "cannot write to same doc twice in a batch"
  await commitBatch();

  // 1. Sync Products (Deduplicated by normalized name constraint)
  const uniqueProductsMap = new Map();
  const suppliersMap = new Map((data.suppliers || []).map((s: any) => [s.id, s.name]));

  // First pass: Group products by robust name
  const groupedProducts = new Map();
  for (const product of data.products || []) {
    if (!product.name || product.isActive === false) continue;
    const key = robustNormalize(product.name);
    if (!key) continue;
    if (!groupedProducts.has(key)) groupedProducts.set(key, []);
    groupedProducts.get(key).push(product);
  }

  // Second pass: Create unified products
  for (const [key, products] of groupedProducts.entries()) {
    // Sort to find principal: prefer one with image, then highest price
    const principal = [...products].sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0) || (b.price || 0) - (a.price || 0))[0];
    
    // Deterministic ID based on normalized name
    // This ensures that all grouped products get the same ID
    const safeKey = encodeURIComponent(key.replace(/\s+/g, '-')).replace(/%/g, '_');
    const productId = `app-prod-${safeKey}`.slice(0, 500); // Firestore id limit is 1500 bytes
    
    const featuredProducts = products.filter((p: any) => !!p.isMenuFeatured);
    const bestFeaturedRank = featuredProducts.length
      ? Math.min(...featuredProducts.map((p: any) => Number(p.featuredRank || 99)).filter((n: number) => Number.isFinite(n)))
      : undefined;

    const unifiedProduct = {
      id: productId,
      name: principal.name.trim(),
      price: principal.price || 0,
      cost: principal.cost || 0,
      description: principal.description || '',
      category: principal.category || 'عام',
      imageUrl: principal.imageUrl || '',
      isActive: true,
      isOutOfStock: products.every((p: any) => p.isOutOfStock),
      lastUpdated: new Date().toISOString(),
      isUnified: products.length > 1,
      supplierId: products.length === 1 ? principal.supplierId : 'multiple',
      supplierNames: products.map((p: any) => suppliersMap.get(p.supplierId) || 'مورد مجهول'),
      originalProductIds: products.map((p: any) => p.id),
      isMenuFeatured: featuredProducts.length > 0,
      featuredRank: featuredProducts.length > 0 ? bestFeaturedRank : undefined
    };

    const productRef = doc(db, 'app_products', productId);
    await addOperation(() => batch.set(productRef, unifiedProduct));
    
    // Fallback: Also seed the legacy 'products' collection
    const legacyRef = doc(db, 'products', productId);
    await addOperation(() => batch.set(legacyRef, unifiedProduct));
  }

  // 2. Sync Regions
  const uniqueRegionsMap = new Map();
  for (const zone of data.zones || []) {
    if (!zone.name) continue;
    const normName = robustNormalize(zone.name);
    if (!uniqueRegionsMap.has(normName) || (zone.isActive && !uniqueRegionsMap.get(normName).isActive)) {
      uniqueRegionsMap.set(normName, zone);
    }
  }

  let zIndex = 0;
  for (const zone of uniqueRegionsMap.values()) {
    zIndex++;
    // Use a deterministic ID 
    const zoneId = `zone_${encodeURIComponent(robustNormalize(zone.name)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}_${zIndex}`;
    const zoneRef = doc(db, 'regions', zoneId);
    await addOperation(() => batch.set(zoneRef, {
      id: zoneId,
      name: zone.name.trim(),
      deliveryFee: zone.finalPrice ?? (zone.cost + (zone.profit || 0)) ?? 0,
      isActive: zone.isActive !== false
    }));
  }

  try {
    await commitBatch();
    console.log('Successfully synced products and regions to client database! ✅');
    return true;
  } catch (error) {
    console.error('Error committing batch for seed database:', error);
    throw error;
  }
};

