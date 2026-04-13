import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, 
  Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Estilos obligatorios de Leaflet
import 'leaflet/dist/leaflet.css';

// 1. FIX RADICAL: ELIMINAR LÍNEAS BLANCAS, BORDES Y LOGO
const globalStyles = `
  .leaflet-container { 
    background-color: #cbd2d3 !important; 
    border: none !important;
    outline: none !important;
  }
  
  /* SOLUCIÓN FINAL A LAS LÍNEAS: Solapamiento forzado de baldosas */
  .leaflet-tile {
    width: 257px !important;
    height: 257px !important;
    margin-left: -0.5px !important;
    margin-top: -0.5px !important;
    filter: brightness(1.05); /* Mejora visual */
  }

  .leaflet-container img {
    max-width: none !important;
  }

  .logo-font { 
    font-family: 'Arial Black', sans-serif; 
    font-weight: 900; 
    font-style: italic; 
    display: flex; 
    align-items: center; 
    letter-spacing: -2px; 
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// Fix Marcadores Leaflet (Para que no salgan rotos)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para forzar el mapa a centrarse en España y corregir tamaño
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6); // Madrid, Centro de España
    }, 500);
  }, [map]);
  return null;
}

// LOGO EVENTORA SVG
const LogoSVG = () => (
  <svg width="170" height="35" viewBox="0 0 240 50">
    <defs>
      <linearGradient id="gLogo" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:'#00e5ff'}} />
        <stop offset="50%" style={{stopColor:'#2979ff'}} />
        <stop offset="100%" style={{stopColor:'#aa00ff'}} />
      </linearGradient>
    </defs>
    <text x="0" y="38" fontFamily="Arial Black, sans-serif" fontSize="34" fontWeight="900" fontStyle="italic" fill="url(#gLogo)" letterSpacing="-2"> EVENTORA </text>
    <rect x="210" y="8" width="28" height="28" rx="6" fill="#4f46e520" stroke="#6366f1" strokeWidth="2" />
    <path d="M210 18 H238 M217 8 V12 M231 8 V12" stroke="#6366f1" strokeWidth="2" />
    <path d="M224 29 L226 25 L230 23 L226 21 L224 17 L222 21 L218 23 L222 25 Z" fill="#6366f1" />
  </svg>
);

// Configuración Supabase
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
  const [form, setForm] = useState({ title: '', category: 'MÚSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [toast, setToast] = useState(null);
  const [showCoffeeOptions, setShowCoffeeOptions] = useState(false);

  const paypalUrl = "https://paypal.me/jacobogarver";
  const kofiUrl = "https://ko-fi.com/jacobogarver";

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const toggleFavorite = async (ev) => {
    if (!user) return showNotification("Inicia sesión ❤️");
    const id = String(ev.id);
    if (favorites.includes(id)) {
      setFavorites(f => f.filter(i => i !== id));
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: id });
    } else {
      setFavorites(f => [...f, id]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: id });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter(e => e.date >= today);
  const publicEvents = activeEvents.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <style> {globalStyles} </style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white font-sans overflow-hidden transition-all duration-500">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top text-center">
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
             <LogoSVG />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-800/50">
               {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white cursor-pointer uppercase" onClick={() => setView('profile')}>
                {user.email[0]}
              </div>
            ) : (
              <button onClick={() => showNotification("Usa el login de Supabase")} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">Entrar</button>
            )}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-bold text-[10px] tracking-widest transition-all shrink-0 border border-slate-700 ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/40 text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              <div className="space-y-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[415px] border border-slate-800">
                    <div className="relative h-52 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-2.5 bg-white rounded-full text-red-500 shadow-xl">
                        <Heart size={18} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-center items-center text-center text-white">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="w-full max-w-[280px] bg-blue-600 text-white py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-[#cbd2d3]"> 
              <MapContainer 
                key={view} 
                center={[40.4167, -3.7037]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
              > 
                <SpainMapController />
                {/* TileLayer en ESPAÑOL */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  attribution='&copy; España'
                /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 text-center">
                        <div className="font-bold text-[10px] uppercase text-indigo-600 mb-1">{ev.title}</div>
                        <p className="text-[8px] font-bold uppercase opacity-60">{ev.city}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-4 text-center pb-40">
               <div className="bg-[#0f172a] rounded-[3rem] p-6 shadow-2xl border border-slate-800">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-black uppercase border-2 border-white">
                    {user?.email[0]}
                  </div>
                  <h2 className="text-sm font-black mb-8 uppercase tracking-widest text-slate-300">Apoya el Proyecto</h2>
                  <div className="space-y-4">
                    {!showCoffeeOptions ? (
                      <button onClick={() => setShowCoffeeOptions(true)} className="w-full bg-amber-500 text-white p-5 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3">
                        <Coffee size={20} /> Invitar a un café
                      </button>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        <a href={kofiUrl} target="_blank" rel="noreferrer" className="w-full bg-[#29abe0] text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3">
                          <ExternalLink size={16} /> Ko-fi
                        </a>
                        <a href={paypalUrl} target="_blank" rel="noreferrer" className="w-full bg-[#003087] text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3">
                          <CreditCard size={16} /> PayPal
                        </a>
                        <button onClick={() => setShowCoffeeOptions(false)} className="text-slate-500 text-[10px] font-black uppercase mt-2">Volver</button>
                      </div>
                    )}
                    <button onClick={() => supabase.auth.signOut()} className="w-full bg-red-600/20 text-red-500 border border-red-500/30 p-4 rounded-[2rem] font-black uppercase text-xs mt-6 flex items-center justify-center gap-2">
                      <LogOut size={20} /> Cerrar Sesión
                    </button>
                  </div>
               </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 text-slate-500">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl transition-all ${view === 'home' ? "bg-blue-600 text-white shadow-lg" : ""}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className="p-4 rounded-2xl"><PlusCircle size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? "bg-blue-600 text-white shadow-lg" : ""}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('profile')} className={`p-4 rounded-2xl transition-all ${view === 'profile' ? "bg-blue-600 text-white shadow-lg" : ""}`}><Heart size={26}/></button>
        </nav>
      </div>
    </div>
  );
}

export default App;
