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
// FIX RADICAL PARA ELIMINAR LÍNEAS BLANCAS
// ==========================================
const globalStyles = `
  .leaflet-container { 
    background-color: #cbd2d3 !important; 
    border: none !important; 
  }

  /* SOLUCIÓN FINAL: Forzamos el solapamiento de 2 píxeles */
  .leaflet-tile {
    width: 258px !important; /* 2px más que el estándar para solapar */
    height: 258px !important;
    margin-left: -1px !important;
    margin-top: -1px !important;
    
    /* Evita que el navegador suavice los bordes y deje ver el fondo */
    outline: 1px solid transparent;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    image-rendering: -webkit-optimize-contrast;
  }

  /* Quitamos cualquier posible borde del contenedor de imágenes */
  .leaflet-tile-container img { 
    max-width: none !important; 
    box-shadow: none !important;
  }

  .logo-font { font-family: 'Arial Black', sans-serif; font-weight: 900; font-style: italic; letter-spacing: -2px; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
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
    }, 400);
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

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
      if (data) setEvents(data);
    };
    fetchEvents();
  }, []);

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{globalStyles}</style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden">
        
        <nav className="h-[70px] bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="cursor-pointer" onClick={() => setView('home')}><LogoSVG /></div>
          <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-800 rounded-xl">
            {isDark ? <Sun className="text-yellow-400" /> : <Moon className="text-indigo-400" />}
          </button>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          {view === 'home' && (
            <div className="p-4 max-w-xl mx-auto space-y-6 pb-32">
              {events.map(ev => (
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
            <div className="absolute inset-0">
              <MapContainer 
                center={[40.41, -3.70]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
                zoomSnap={1}
              >
                <SpainMapController />
                {/* CAMBIO A CARTO VOYAGER: Más limpio y sin errores de líneas */}
                <TileLayer 
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
                  attribution='&copy; España'
                />
                {events.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold text-indigo-600 text-xs">{ev.title}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 h-[80px] rounded-[2.5rem] flex items-center justify-around z-[2000] shadow-2xl px-4 text-slate-500">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : ''}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl ${view === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : ''}`}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
