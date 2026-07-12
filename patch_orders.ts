import fs from 'fs';
let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

const oldOrd = ` if (workbook.SheetNames.includes("Orders")) {
 const ordersSheet = workbook.Sheets["Orders"];
 const rawOrders = XLSX.utils.sheet_to_json(ordersSheet) as any[];
 newState.orders = rawOrders.map(o => {
 const parsedItems = parseSafeJson(o.items, true);
 const parsedAddress = parseSafeJson(o.address, false) || makeAddressFromRow(o) || o.address;
 return stripUndefined({ ...o, items: parsedItems, address: typeof parsedAddress === 'object' ? parsedAddress : o.address });
 });
 }`;

const newOrd = ` if (workbook.SheetNames.includes("Orders")) {
 const ordersSheet = workbook.Sheets["Orders"];
 const rawOrders = XLSX.utils.sheet_to_json(ordersSheet) as any[];
 newState.orders = rawOrders.map(o => {
 const parsedItems = parseSafeJson(o.items, true);
 const parsedAddress = parseSafeJson(o.address, false) || makeAddressFromRow(o) || o.address;
 const rawOrder = parseSafeJson(o.rawOrder, false);
 const merged = rawOrder && typeof rawOrder === 'object' ? { ...rawOrder, ...o } : { ...o };
 delete merged.rawOrder;
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
 return stripUndefined({ ...merged, items: parsedItems, address: typeof parsedAddress === 'object' ? parsedAddress : o.address });
 });
 }`;

content = content.replace(oldOrd, newOrd);
fs.writeFileSync('src/components/GeneralSettings.tsx', content);
console.log("Patched order import logic");
