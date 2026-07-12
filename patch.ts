import fs from 'fs';

let content = fs.readFileSync('src/components/ReportsPage.tsx', 'utf8');

content = content.replace(
  "import { isPaidStatus, isPendingStatus } from '../lib/status-utils';",
  "import { isPaidStatus, isPendingStatus, isFailedStatus } from '../lib/status-utils';"
);

content = content.replace(
  "{isPendingStatus(inv.paymentStatus as string || (inv as any).status) && (",
  "{(isPendingStatus(inv.paymentStatus as string || (inv as any).status) || isFailedStatus(inv.paymentStatus as string || (inv as any).status)) && ("
);

fs.writeFileSync('src/components/ReportsPage.tsx', content);
