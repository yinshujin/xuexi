import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Catalog } from '@xuexi/course-pack';
import { DEFAULT_SETTINGS, type ChildProfile, type FamilyDoc, type LearningEvent } from '@xuexi/shared';
import { api, ApiError } from './api';
import { mergeChildren } from './backup';
import { getCachedFamily, getDeviceId, KV, kvGet, kvSet } from './db';
import { loadCatalog } from './packs';
import { loadEvents, recordEvent, syncNow, type SyncStatus } from './sync';

export type AuthState = 'loading' | 'ok' | 'need-login' | 'local';

interface AppContextValue {
  auth: AuthState;
  family: FamilyDoc;
  catalog: Catalog | null;
  sync: SyncStatus;
  deviceId: string;
  /** Events of a child, oldest first (loaded lazily). */
  eventsOf: (childId: string) => LearningEvent[];
  loadChild: (childId: string) => Promise<void>;
  addEvent: (e: LearningEvent) => Promise<void>;
  saveFamily: (patch: Partial<Pick<FamilyDoc, 'children' | 'settings'>>) => Promise<void>;
  child: (childId: string) => ChildProfile | undefined;
  login: (code: string, serverUrl?: string) => Promise<void>;
  useLocalOnly: () => Promise<void>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  /** Re-read events of every loaded child from IndexedDB (after a restore). */
  reloadEvents: () => Promise<void>;
}

const EMPTY_FAMILY: FamilyDoc = { children: [], settings: DEFAULT_SETTINGS, version: 0, updatedAt: 0 };

const Ctx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>('loading');
  const [family, setFamily] = useState<FamilyDoc>(EMPTY_FAMILY);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ state: 'idle' });
  const [deviceId, setDeviceId] = useState('');
  const [events, setEvents] = useState<Record<string, LearningEvent[]>>({});
  const loaded = useRef(new Set<string>());
  const familyRef = useRef(family);
  familyRef.current = family;

  const reloadLoadedChildren = useCallback(async () => {
    const next: Record<string, LearningEvent[]> = {};
    for (const id of loaded.current) next[id] = await loadEvents(id);
    setEvents((prev) => ({ ...prev, ...next }));
  }, []);

  const runSync = useCallback(async () => {
    setSync({ state: 'syncing' });
    const status = await syncNow((doc) => setFamily(doc));
    setSync(status);
    if (status.state === 'unauthorized' && (await kvGet<boolean>('localOnly')) !== true) setAuth('need-login');
    await reloadLoadedChildren();
  }, [reloadLoadedChildren]);

  const refreshCatalog = useCallback(async () => {
    setCatalog(await loadCatalog());
  }, []);

  // Boot.
  useEffect(() => {
    (async () => {
      setDeviceId(await getDeviceId());
      const cached = await getCachedFamily();
      if (cached) setFamily(cached);
      refreshCatalog().catch(() => {});
      const token = await kvGet<string>(KV.token);
      const localOnly = await kvGet<boolean>('localOnly');
      if (token) {
        setAuth('ok');
        runSync();
      } else if (localOnly) {
        setAuth('local');
      } else {
        setAuth('need-login');
      }
    })();
  }, [refreshCatalog, runSync]);

  // Periodic sync while visible, and when coming back online.
  useEffect(() => {
    if (auth !== 'ok') return;
    const tick = () => {
      if (document.visibilityState === 'visible') runSync();
    };
    const t = setInterval(tick, 60_000);
    window.addEventListener('online', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [auth, runSync]);

  const loadChild = useCallback(async (childId: string) => {
    loaded.current.add(childId);
    const list = await loadEvents(childId);
    setEvents((prev) => ({ ...prev, [childId]: list }));
  }, []);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addEvent = useCallback(
    async (e: LearningEvent) => {
      await recordEvent(e);
      setEvents((prev) => ({ ...prev, [e.childId]: [...(prev[e.childId] ?? []), e] }));
      if (auth === 'ok') {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => runSync(), 5000);
      }
    },
    [auth, runSync],
  );

  const saveFamily = useCallback(
    async (patch: Partial<Pick<FamilyDoc, 'children' | 'settings'>>) => {
      const cur = familyRef.current;
      const doc = { children: patch.children ?? cur.children, settings: patch.settings ?? cur.settings };
      if (auth === 'ok') {
        try {
          const saved = await api.putFamily(doc, cur.version);
          setFamily(saved);
          await kvSet(KV.family, saved);
          return;
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            const server = (e.body as { current?: FamilyDoc })?.current ?? (await api.getFamily());
            const saved = await api.putFamily(doc, server.version);
            setFamily(saved);
            await kvSet(KV.family, saved);
            return;
          }
          if (!(e instanceof ApiError && e.status === 0)) throw e;
          // offline: fall through and save locally; the next sync will overwrite with the server doc
        }
      }
      const local: FamilyDoc = { ...doc, version: cur.version, updatedAt: Date.now() };
      setFamily(local);
      await kvSet(KV.family, local);
    },
    [auth],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      auth,
      family,
      catalog,
      sync,
      deviceId,
      eventsOf: (id) => events[id] ?? [],
      loadChild,
      addEvent,
      saveFamily,
      child: (id) => family.children.find((c) => c.id === id),
      login: async (code, serverUrl) => {
        if (serverUrl !== undefined) await kvSet(KV.serverUrl, serverUrl.trim() || null);
        const localFamily = familyRef.current;
        await api.login(code);
        await kvSet('localOnly', false);
        setAuth('ok');
        // Profiles created in on-device mode join the family account (their
        // records are pushed by the sync below, since they are still unsynced).
        if (localFamily.children.length > 0) {
          const server = await api.getFamily();
          const children = mergeChildren(server.children, localFamily.children);
          if (children.length !== server.children.length) {
            const saved = await api.putFamily(
              { children, settings: server.children.length ? server.settings : localFamily.settings },
              server.version,
            );
            setFamily(saved);
            await kvSet(KV.family, saved);
          }
        }
        await runSync();
        await refreshCatalog();
      },
      useLocalOnly: async () => {
        await kvSet('localOnly', true);
        setAuth('local');
      },
      logout: async () => {
        await api.logout();
        await kvSet('localOnly', false);
        setAuth('need-login');
      },
      syncNow: runSync,
      refreshCatalog,
      reloadEvents: reloadLoadedChildren,
    }),
    [auth, family, catalog, sync, deviceId, events, loadChild, addEvent, saveFamily, runSync, refreshCatalog, reloadLoadedChildren],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
