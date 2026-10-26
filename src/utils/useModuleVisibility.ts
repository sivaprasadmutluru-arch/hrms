import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {api} from '../api/client';
import {ModuleVisibility} from './moduleVisibility';

export function useModuleVisibility(companyId?: number | string | null) {
  const [snapshot, setSnapshot] = useState<{company: string; value: ModuleVisibility}>({company: '', value: null});
  const version = useRef(0);
  const company = companyId == null ? '' : String(companyId);
  const refreshVisibility = useCallback(async () => {
    const request = ++version.current;
    if (!company) return;
    try {
      const value = await api.moduleVisibility(company);
      if (request === version.current) setSnapshot({company, value});
    } catch {
      // Keep last-known restrictions; never turn every module back on after an error.
    }
  }, [company]);
  useEffect(() => {
    refreshVisibility();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refreshVisibility();
    });
    return () => {++version.current; listener.remove();};
  }, [refreshVisibility]);
  return {visibility: snapshot.company === company ? snapshot.value : null, refreshVisibility};
}
