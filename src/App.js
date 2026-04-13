import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload,
  Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

/* =========================
   🎨 MAPA PRO (SIN LÍNEAS)
========================= */
const customGlobalStyles = `
  .leaflet-container {
    background: #c7d2d9 !important;
  }

  .leaflet-tile {
    image-rendering: auto !important;
    filter: contrast(1.05) saturate(1.05);
  }

  .leaflet-pane {
    will-change: transform;
  }

  .logo-eventora {
    font-family: 'Arial Black', sans-serif;
    font-weight: 900;
    font-style: italic;
    display: flex;
    align-items: center;
    letter-spacing: -2px;
    font-size: 26px;
  }

  .c-cian { color: #00e5ff; }
  .c-blue { color: #2979ff; }
  .c-purple { color: #aa00ff; }
`;

/* =========================
   FIX ICONOS LEAFLET
========================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* =========================
   🇪🇸 CENTRAR ESPAÑA
========================= */
function SpainMapController() {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      map.flyTo([40.4167, -3.7037], 6, {
        animate: true,
        duration: 1.2
      });
    }, 300);

    return () => clearTimeout(t);
  }, [map]);

  return null;
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home');
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [toast, setToast] = useState(null);

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchEvents();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setFavorites([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (prof) setProfile(prof);

    const { data: favs } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (favs) setFavorites(favs.map(f => String(f.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const today = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter(e => e.date >= today);
  const publicEvents = activeEvents.filter(
    e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory)
  );

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{customGlobalStyles}</style>

      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden">

        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-2 rounded-xl z-[9999]">
            <CheckCircle2 size={16} className="inline mr-2"/>
            {toast}
          </div>
        )}

        {/* NAV */}
        <nav className="h-[70px] flex items-center justify-between px-6 bg-[#0f172a] border-b border-slate-800">
          <div className="logo-eventora cursor-pointer" onClick={() => setView('home')}>
            <span className="c-cian">EVENT</span>
            <span className="c-purple">ORA</span>
          </div>

          <button onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun /> : <Moon />}
          </button>
        </nav>

        <main className="flex-1 relative">

          {/* MAPA PRO */}
          {view === 'map' && (
            <div className="absolute inset-0">
              <MapContainer
                center={[40.4167, -3.7037]}
                zoom={6}
                preferCanvas={true}
                className="h-full w-full"
                zoomControl={false}
              >
                <SpainMapController />

                {/* 🌍 MAPA LIMPIO SIN LÍNEAS */}
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap © CARTO"
                />

                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="text-center">
                        <b>{ev.title}</b>
                        <br />
                        {ev.city}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* HOME SIMPLE (no te lo rompo) */}
          {view === 'home' && (
            <div className="p-4">
              {publicEvents.map(ev => (
                <div key={ev.id} className="bg-[#0f172a] p-4 rounded-xl mb-3">
                  {ev.title}
                </div>
              ))}
            </div>
          )}

        </main>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f172a] flex gap-10 px-8 py-4 rounded-2xl">
          <button onClick={() => setView('home')}>
            <LayoutList />
          </button>
          <button onClick={() => setView('map')}>
            <MapIcon />
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;
