import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload,
  Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Estilos obligatorios de Leaflet
import 'leaflet/dist/leaflet.css';

// FIX PARA ELIMINAR LÍNEAS BLANCAS Y DISEÑO
const globalStyles = `
  .leaflet-container { 
    background-color: #cbd2d3 !important; 
    outline: 0;
  }
  /* SOLUCIÓN DEFINITIVA LÍNEAS BLANCAS */
  .leaflet-tile-container img {
    width: 256.5px !important;
    height: 256.5px !important;
    outline: 1px solid transparent;
  }
  .logo-font { 
    font-family: 'Arial Black', sans-serif; 
    font-weight: 900; 
    font-style: italic; 
  }
`;

// Fix para los iconos de los marcadores que desaparecen en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para forzar el mapa a centrarse y refrescarse
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    // Esto asegura que el mapa se renderice correctamente después de cambiar de vista
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6); 
    }, 250);
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
    <text x="0" y="38" className="logo-font" fontSize="34" fill="url(#gLogo)" letterSpacing="-2">EVENTORA</text>
    <rect x="210" y="8" width="28" height="28" rx="6" fill="#4f46e520" stroke="#6366f1" strokeWidth="2" />
    <path d="M210 18 H238 M217 8 V12 M231 8 V12" stroke="#6366f1" strokeWidth="2" />
    <path d="M224 29 L226 25 L230 23 L226 21 L224 17 L222 21 L218 23 L222 25 Z" fill="#6366f1" />
  </svg>
);

// Configuración Supabase (Asegúrate de tener estas variables en tu .env)
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
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

  useEffect(() => {
    fetchEvents();
    // Suscripción de Auth corregida
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        // Aquí cargarías el perfil...
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) setEvents(data);
  };

  const toggleFavorite = (ev) => {
    const id = String(ev.id);
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(f => f !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{globalStyles}</style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white font-sans overflow-hidden transition-all duration-500">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-bounce">
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
             <LogoSVG />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-800/50">
               {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40">
                {/* Listado de eventos... */}
                <h2 className="text-center text-slate-500 uppercase text-xs font-black tracking-widest my-4">Eventos en España</h2>
                <div className="grid gap-6">
                    {publicEvents.map(ev => (
                        <div key={ev.id} className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800">
                            <img src={ev.image_url} className="w-full h-48 object-cover" alt={ev.title} />
                            <div className="p-4">
                                <h3 className="font-black text-xl italic">{ev.title}</h3>
                                <p className="text-indigo-400 text-xs font-bold uppercase">{ev.city}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {view === 'map' && ( 
            <div className="absolute inset-0 z-0"> 
              <MapContainer 
                center={[40.4167, -3.7037]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
              > 
                <SpainMapController />
                {/* USAREMOS LOS TILES DE OSM QUE ESTÁN EN ESPAÑOL PARA ESPAÑA */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  attribution='&copy; OpenStreetMap' 
                /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 text-center">
                        <div className="font-bold text-sm text-indigo-600">{ev.title}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{ev.city}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl ${view === 'home' ? "bg-blue-600 text-white" : "text-slate-500"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('favorites')} className={`p-4 rounded-2xl ${view === 'favorites' ? "bg-blue-600 text-white" : "text-slate-500"}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl ${view === 'map' ? "bg-blue-600 text-white" : "text-slate-500"}`}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}

export default App;
