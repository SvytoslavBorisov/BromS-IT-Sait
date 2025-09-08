import '../styles/globals.css';

/**
 * The custom App component for our Next.js application.
 *
 * This file allows us to maintain global styles and wrap every page
 * with common components if desired. The default export simply
 * renders the component corresponding to the current route with
 * whatever props Next.js injects.
 */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}