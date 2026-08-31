// Vitest happy-dom's localStorage getter returns undefined
// Initialize it using happy-dom's Storage class for real localStorage behavior
import { Storage } from 'happy-dom';

if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: new Storage(),
    writable: true,
  });
}
