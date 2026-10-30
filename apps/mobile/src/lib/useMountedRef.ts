import { useEffect, useRef } from 'react';

/**
 * Tracks whether the component is still mounted so async work can safely
 * ignore results that arrive after navigation or unmounting.
 */
export function useMountedRef() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
