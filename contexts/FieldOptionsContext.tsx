import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchAirtableFieldOptions, FieldOptions } from '../lib/airtable';

interface FieldOptionsContextType {
  categories: string[];
  locations: string[];
  audienceAges: string[];
  genders: string[];
  rates: string[];
  tiers: string[];
  statuses: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const FieldOptionsContext = createContext<FieldOptionsContextType | null>(null);

export const FieldOptionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [audienceAges, setAudienceAges] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [rates, setRates] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    // Always fetch fresh from Airtable Metadata API (no cache)
    setIsLoading(true);
    setError(null);

    try {
      const options: FieldOptions = await fetchAirtableFieldOptions();
      setCategories(options.categories);
      setLocations(options.locations);
      setAudienceAges(options.audienceAges);
      setGenders(options.genders);
      setRates(options.rates);
      setTiers(options.tiers);
      setStatuses(options.statuses);
    } catch (err) {
      console.error('Failed to fetch field options:', err);
      setError(err instanceof Error ? err.message : 'Failed to load options');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return (
    <FieldOptionsContext.Provider value={{
      categories,
      locations,
      audienceAges,
      genders,
      rates,
      tiers,
      statuses,
      isLoading,
      error,
      refetch: fetchOptions,
    }}>
      {children}
    </FieldOptionsContext.Provider>
  );
};

export const useFieldOptions = (): FieldOptionsContextType => {
  const context = useContext(FieldOptionsContext);
  if (!context) {
    throw new Error('useFieldOptions must be used within a FieldOptionsProvider');
  }
  return context;
};
