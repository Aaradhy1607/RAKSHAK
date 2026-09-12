import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type {
  OverviewStats,
  LocationRiskDetail,
  CitizenReport,
  SOSIncident,
  HighwayRisk,
  InfrastructureNode,
  EmergencyContact,
  AlertConfiguration,
  AlertHistoryItem
} from '../types';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import { getTranslation, type AppLanguage } from '../services/i18n';

export type PersonaMode = 'AUTHORITY' | 'CITIZEN';
export type AppTheme = 'dark' | 'light';
export type { AppLanguage };

export interface LayerVisibility {
  riskPolygons: boolean;
  rainContours: boolean;
  soilMoisture: boolean;
  sarCoherence: boolean;
  highways: boolean;
  infrastructure: boolean;
  historicalLandslides: boolean;
  citizenReports: boolean;
  sosBeacons: boolean;
}

export type ModalType =
  | 'HISTORICAL'
  | 'ML_METRICS'
  | 'DATA_HEALTH'
  | 'SATELLITE_SWIPE'
  | 'WHAT_IF'
  | 'CASCADING_HAZARD'
  | 'MODEL_TRANSPARENCY'
  | 'REPORT_MODAL'
  | 'ADMIN_SETTINGS'
  | 'MANUAL_ALERT'
  | 'ALERT_HISTORY'
  | null;

interface AppContextType {
  personaMode: PersonaMode;
  setPersonaMode: (mode: PersonaMode) => void;
  theme: AppTheme;
  toggleTheme: () => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
  selectedHorizon: string;
  setSelectedHorizon: (horizon: string) => void;
  selectedDistrict: string | null;
  setSelectedDistrict: (district: string | null) => void;
  selectedLocationDetail: LocationRiskDetail | null;
  overview: OverviewStats | null;
  locations: LocationRiskDetail[];
  highways: HighwayRisk[];
  infrastructure: InfrastructureNode[];
  citizenReports: CitizenReport[];
  sosIncidents: SOSIncident[];
  emergencyContacts: EmergencyContact[];
  alertConfig: AlertConfiguration | null;
  alertHistory: AlertHistoryItem[];
  layerVisibility: LayerVisibility;
  toggleLayer: (key: keyof LayerVisibility) => void;
  isOffline: boolean;
  refreshData: () => Promise<void>;
  openDrawer: boolean;
  setOpenDrawer: (open: boolean) => void;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  triggerSOS: (payload: any) => Promise<any>;
  acknowledgeSOS: (sosId: string, acknowledgedBy: string, notes?: string) => Promise<any>;
  escalateSOS: (sosId: string, escalateToLevel?: number, reason?: string) => Promise<any>;
  resolveSOS: (sosId: string, resolvedBy: string, resolutionNotes: string, assignedTeam?: string) => Promise<any>;
  submitReport: (formData: FormData) => Promise<any>;
  updateAlertConfig: (updates: Partial<AlertConfiguration>) => Promise<any>;
  refreshContacts: () => Promise<void>;
  refreshAlertHistory: () => Promise<void>;
  sendManualAlert: (payload: any) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [personaMode, setPersonaMode] = useState<PersonaMode>('AUTHORITY');
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [language, setLanguage] = useState<AppLanguage>('EN');
  const [selectedHorizon, setSelectedHorizon] = useState<string>('Current');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>('Dima Hasao');
  const [selectedLocationDetail, setSelectedLocationDetail] = useState<LocationRiskDetail | null>(null);
  const [openDrawer, setOpenDrawer] = useState<boolean>(true);

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [locations, setLocations] = useState<LocationRiskDetail[]>([]);
  const [highways, setHighways] = useState<HighwayRisk[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureNode[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [sosIncidents, setSosIncidents] = useState<SOSIncident[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfiguration | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    riskPolygons: true,
    rainContours: true,
    soilMoisture: true,
    sarCoherence: false,
    highways: true,
    infrastructure: true,
    historicalLandslides: true,
    citizenReports: true,
    sosBeacons: true
  });

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  };

