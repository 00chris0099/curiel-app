import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.tsx';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracePropagationTargets: ['localhost', import.meta.env.VITE_API_URL],
  replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.request?.headers?.Authorization) {
      event.request.headers.Authorization = '[Filtered]';
    }
    return event;
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'No se encontro el elemento #root en el DOM. Verifica index.html.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
