/**
 * useQuery Hook
 * 
 * A custom hook for using URL query parameters
 */
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Parse query parameters from URL
 * @returns {Object} - Object with query parameters
 */
export function useQuery() {
  const { search } = useLocation();
  
  return useMemo(() => {
    // Initialize URLSearchParams
    const searchParams = new URLSearchParams(search);
    
    // Convert to object
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  }, [search]);
}

export default useQuery;