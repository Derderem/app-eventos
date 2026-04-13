import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload,
  Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Estilos obligatorios
import 'leaflet/dist/leaflet.css';

// ============================================================
// FIX FINAL: LÍNEAS BLANCAS, IDIOMA ESPAÑOL Y DISEÑO
// ============================================================
const globalStyles = `
  .leaflet-container { 
    background-color: #aad3df !important; 
    border: none !important;
  }
  
  /* SOLUCIÓN RADICAL A LAS LÍNEAS BLANCAS */
  .leaflet-tile {
    /* Forzamos solapamiento de 2px para que no haya grietas */
    width: 258px !important;
    height: 258px !important;
    margin-left: -1px !important;
    margin-top: -1px !important;
    filter: brightness(1.02);
    /* Evita que el navegador intente suavizar y cree transparencias */
    outline: 1px solid transparent;
    -webkit-backface-visibility: hidden;
    image-rendering: -webkit-optimize-contrast;
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

// Fix Marcadores Leaflet
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

// LOGO EVENTORA ORIGINAL COMPLETO
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
    <rect x="210" y="8" width="28" height="28" rx="6" fill="#4f46e520" stroke="#6366f1" strokeWidth="2" />
    <path d="M210 18 H238 M217 8 V12 M231 8 V12" stroke="#6366f1" strokeWidth="2" />
    <path d="M224 29 L226 25 L230 23 L226 21 L224 17 L222 21 L218 23 L222 25 Z" fill="#6366f1" />
  </svg>
);

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home');
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'MÚSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { 
        setUser(session.user); 
        loadUserData(session.user.id);
      } else { 
        setUser(null); setProfile(null); setFavorites([]); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') {
      setProfile({ role: 'admin' });
    } else {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (prof) setProfile(prof);
    }
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Pon un título ✨");
    const urlIA = `https://image.pollinations.ai/prompt/professional_event_photography_of_${encodeURIComponent(form.title)}?width=800&height=1000&seed=${Date.now()}&nologo=true`;
    setForm({...form, image_url: urlIA});
    showNotification("Imagen IA Lista ✨");
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

  // FILTRO: Solo aprobados y de hoy en adelante (quita eliminados)
  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => 
    e.status === 'approved' && e.date >= today && (activeCategory === 'TODOS' || e.category === activeCategory)
  );

  return (
    <div className={isDark ? "dark" : ""}>
      <style> {globalStyles} </style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white font-sans overflow-hidden transition-all duration-500">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl font-black uppercase text-[10px] tracking-widest">{toast}</div>
        )}

        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}><LogoSVG /></div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <button onClick={() => setView('admin')} className="text-indigo-400 p-2">
                <ShieldCheck size={28} />
              </button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-800/50">
               {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black border-2 border-white cursor-pointer uppercase" onClick={() => setView('profile')}>
                {user.email[0]}
              </div>
            ) : (
              <button onClick={() => setView('profile')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">Entrar</button>
            )}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-bold text-[10px] tracking-widest transition-all shrink-0 border border-slate-700 ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800/40 text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              <div className="space-y-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[415px] border border-slate-800">
                    <img src={ev.image_url} className="w-full h-52 object-cover" alt="img" />
                    <div className="p-5 flex-1 flex flex-col justify-center items-center text-center">
                      <h3 className="text-xl font-black italic uppercase mb-4">{ev.title}</h3>
                      <button className="w-full max-w-[280px] bg-blue-600 text-white py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-[#aad3df]"> 
              <MapContainer 
                center={[40.41, -3.70]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
                zoomSnap={1}
              > 
                <SpainMapController />
                {/* IDIOMA ESPAÑOL: OpenStreetMap es el mejor para esto */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  attribution='ESPAÑA' 
                /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 text-center font-sans">
                        <div className="font-bold text-[10px] uppercase text-indigo-600 mb-1 leading-tight">{ev.title}</div>
                        <p className="text-[8px] font-bold uppercase opacity-60 text-slate-500">{ev.city}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 text-slate-500">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl ${view === 'home' ? "bg-blue-600 text-white shadow-lg" : ""}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className="p-4 rounded-2xl"><PlusCircle size={26}/></button>
          <button onClick={() => setView('favorites')} className={`p-4 rounded-2xl ${view === 'favorites' ? "bg-blue-600 text-white shadow-lg" : ""}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl ${view === 'map' ? "bg-blue-600 text-white shadow-lg" : ""}`}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
