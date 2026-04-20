
import { createRoot, Root } from 'react-dom/client';

let printRoot: Root | null = null;

export const getPrintRoot = (container: HTMLElement): Root => {
  if (!printRoot) {
    printRoot = createRoot(container);
  }
  return printRoot;
};
