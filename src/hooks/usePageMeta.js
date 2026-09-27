import { useEffect } from 'react';

/**
 * Per-route <head> metadata for the CRA app.
 *
 * The app has no head manager: public/index.html carries one title and one
 * description for every route, and pages have only ever set document.title.
 * Google renders these routes, so what this hook writes is what gets indexed.
 * Previous values are restored on unmount so client-side navigation away
 * from a page does not leave its copy behind.
 *
 * @param {{ title?: string, description?: string, canonical?: string }} meta
 */
export function usePageMeta({ title, description, canonical } = {}) {
  useEffect(() => {
    const head = document.head;
    const restores = [];

    const upsert = (selector, create, attr, value) => {
      if (value === undefined || value === null) return;
      let el = head.querySelector(selector);
      if (!el) {
        el = create();
        head.appendChild(el);
        restores.push(() => el.remove());
      } else {
        const prev = el.getAttribute(attr);
        restores.push(() => el.setAttribute(attr, prev ?? ''));
      }
      el.setAttribute(attr, value);
    };

    const meta = (key, val, prop = 'name') => {
      upsert(
        `meta[${prop}="${key}"]`,
        () => { const m = document.createElement('meta'); m.setAttribute(prop, key); return m; },
        'content',
        val
      );
    };

    if (title) {
      const prevTitle = document.title;
      document.title = title;
      restores.push(() => { document.title = prevTitle; });
      meta('og:title', title, 'property');
      meta('twitter:title', title);
    }
    if (description) {
      meta('description', description);
      meta('og:description', description, 'property');
      meta('twitter:description', description);
    }
    if (canonical) {
      upsert(
        'link[rel="canonical"]',
        () => { const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l; },
        'href',
        canonical
      );
      meta('og:url', canonical, 'property');
      meta('twitter:url', canonical);
    }

    return () => { restores.reverse().forEach((fn) => fn()); };
  }, [title, description, canonical]);
}

export default usePageMeta;
