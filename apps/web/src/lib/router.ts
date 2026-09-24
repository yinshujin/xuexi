import { useEffect, useState } from 'react';

export interface Route {
  /** Path segments after "#/", e.g. ["c", "abc", "kp", "bsd-g4a.u3.mul-3x2"]. */
  parts: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, qs] = hash.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs ?? '') };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string, replace = false) {
  const url = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) location.replace(url);
  else location.hash = url;
}

export function href(path: string): string {
  return `#${path.startsWith('/') ? path : `/${path}`}`;
}