  const refreshContacts = async () => {
    try {
      const contacts = await api.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch {}
  };

  const refreshAlertHistory = async () => {
    try {
      const history = await api.getAlertHistory();
      setAlertHistory(history);
    } catch {}
  };

  const loadStaticData = async () => {
    try {
      const [hw, inf, cfg, cnt] = await Promise.all([
        api.getHighways(),
        api.getInfrastructure(),
        api.getAlertConfig(),
        api.getEmergencyContacts()
      ]);
      setHighways(hw);
      setInfrastructure(inf);
      setAlertConfig(cfg);
      setEmergencyContacts(cnt);
    } catch (e) {
      console.error('Error loading static geo & configuration assets', e);
    }
  };

  const refreshData = async () => {
    try {
      const [ov, locs, reps, sos, hist] = await Promise.all([
        api.getOverview(),
        api.getLocations(selectedHorizon),
        api.getCitizenReports(),
        api.getSOSIncidents(),
        api.getAlertHistory()
      ]);

      setOverview(ov);
      setLocations(locs);
      setCitizenReports(reps);
      setSosIncidents(sos);
      setAlertHistory(hist);

      if (selectedDistrict) {
        const found = locs.find(l => l.district.toLowerCase() === selectedDistrict.toLowerCase());
        if (found) {
          setSelectedLocationDetail(found);
        } else if (locs.length > 0) {
          setSelectedLocationDetail(locs[0]);
        }
      }
    } catch (e) {
      console.error('Error refreshing operational data', e);
    }
  };

  const isInitialMount = React.useRef(true);

  useEffect(() => {
    loadStaticData();
    refreshData();

    const handleOnline = () => {
      setIsOffline(false);
      api.syncOfflineQueues().then(({ syncedReports, syncedSOS }) => {
        if (syncedReports > 0 || syncedSOS > 0) {
          refreshData();
        }
      });
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubSOS = wsClient.on('NEW_SOS_TRIGGERED', (data) => {
      setSosIncidents(prev => [data, ...prev.filter(s => s.id !== data.id)]);
      refreshAlertHistory();
    });

    const unsubSOSStatus = wsClient.on('SOS_STATUS_UPDATED', (data) => {
      setSosIncidents(prev => prev.map(s => s.id === data.id ? data : s));
      refreshAlertHistory();
    });

    const unsubSOSAcknowledge = wsClient.on('SOS_ACKNOWLEDGED', (data) => {
      setSosIncidents(prev => prev.map(s => s.id === data.id ? data : s));
    });

    const unsubSOSEscalated = wsClient.on('SOS_ESCALATED', (data) => {
      setSosIncidents(prev => prev.map(s => s.id === data.id ? data : s));
      refreshAlertHistory();
    });

    const unsubReport = wsClient.on('NEW_CITIZEN_REPORT', (data) => {
      setCitizenReports(prev => [data, ...prev]);
      refreshData();
    });

    const unsubAlert = wsClient.on('NEW_ALERT_DISPATCHED', () => {
      refreshAlertHistory();
    });

    const unsubConfig = wsClient.on('ALERT_CONFIG_UPDATED', (data) => {
      setAlertConfig(data);
    });

    const unsubContacts = wsClient.on('CONTACTS_UPDATED', () => {
      refreshContacts();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSOS();
      unsubSOSStatus();
      unsubSOSAcknowledge();
      unsubSOSEscalated();
      unsubReport();
      unsubAlert();
      unsubConfig();
      unsubContacts();
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    api.getLocations(selectedHorizon).then(locs => {
      setLocations(locs);
      if (selectedDistrict) {
        const found = locs.find(l => l.district.toLowerCase() === selectedDistrict.toLowerCase());
        if (found) setSelectedLocationDetail(found);
      }
    }).catch(() => {});
  }, [selectedHorizon]);

  useEffect(() => {
    if (selectedDistrict && locations.length > 0) {
      const found = locations.find(l => l.district.toLowerCase() === selectedDistrict.toLowerCase());
      if (found) {
        setSelectedLocationDetail(found);
      } else {
        api.getLocationDetail(selectedDistrict).then(setSelectedLocationDetail).catch(() => {});
      }
    }
  }, [selectedDistrict, locations]);

  const triggerSOS = async (payload: any) => {
    const res = await api.triggerSOS(payload);
    await refreshAlertHistory();
    return res;
  };

  const acknowledgeSOS = async (sosId: string, acknowledgedBy: string, notes?: string) => {
    const res = await api.acknowledgeSOS(sosId, acknowledgedBy, notes);
    await refreshAlertHistory();
    return res;
  };

  const escalateSOS = async (sosId: string, escalateToLevel: number = 2, reason?: string) => {
    const res = await api.escalateSOS(sosId, escalateToLevel, reason);
    await refreshAlertHistory();
    return res;
  };

  const resolveSOS = async (sosId: string, resolvedBy: string, resolutionNotes: string, assignedTeam?: string) => {
    const res = await api.resolveSOS(sosId, resolvedBy, resolutionNotes, assignedTeam);
    await refreshAlertHistory();
    return res;
  };

  const updateAlertConfig = async (updates: Partial<AlertConfiguration>) => {
    const res = await api.updateAlertConfig(updates);
    if (res.configuration) {
      setAlertConfig(res.configuration);
    }
    return res;
  };

  const sendManualAlert = async (payload: any) => {
    const res = await api.sendManualAlert(payload);
    await refreshAlertHistory();
    return res;
  };

  const submitReport = async (formData: FormData) => {
    const res = await api.submitCitizenReport(formData);
    if (res.report) {
      setCitizenReports(prev => [res.report, ...prev]);
    }
    return res;
  };

  const t = (key: string) => getTranslation(key, language);

  return (
    <AppContext.Provider
      value={{
        personaMode,
        setPersonaMode,
        theme,
        toggleTheme,
        language,
        setLanguage,
        t,
        selectedHorizon,
        setSelectedHorizon,
        selectedDistrict,
        setSelectedDistrict,
        selectedLocationDetail,
        overview,
        locations,
        highways,
        infrastructure,
        citizenReports,
        sosIncidents,
        emergencyContacts,
        alertConfig,
        alertHistory,
        layerVisibility,
        toggleLayer,
        isOffline,
        refreshData,
        openDrawer,
        setOpenDrawer,
        activeModal,
        setActiveModal,
        triggerSOS,
        acknowledgeSOS,
        escalateSOS,
        resolveSOS,
        submitReport,
        updateAlertConfig,
        refreshContacts,
        refreshAlertHistory,
        sendManualAlert
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
