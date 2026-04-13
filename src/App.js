import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, 
  Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// CSS obligatorio de Leaflet
import 'leaflet/dist/leaflet.css';

// ==========================================
// SOLUCIÓN DEFINITIVA LÍNEAS BLANCAS (CSS)
// ==========================================
const globalStyles = `
  /* 1. Fondo del contenedor del mismo color que el mapa para disimular */
  .leaflet-container { 
    background-color: #aad3df !important; 
    border: none !important; 
    outline: none !important; 
  }

  /* 2. Fix de las teselas (cuadros del mapa) */
  .leaflet-tile {
    /* Forzamos un solapamiento de 1 píxel para tapar la línea blanca */
    width: 257px !important;
    height: 257px !important;
    margin-left: -0.5px !important;
    margin-top: -0.5px !important;
    
    /* Evita el suavizado que crea las líneas transparentes */
    image-rendering: -webkit-optimize-contrast;
    filter: brightness(1.0);
    outline: 1px solid transparent;
  }

  /* 3. Eliminar bordes de carga */
  .leaflet-tile-container {
    will-change: transform;
  }

  .leaflet-container img { max-width: none !important; }
  .logo-font { font-family: 'Arial Black', sans-serif; font-weight: 900; font-style: italic; letter-spacing: -2px; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// Fix Iconos Marcadores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6); 
    }, 500);
  }, [map]);
  return null;
}

const LogoSVG = () => (
  <svg width="170" height="35" viewBox="0 0 240 50">
    <defs>
      <linearGradient id="gLogo" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:'#00e5ff'}} />
        <stop offset="50%" style={{stopColor:'#2979ff'}} />
        <stop offset="100%" style={{stopColor:'#aa00ff'}} />
      </linearGradient>
    </defs>
    <text x="0" y="38" className="logo-font" fontSize="34" fill="url(#gLogo)">EVENTORA</text>
  </svg>
);

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [view, setView] = useState('home');
  const [events, setEvents] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [activeCategory, setActiveCategory] = useState('TODOS');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
      if (data) setEvents(data);
    };
    fetchEvents();
  }, []);

  const publicEvents = events.filter(e => activeCategory === 'TODOS' || e.category === activeCategory);

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{globalStyles}</style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden font-sans">
        
        <nav className="h-[70px] bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="cursor-pointer" onClick={() => setView('home')}><LogoSVG /></div>
          <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-800 rounded-xl">
            {isDark ? <Sun className="text-yellow-400" /> : <Moon className="text-indigo-400" />}
          </button>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          {view === 'home' && (
            <div className="p-4 max-w-xl mx-auto space-y-6 pb-32 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-bold text-[10px] tracking-widest shrink-0 border border-slate-700 ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800/40 text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              {publicEvents.map(ev => (
                <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
                  <img src={ev.image_url} className="w-full h-52 object-cover" alt="" />
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-black uppercase italic mb-1">{ev.title}</h3>
                    <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">{ev.city}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="absolute inset-0 z-0">
              <MapContainer 
                center={[40.41, -3.70]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
                // Evita que el zoom fraccionado cause líneas
                zoomSnap={1}
                zoomDelta={1}
              >
                <SpainMapController />
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  attribution='&copy; España'
                />
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold text-indigo-600 uppercase text-xs">{ev.title}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{ev.city}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 h-[80px] rounded-[2.5rem] flex items-center justify-around z-[2000] shadow-2xl px-4 text-slate-500">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl transition-all ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : ''}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : ''}`}><MapIcon size={26}/></button>
          <button className="p-4"><PlusCircle size={26}/></button>
          <button className="p-4"><Heart size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
