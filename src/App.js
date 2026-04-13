import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, Calendar, Sun, Moon, PlusCircle, Trash2, Map as MapIcon, 
  LayoutList, ShieldCheck, CheckCircle2,
  Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ✅ ESTILOS LIMPIOS (SIN HACKS)
const finalMapStyles = `
  .leaflet-container {
    background: #e5e7eb !important;
  }

  .leaflet-tile {
    image-rendering: pixelated;
    transform: translateZ(0);
  }

  .leaflet-map-pane {
    will-change: transform;
  }

  .logo-text-style {
    font-family: 'Arial Black', sans-serif;
    font-weight: 900;
    font-style: italic;
    display: flex;
    align-items: center;
    letter-spacing: -1.5px;
    font-size: 24px;
    text-transform: uppercase;
  }
`;

// FIX ICONOS
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ✅ CONTROLADOR MEJORADO
function SpainMapController() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6, { animate: false });
    }, 300);
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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [toast, setToast] = useState(null);
  const [showCoffeeOptions, setShowCoffeeOptions] = useState(false);

  const paypalUrl = "https://paypal.me/jacobogarver"; 
  const kofiUrl = "https://ko-fi.com/jacobogarver";

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setUser(session.user);
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const toggleFavorite = async (ev) => {
    if (!user) return showNotification("Inicia sesión ❤️");
    const id = String(ev.id);
    if (favorites.includes(id)) {
      setFavorites(f => f.filter(i => i !== id));
    } else {
      setFavorites(f => [...f, id]);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter(e => e.date >= today);
  const publicEvents = activeEvents;

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{finalMapStyles}</style>

      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden">

        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 px-4 py-2 rounded-xl">
            {toast}
          </div>
        )}

        {/* NAV */}
        <nav className="h-[70px] bg-[#0f172a] flex justify-between items-center px-6">
          <div className="logo-text-style cursor-pointer" onClick={() => setView('home')}>
            EVENTORA <Calendar className="ml-2" />
          </div>

          <button onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun /> : <Moon />}
          </button>
        </nav>

        {/* CONTENIDO */}
        <main className="flex-1 relative">

          {view === 'home' && (
            <div className="p-4">
              {publicEvents.map(ev => (
                <div key={ev.id} className="mb-4 bg-[#0f172a] p-4 rounded-xl">
                  <h3>{ev.title}</h3>
                  <button onClick={() => toggleFavorite(ev)}>
                    <Heart fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ✅ MAPA ARREGLADO */}
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

                {/* ✅ TILE SIN LÍNEAS */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap"
                /> 

                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div onClick={() => setSelectedEvent(ev)}>
                        <b>{ev.title}</b><br/>
                        {ev.city}
                      </div>
                    </Popup>
                  </Marker>
                ))} 

              </MapContainer> 
            </div> 
          )}

        </main>

        {/* NAV INFERIOR */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-[#0f172a] h-[70px] rounded-2xl flex justify-around items-center">
          <button onClick={() => setView('home')}>
            <LayoutList />
          </button>
          <button onClick={() => setView('map')}>
            <MapIcon />
          </button>
        </nav>

      </div>
    </div>
  );
}

export default App;
