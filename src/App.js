import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, 
  Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// 1. Estilos obligatorios de Leaflet
import 'leaflet/dist/leaflet.css';

// 2. FIX DE DISEÑO: Elimina líneas blancas entre cuadros y quita rebordes
const globalStyles = `
  .leaflet-container { 
    background-color: #cbd2d3 !important; 
    border: none !important; 
    outline: none !important; 
  }
  
  /* Solución a las líneas blancas: solapamos los cuadros 1px */
  .leaflet-tile { 
    width: 257px !important; 
    height: 257px !important; 
    margin-left: -0.5px !important; 
    margin-top: -0.5px !important; 
    filter: brightness(1.05);
  }

  .leaflet-container img {
    max-width: none !important;
  }

  .logo-font { 
    font-family: 'Arial Black', sans-serif; 
    font-weight: 900; 
    font-style: italic; 
    letter-spacing: -2px; 
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// 3. Fix para que los iconos del mapa aparezcan (si no, salen rotos)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 4. Componente para centrar el mapa en España automáticamente
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6); // Madrid, centro de España
    }, 500);
  }, [map]);
  return null;
}

// Logo EVENTORA
const LogoSVG = () => (
  <svg width="170" height="35" viewBox="0 0 240 50">
    <defs>
      <linearGradient id="gLogo" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:'#00e5ff'}} />
        <stop offset="50%" style={{stopColor:'#2979ff'}} />
        <stop offset="100%" style={{stopColor:'#aa00ff'}} />
      </linearGradient>
    </defs>
    <text x="0" y="38" className="logo-font" fontSize="34" fill="url(#gLogo)"> EVENTORA </text>
  </svg>
);

// Conexión a tu Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [view, setView] = useState('home');
  const [events, setEvents] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [activeCategory, setActiveCategory] = useState('TODOS');

  // Cargar eventos desde Supabase
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
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white font-sans overflow-hidden transition-all duration-500">
        
        {/* Barra Superior */}
        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
             <LogoSVG />
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-800/50">
             {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
          </button>
        </nav>

        {/* Contenido Principal */}
        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-bold text-[10px] tracking-widest transition-all shrink-0 border border-slate-700 ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/40 text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              <div className="space-y-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
                    <img src={ev.image_url} className="w-full h-52 object-cover" alt="img" />
                    <div className="p-6 text-center text-white">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">{ev.title}</h3>
                      <span className="text-indigo-400 text-xs font-black uppercase tracking-widest">{ev.city}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-[#cbd2d3]"> 
              <MapContainer 
                center={[40.41, -3.70]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
              > 
                <SpainMapController />
                {/* Capa en ESPAÑOL */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  attribution='&copy; OpenStreetMap'
                /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 text-center">
                        <div className="font-bold text-sm text-indigo-600 uppercase">{ev.title}</div>
                        <p className="text-[10px] opacity-60 uppercase font-bold">{ev.city}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}
        </main>

        {/* Barra de Navegación Inferior */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 text-slate-500">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl transition-all ${view === 'home' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('home')} className="p-4 rounded-2xl"><PlusCircle size={26}/></button>
          <button onClick={() => setView('home')} className="p-4 rounded-2xl"><Heart size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
