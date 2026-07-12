import fs from 'fs';
let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

const oldInv = `  newState.invoices = rawInvoices.map(inv => {
  const isDeleted = inv.isDeleted === true || inv.isDeleted ==="TRUE" || inv.isDeleted ==="true";
  const parsedItems = parseSafeJson(inv.items, true);
  const itemRows = invoiceItemsByInvoice.get(String(inv.id || '').trim()) || [];
  const parsedAddress = parseSafeJson(inv.address, false) || parseSafeJson(inv.rawAddress, false) || makeAddressFromRow(inv) || inv.address;
  const parsedDeliveryInfo = parseSafeJson(inv.deliveryInfo, false) || inv.deliveryInfo;

  return stripUndefined({
  ...inv,
  isDeleted,
  items: parsedItems.length ? parsedItems : itemRows,
  address: typeof parsedAddress === 'object' ? parsedAddress : inv.address,
  deliveryInfo: typeof parsedDeliveryInfo === 'object' && parsedDeliveryInfo !== null ? parsedDeliveryInfo : undefined
  });
  });`;

const newInv = `  newState.invoices = rawInvoices.map(inv => {
  const isDeleted = inv.isDeleted === true || inv.isDeleted ==="TRUE" || inv.isDeleted ==="true";
  const parsedItems = parseSafeJson(inv.items, true);
  const itemRows = invoiceItemsByInvoice.get(String(inv.id || '').trim()) || [];
  const parsedAddress = parseSafeJson(inv.address, false) || parseSafeJson(inv.rawAddress, false) || makeAddressFromRow(inv) || inv.address;
  const parsedDeliveryInfo = parseSafeJson(inv.deliveryInfo, false) || inv.deliveryInfo;
  const rawInvoice = parseSafeJson(inv.rawInvoice, false);

  const merged = rawInvoice && typeof rawInvoice === 'object' ? { ...rawInvoice, ...inv } : { ...inv };
  delete merged.rawInvoice;
  delete merged.addressFull;
  delete merged.addressRegion;
  delete merged.addressArea;
  delete merged.addressBlock;
  delete merged.addressStreet;
  delete merged.addressJaddah;
  delete merged.addressBuilding;
  delete merged.addressFloor;
  delete merged.addressApartment;
  delete merged.addressNotes;

  return stripUndefined({
  ...merged,
  isDeleted,
  items: parsedItems.length ? parsedItems : itemRows,
  address: typeof parsedAddress === 'object' ? parsedAddress : inv.address,
  deliveryInfo: typeof parsedDeliveryInfo === 'object' && parsedDeliveryInfo !== null ? parsedDeliveryInfo : undefined
  });
  });`;

content = content.replace(oldInv, newInv);
fs.writeFileSync('src/components/GeneralSettings.tsx', content);
console.log("Patched invoice import logic");
