import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2, Map as MapIcon,
  Clock, LayoutList, ShieldCheck, Sparkles, Loader2,
  ArrowLeft, Search, RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// ESTILOS CON FIX PARA LÍNEAS BLANCAS DEL MAPA
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color 0.3s, color 0.3s; }

  html, body, #root {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  /* FIX DEFINITIVO LÍNEAS BLANCAS EN MÓVIL */
  .leaflet-tile-container {
    transform: translateZ(0);
    will-change: transform;
  }
  .leaflet-tile {
    transform-origin: center center !important;
    transform: scale(1.005) translateZ(0) !important;
    outline: 1px solid transparent !important;
  }

  .leaflet-container img { max-width: none !important; max-height: none !important; }
  .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.7) !important; }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  @keyframes admin-pulse {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.15); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: admin-pulse 2s infinite; }

  .animate-spin { animation: spin 1s linear infinite; }
  .fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  
  .shimmer-bg {
    background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%);
    background-size: 600px 100%;
    animation: shimmerAnim 1.5s infinite linear;
  }
  @keyframes shimmerAnim { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }

  .ia-card {
    border: 3px solid transparent;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    background: #1e293b;
    min-height: 180px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .ia-card:hover { border-color: #6366f1; }
`;

// ============================================================
// HELPERS
// ============================================================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapResizer({ center }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (center) map.setView(center, 13, { animate: true });
      else map.setView([40.4167, -3.7037], 6);
    }, 500);
    return () => clearTimeout(timer);
  }, [map, center]);
  return null;
}

const LogoSVG = () => (
  <img
    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png"
    alt="Eventora"
    style={{ height: 22, width: 'auto' }}
  />
);

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAILS = ['jacobogarver@gmail.com'];
const ADMIN_IDS = ['4d76c965-66de-491d-8cc1-6d37096262c9'];

export default function App() {
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eventora_favs_v4') : null;
    return saved ? JSON.parse(saved) : [];
  });
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [form, setForm] = useState({
    title: '', city: '', localidad: '', address: '',
    time: '21:00', date: '', category: 'MUSICA', image_url: ''
  });

  // IA Modal State
  const [showIaModal, setShowIaModal] = useState(false);
  const [iaUrl1, setIaUrl1] = useState('');
  const [iaUrl2, setIaUrl2] = useState('');
  const [iaStatus1, setIaStatus1] = useState('idle');
  const [iaStatus2, setIaStatus2] = useState('idle');

  useEffect(() => {
    fetchEvents();
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
    }
  }, [favorites]);

  useEffect(() => {
    const checkIsAdmin = (user) => {
      return user && (ADMIN_EMAILS.includes(user.email) || ADMIN_IDS.includes(user.id));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (checkIsAdmin(session?.user)) setProfile({ role: 'admin' });
      else setProfile(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (checkIsAdmin(session?.user)) setProfile({ role: 'admin' });
      else setProfile(null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    if (data) setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = ['title', 'city', 'localidad'].includes(name) ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  const generateAIImages = () => {
    if (!form.title) return alert("Escribe un título primero");
    setShowIaModal(true);

    // ✅ INICIAR CARGA SECUENCIAL: PRIMERO UNA, LUEGO LA OTRA
    const title = encodeURIComponent(form.title);
    const seed1 = Math.floor(Math.random() * 999999);
    const url1 = `https://image.pollinations.ai/prompt/professional_event_photography_${title}_realistic?width=800&height=600&seed=${seed1}&nologo=true&t=${Date.now()}`;
    
    setIaUrl1(url1);
    setIaStatus1('loading');
    setIaUrl2('');
    setIaStatus2('waiting'); // La segunda espera
  };

  const handleIa1Load = () => {
    setIaStatus1('loaded');
    
    // Al cargar la primera, lanzamos la segunda
    const title = encodeURIComponent(form.title);
    const seed2 = Math.floor(Math.random() * 999999) + 500000;
    const url2 = `https://image.pollinations.ai/prompt/artistic_creative_poster_${title}?width=800&height=600&seed=${seed2}&nologo=true&t=${Date.now()}`;

    setIaUrl2(url2);
    setIaStatus2('loading');
  };

  const handleIaError = (setter) => () => setter('error');
  const handleIaLoad = (setter) => () => setter('loaded');

  const selectIaImage = (url) => {
    setForm({ ...form, image_url: url });
    setShowIaModal(false);
  };
  
  const handleGalleryUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm({ ...form, image_url: ev.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleCitySearch = async (city) => {
    if (city === 'ESPAÑA') return setMapCenter(null);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=${encodeURIComponent(city + ', España')}`);
    const data = await response.json();
    if (data[0]) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
  };

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(e => selectedCategory === 'TODOS' || e.category === selectedCategory);
  const favoriteEvents = publicEvents.filter(e => favorites.includes(e.id));
  const citiesList = [...new Set(publicEvents.map(e => e.city))];
  
  const renderIaCard = (url, status, onLoad, onError, label, accent) => (
    <div className="ia-card" onClick={() => status === 'loaded' && selectIaImage(url)} style={{ marginBottom: 14 }}>
      {(status === 'loading' || status === 'waiting') && <div className="shimmer-bg" style={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}><Loader2 className="animate-spin" size={28} color={accent} /><p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{status === 'waiting' ? 'En cola...' : `Generando ${label}...`}</p></div>}
      {status === 'error' && <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, background: '#1e293b' }}><Trash2 size={28} color="#ef4444" /><p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>Error</p></div>}
      {url && status !== 'error' && <img src={url} style={{ width: '100%', height: 180, objectFit: 'cover', display: status === 'loaded' ? 'block' : 'none' }} alt={label} onLoad={onLoad} onError={onError} />}
      {status === 'loaded' && <><div style={{ position: 'absolute', top: 10, left: 10, background: accent, color: 'white', padding: '5px 10px', borderRadius: 10, fontSize: 9, fontWeight: 900, zIndex: 2 }}>{label}</div><div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '18px 12px 10px', color: 'white', fontSize: 10, fontWeight: 900, textAlign: 'center', zIndex: 2 }}>👆 TOCA PARA ELEGIR</div></>}
    </div>
  );

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => { setView('home'); setSelectedEvent(null); }}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, marginLeft: 'auto' }}>
            {profile?.role === 'admin' && <ShieldCheck size={28} className={events.filter(e => e.status === 'pending').length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1', cursor: 'pointer', flexShrink: 0 }} onClick={() => setView('admin')} />}
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>{isDark ? <Sun size={24} color="#facc15" /> : <Moon size={24} color="#4f46e5" />}</button>
            <Sparkles size={24} color="#6366f1" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setView('profile')} />
          </div>
        </nav>
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {view === 'map' && <MapContainer center={[40.41, -3.70]} zoom={6} style={{ width: '100%', height: '100%' }}><MapResizer center={mapCenter} /><TileLayer url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" attribution='&copy; Google Maps' maxZoom={20} subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />{publicEvents.map(ev => ev.lat && ev.lng && <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><b>{ev.title}</b><br />{ev.city}</Popup></Marker>)}</MapContainer>}
          {view === 'home' && !selectedEvent && <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><div className="no-scrollbar" style={{ display: 'flex', gap: 10, padding: '15px 20px', overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>{['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '10px 22px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' }}>{cat}</button>)}</div><div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 150 }}>{filteredEvents.map(ev => <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 32, overflow: 'hidden', marginBottom: 20 }}><div style={{ position: 'relative', height: 180 }}><img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /><button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 15, right: 15, padding: 10, background: 'white', borderRadius: '50%', border: 'none', color: '#ef4444', display: 'flex', cursor: 'pointer' }}><Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} /></button></div><div style={{ padding: 20, textAlign: 'center' }}><h3 style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</h3><p style={{ fontSize: 10, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 15 }}>{ev.city} | {ev.date}</p><button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 14, borderRadius: 16, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>DETALLES</button></div></div>)}</div></div>}
          {selectedEvent && <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}><button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 8, marginBottom: 20, cursor: 'pointer' }}><ArrowLeft /> VOLVER</button><div className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden', padding: 0 }}><img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="" /><div style={{ padding: 25 }}><h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 15 }}>{selectedEvent.title}</h2><div style={{ display: 'grid', gap: 15 }}><div style={{ display: 'flex', gap: 10 }}><Calendar color="#6366f1" /> <b>{selectedEvent.date}</b></div><div style={{ display: 'flex', gap: 10 }}><Clock color="#6366f1" /> <b>{selectedEvent.time}H</b></div><div onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.localidad + ' ' + selectedEvent.city)}`)} style={{ background: 'rgba(99,102,241,0.1)', padding: 20, borderRadius: 15, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1' }}><MapPin color="#6366f1" style={{ margin: '0 auto 5px' }} /> <br /><b>{selectedEvent.address}, {selectedEvent.localidad} - {selectedEvent.city}</b> <br /><span style={{ fontSize: 10, color: '#2563eb', fontWeight: 900 }}>GPS (GOOGLE MAPS)</span></div></div></div></div></div>}
          {view === 'create' && <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 150 }}><div className={isDark ? "card-dark" : "card-light"} style={{ padding: 20, borderRadius: 30, gap: 10, display: 'flex', flexDirection: 'column' }}><h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16 }}>AÑADIR EVENTO</h2><input name="title" placeholder="TÍTULO" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.title} onChange={handleInputChange} /><div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}><input name="city" placeholder="CIUDAD" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.city} onChange={handleInputChange} /><select name="category" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.category} onChange={handleInputChange}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS</option><option value="OTROS">OTROS</option></select></div><input name="localidad" placeholder="LOCALIDAD" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.localidad} onChange={handleInputChange} /><input name="address" placeholder="DIRECCIÓN" style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700 }} value={form.address} onChange={handleInputChange} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><input name="date" type="date" style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.date} onChange={handleInputChange} /><input name="time" type="time" style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)', color: 'inherit' }} value={form.time} onChange={handleInputChange} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><button onClick={generateAIImages} style={{ padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}><Sparkles size={14} /> IA FOTO</button><label style={{ padding: 12, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>GALERÍA <input type="file" style={{ display: 'none' }} onChange={handleGalleryUpload} /></label></div>{form.image_url && <img src={form.image_url} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 15 }} alt="" />}<button style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 15, borderRadius: 12, border: 'none', fontWeight: 900, cursor: 'pointer' }}>ENVIAR REVISIÓN</button></div></div>}
          {view === 'favorites' && <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}><h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>MIS GUARDADOS</h2>{favoriteEvents.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700, padding: 40 }}>NO HAY EVENTOS GUARDADOS</p> : favoriteEvents.map(ev => <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 25, marginBottom: 12, alignItems: 'center' }}><img src={ev.image_url} style={{ width: 60, height: 60, borderRadius: 15, objectFit: 'cover' }} alt="" /><div style={{ flex: 1 }}><p style={{ fontWeight: 900 }}>{ev.title}</p><p style={{ fontSize: 10, color: '#6366f1' }}>{ev.city}</p></div><button onClick={() => toggleFavorite(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={22} /></button></div>)}</div>}
          {view === 'profile' && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div className={isDark ? "card-dark" : "card-light"} style={{ padding: 30, borderRadius: 45, width: '100%', maxWidth: 350, textAlign: 'center' }}><h2 style={{ fontWeight: 900, marginBottom: 20 }}>SOPORTE</h2><div style={{ display: 'grid', gap: 12, marginBottom: 20 }}><a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN KO-FI</a><a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 18, borderRadius: 18, textDecoration: 'none', fontWeight: 900, fontSize: 12 }}>APOYAR EN PAYPAL</a></div><button onClick={() => { const e = prompt("Email Admin:"); if (e) supabase.auth.signInWithOtp({ email: e }); }} style={{ opacity: 0.1, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}>Admin Login</button></div></div>}
        </main>
        {showIaModal && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(8px)' }}><div className="fade-in" style={{ background: isDark ? '#0f172a' : '#fff', borderRadius: 30, padding: 25, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 80px rgba(79, 70, 229, 0.4)' }}><button onClick={() => setShowIaModal(false)} style={{ position: 'absolute', top: 15, right: 15, background: isDark ? '#1e293b' : '#f1f5f9', border: 'none', borderRadius: '50%', width: 35, height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isDark ? '#fff' : '#0f172a', zIndex: 10 }}><X size={18} /></button><div style={{ textAlign: 'center', marginBottom: 20 }}><Sparkles size={32} color="#6366f1" style={{ margin: '0 auto 10px' }} /><h2 style={{ fontWeight: 900, fontSize: 18, color: isDark ? '#fff' : '#0f172a', marginBottom: 5 }}>ELIGE TU FOTO FAVORITA</h2><p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>2 estilos de IA generados uno tras otro</p></div>{renderIaCard(iaUrl1, iaStatus1, handleIa1Load, handleIaError(setIaStatus1), '🎬 REALISTA', '#4f46e5')}{renderIaCard(iaUrl2, iaStatus2, handleIaLoad(setIaStatus2), handleIaError(setIaStatus2), '🎨 CREATIVA', '#ec4899')}<button onClick={generateAIImages} style={{ width: '100%', padding: 14, background: 'transparent', color: '#6366f1', border: '2px dashed #6366f1', borderRadius: 12, fontSize: 11, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}><RefreshCw size={14} />GENERAR 2 NUEVAS</button></div></div>}
        <nav style={{ position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}><button onClick={() => { setView('home'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><LayoutList size={26} /></button><button onClick={() => { setView('favorites'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer' }}><Heart size={26} fill={view === 'favorites' ? "#ef4444" : "none"} /></button><button onClick={() => { setView('create'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><PlusCircle size={26} /></button><button onClick={() => { setView('map'); setSelectedEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}><MapIcon size={26} /></button></nav>
      </div>
    </div>
  );
}
