import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, 
  CheckCircle2, Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Estilos obligatorios
import 'leaflet/dist/leaflet.css';

// ============================================================
// FIX DEFINITIVO: CERO LÍNEAS BLANCAS Y TODO RECUPERADO
// ============================================================
const globalStyles = `
  .leaflet-container { 
    background-color: #aad3df !important; 
  }
  
  /* SOLUCIÓN PROFESIONAL PARA LAS LÍNEAS BLANCAS */
  .leaflet-tile {
    /* Forzamos un solapamiento interno del 1.5% para tapar la grieta */
    transform: scale(1.015) !important;
    
    /* Evita que el navegador suavice los bordes y deje ver el fondo */
    outline: 1px solid transparent;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    image-rendering: -webkit-optimize-contrast;
  }

  /* Prevenir que reglas de Vercel/Tailwind aplasten el mapa */
  .leaflet-container img {
    max-width: none !important;
    max-height: none !important;
    box-shadow: none !important;
  }

  .logo-font { font-family: 'Arial Black', sans-serif; font-weight: 900; font-style: italic; display: flex; align-items: center; letter-spacing: -2px; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// Fix Marcadores
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
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchEvents();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        if (session.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      } else {
        setUser(null); setProfile(null);
      }
    });
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('status', 'approved');
    if (data) setEvents(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Revisa tu email para entrar");
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.date >= today);

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{globalStyles}</style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden transition-all duration-500 font-sans">
        
        {/* BARRA SUPERIOR */}
        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}><LogoSVG /></div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && <ShieldCheck size={28} className="text-indigo-400" />}
            <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-800/50 rounded-xl">
               {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black border-2 border-white cursor-pointer uppercase shadow-lg" onClick={() => setView('profile')}>
                {user ? user.email[0] : '?'}
            </div>
          </div>
        </nav>

        <main className="flex-1 relative overflow-hidden">
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 h-full overflow-y-auto no-scrollbar pb-40">
              {publicEvents.map(ev => (
                <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] overflow-hidden border border-slate-800 mb-6 shadow-2xl transition active:scale-95">
                  <div className="relative h-52 overflow-hidden">
                    <img src={ev.image_url} className="w-full h-full object-cover" alt="" />
                    <button className="absolute top-5 right-5 p-3 bg-white rounded-full shadow-xl text-red-500"><Heart size={20} /></button>
                  </div>
                  <div className="p-6 text-center italic font-black uppercase tracking-tighter text-xl">{ev.title}</div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="absolute inset-0 z-0 bg-[#aad3df]">
              <MapContainer 
                key="map-final-v10" 
                center={[40.41, -3.70]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false} 
                zoomSnap={1}
              >
                <SpainMapController />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='ESPAÑA'
                />
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup><div className="text-center font-bold text-indigo-600 uppercase text-xs">{ev.title}</div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-md mx-auto p-10 text-center">
              {!user ? (
                <form onSubmit={handleLogin} className="space-y-4 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                  <h2 className="font-black uppercase italic text-xl">Mi Cuenta</h2>
                  <input type="email" placeholder="Tu Email" className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white" value={email} onChange={e => setEmail(e.target.value)} required />
                  <button type="submit" className="w-full bg-indigo-600 p-4 rounded-2xl font-bold uppercase tracking-widest">Entrar</button>
                </form>
              ) : (
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-4">
                  <p className="font-bold">Email: {user.email}</p>
                  <button onClick={() => supabase.auth.signOut()} className="w-full bg-red-600/20 text-red-500 p-4 rounded-2xl font-bold uppercase">Cerrar Sesión</button>
                </div>
              )}
            </div>
          )}

          {view === 'create' && <div className="h-full flex items-center justify-center font-black uppercase text-2xl text-slate-700">Pantalla Crear</div>}
          {view === 'favorites' && <div className="h-full flex items-center justify-center font-black uppercase text-2xl text-slate-700">Pantalla Favoritos</div>}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 text-slate-500">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl transition-all ${view === 'home' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className={`p-4 rounded-2xl transition-all ${view === 'create' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><PlusCircle size={26}/></button>
          <button onClick={() => setView('favorites')} className={`p-4 rounded-2xl transition-all ${view === 'favorites' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><MapIcon size={26}/></button>
        </nav>
      </div>
    </div>
  );
}
