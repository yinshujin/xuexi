import { useEffect, useState, type ImgHTMLAttributes } from 'react';

/** An <img> for a Blob from IndexedDB (object URL made on mount, revoked on unmount). */
export function BlobImage({ blob, ...rest }: { blob: Blob } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  return <img src={url} {...rest} />;
}
