import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerSW';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker safely for PWA
registerServiceWorker();
