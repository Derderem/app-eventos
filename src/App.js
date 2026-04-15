import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, 
  CheckCircle2, Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// FIX TOTAL: CERO LÍNEAS, CERO BORDES, MAYÚSCULAS Y ADMIN
// ============================================================
const globalStyles = `
  .leaflet-container, .leaflet-container *, .leaflet-control-container, 
  .leaflet-control-container *, .leaflet-pane, .leaflet-pane * {
    border: none !important; outline: none !important; box-shadow: none !important;
  }
  .leaflet-container { background-color: #aad3df !important; }
  .leaflet-tile-pane { image-rendering: -webkit-optimize-contrast; }
  .leaflet-tile { 
    transform: scale(1.02) !important;
    filter: brightness(1.02);
    -webkit-backface-visibility: hidden;
    outline: 1px solid transparent;
  }
  .leaflet-container img { max-width: none !important; max-height: none !important; }
  
  .map-full {
    position: absolute !important; top: 0 !important; left: 0 !important;
    right: 0 !important; bottom: 0 !important; margin: 0 !important;
    padding: 0 !important; border: none !important; outline: none !important;
  }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.2); color: #ef4444; opacity: 0.8; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: admin-pulse 2s infinite; }

  .logo-font { font-family: 'Arial Black', sans-serif; font-weight: 900; font-style: italic; display: flex; align-items: center; letter-spacing: -2px; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); map.setView([40.4167, -3.7037], 6); }, 500);
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
  const [pendingCount, setPendingCount] = useState(0);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [form, setForm] = useState({ title: '', city: '', time: '21:00', date: '' });

  useEffect(() => {
    fetchEvents();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        if (session.user.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      } else { setUser(null); setProfile(null); }
    });
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) {
      setEvents(data);
      setPendingCount(data.filter(e => e.status === 'pending').length);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'title' || name === 'city') ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const updateStatus = async (id, status, reason = '') => {
    await supabase.from('events').update({ status, rejection_reason: reason }).eq('id', id);
    fetchEvents();
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const adminEvents = events.filter(e => e.status === 'pending');

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{globalStyles}</style>
      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white overflow-hidden transition-all duration-500 font-sans">
        
        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}><LogoSVG /></div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <ShieldCheck 
                size={28} 
                className={`cursor-pointer ${pendingCount > 0 ? 'pulse-admin' : 'text-indigo-400'}`} 
                onClick={() => setView('admin')}
              />
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-800/50 rounded-xl transition">
               {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black border-2 border-white cursor-pointer uppercase shadow-lg shadow-indigo-500/20" onClick={() => setView('profile')}>
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
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} className="w-full h-full object-cover" alt="" />
                    <button className="absolute top-5 right-5 p-3 bg-white rounded-full shadow-xl text-red-500"><Heart size={20} /></button>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">{ev.title}</h3>
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">{ev.city}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="map-full" style={{ background: '#aad3df', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0, border: 'none', outline: 'none' }}>
              <MapContainer 
                center={[40.4167, -3.7037]} 
                zoom={6} 
                className="map-full"
                style={{ height: "100%", width: "100%", position: 'absolute', top: 0, left: 0, margin: 0, padding: 0, border: 'none', outline: 'none' }}
                zoomSnap={1}
              >
                <SpainMapController />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                {publicEvents.map(ev => ev.lat && ev.lng && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup className="text-center text-indigo-600 font-bold uppercase text-xs">
                      {ev.title}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'profile' && (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
              <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl w-full max-w-sm space-y-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-black mx-auto border-4 border-slate-800 shadow-xl">{user?.email?.[0].toUpperCase() || '?'}</div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Apoyar proyecto</h2>
                <div className="grid gap-3">
                  <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 bg-[#29abe0] p-5 rounded-2xl font-black uppercase text-xs hover:scale-105 transition active:scale-95">
                    <Coffee size={20} /> Ko-fi.com
                  </a>
                  <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 bg-[#003087] p-5 rounded-2xl font-black uppercase text-xs hover:scale-105 transition active:scale-95">
                    <CreditCard size={20} /> PayPal.me
                  </a>
                </div>
                {user && (
                  <button onClick={() => supabase.auth.signOut()} className="flex items-center justify-center gap-2 w-full text-red-500 font-black uppercase text-[10px] tracking-widest pt-6 border-t border-slate-800">
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                )}
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="max-w-xl mx-auto p-4 h-full overflow-y-auto no-scrollbar pb-40">
               <h2 className="text-center font-black uppercase italic text-indigo-500 mb-6 tracking-widest">Moderación</h2>
               {adminEvents.length === 0 && <p className="text-center text-slate-500 mt-20">No hay eventos pendientes.</p>}
               {adminEvents.map(ev => (
                 <div key={ev.id} className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 mb-4 space-y-4 shadow-xl">
                    <h3 className="font-black uppercase text-indigo-400">{ev.title}</h3>
                    <p className="text-xs font-bold text-slate-400">{ev.city} | {ev.date} | {ev.time}</p>
                    <div className="flex gap-2">
                       <button onClick={() => updateStatus(ev.id, 'approved')} className="flex-1 bg-green-600 p-4 rounded-xl font-black uppercase text-[10px]">Aprobar</button>
                       <button onClick={() => {
                         const reason = window.prompt("Motivo del rechazo:");
                         if(reason) updateStatus(ev.id, 'rejected', reason);
                       }} className="flex-1 bg-red-600/20 text-red-500 p-4 rounded-xl font-black uppercase text-[10px]">Rechazar</button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-md mx-auto p-6 h-full overflow-y-auto no-scrollbar">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-4 shadow-2xl">
                <h2 className="text-xl font-black uppercase italic text-center">Nuevo Evento</h2>
                <input name="title" placeholder="TÍTULO" className="w-full p-5 rounded-xl bg-slate-800 border border-slate-700 uppercase font-bold text-white outline-none focus:border-indigo-500" value={form.title} onChange={handleInputChange} />
                <input name="city" placeholder="CIUDAD" className="w-full p-5 rounded-xl bg-slate-800 border border-slate-700 uppercase font-bold text-white outline-none focus:border-indigo-500" value={form.city} onChange={handleInputChange} />
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 ml-2 uppercase">Fecha</label>
                      <input name="date" type="date" className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white" value={form.date} onChange={handleInputChange} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 ml-2 uppercase">Hora (24h)</label>
                      <input name="time" type="time" className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white" value={form.time} onChange={handleInputChange} />
                   </div>
                </div>
                <button className="w-full bg-indigo-600 p-5 rounded-xl font-black uppercase shadow-lg mt-4 active:scale-95 transition">Publicar</button>
              </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-4 text-slate-500 transition-all">
          <button onClick={() => setView('home')} className={`p-4 rounded-2xl transition-all ${view === 'home' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className={`p-4 rounded-2xl transition-all ${view === 'create' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : ""}`}><Plus
