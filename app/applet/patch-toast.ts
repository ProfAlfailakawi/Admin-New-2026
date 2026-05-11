import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Ensure import 
if (!content.includes('import { playSuccessAction }')) {
  content = content.replace(
    "import { AppState, Notification } from './types';",
    "import { AppState, Notification } from './types';\nimport { playSuccessAction } from './lib/sonic';"
  );
}

const addToastReplacement = `  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (type === 'success') {
      playSuccessAction();
    }
    const toastFn = type === 'success' ? toast.success : type === 'warning' ? toast.warning : toast.info;
    toastFn(title, {
      description: message,`;

content = content.replace(
`  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const toastFn = type === 'success' ? toast.success : type === 'warning' ? toast.warning : toast.info;
    toastFn(title, {
      description: message,`,
addToastReplacement
);

fs.writeFileSync('src/App.tsx', content);
