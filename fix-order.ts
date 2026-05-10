import fs from 'fs';

let content = fs.readFileSync('src/components/OrderPage.tsx', 'utf8');

// Also show WhatsApp button and pending styling for failed orders, as they are effectively still pending payment
content = content.replace(
  /isPendingStatus\(([^)]+)\)/g,
  '(isPendingStatus($1) || isFailedStatus($1))'
);

// We need to make sure isFailedStatus is imported
if (!content.includes('isFailedStatus')) {
  content = content.replace(
    "import { isPaidStatus, isPendingStatus } from '../lib/status-utils';",
    "import { isPaidStatus, isPendingStatus, isFailedStatus } from '../lib/status-utils';"
  );
}

fs.writeFileSync('src/components/OrderPage.tsx', content);

