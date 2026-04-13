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

// FIX VISUAL
const globalStyles = `
  .leaflet-container { background-color: #cbd2d3 !important; }
  .leaflet-tile {
    image-rendering: auto !important;
  }
`;

// FIX ICONOS
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// CONTROL ESPAÑA
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6);
    }, 400);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// LOGO
const LogoSVG = () => (
  <svg width="170" height="35" viewBox="0 0 240 50">
    <defs>
      <linearGradient id="logoG" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:'#00e5ff'}} />
        <stop offset="50%" style={{stopColor:'#2979ff'}} />
        <stop offset="100%" style={{stopColor:'#aa00ff'}} />
      </linearGradient>
    </defs>
    <text x="0" y="38" fontFamily="Arial Black, sans-serif" fontSize="34" fontWeight="900" fontStyle="italic" fill="url(#logoG)" letterSpacing="-2">EVENTORA</text>
  </svg>
);

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

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    setEvents(data || []);
  };

  const today = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter(e => e.date >= today);
  const publicEvents = activeEvents.filter(e => e.status === 'approved');

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{globalStyles}</style>

      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white">

        {/* MAPA */}
        {view === 'map' && ( 
          <div className="absolute inset-0 z-0 bg-[#cbd2d3]"> 
            <MapContainer 
              key={`map-spain-${view}`}
              center={[40.4167, -3.7037]} 
              zoom={6} 
              className="h-full w-full" 
              zoomControl={false}
            > 
              <SpainMapController />

              {/* ✅ MAPA ESPAÑA SIN LÍNEAS */}
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />

              {publicEvents.map(ev => ev.lat && (
                <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                  <Popup>
                    <div>{ev.title}</div>
                  </Popup>
                </Marker>
              ))} 

            </MapContainer> 
          </div> 
        )}

        {/* NAV */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a] h-[80px] rounded-[2.5rem] flex items-center justify-around">
          <button onClick={() => setView('home')}><LayoutList /></button>
          <button onClick={() => setView('map')}><MapIcon /></button>
        </nav>

      </div>
    </div>
  );
}

export default App;
