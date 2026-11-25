import './styles.css';
import { startRouter } from './router.js';
import { captureInstallPrompt, registerServiceWorker } from './pwa.js';

captureInstallPrompt();
startRouter(document.getElementById('app'));
registerServiceWorker();
