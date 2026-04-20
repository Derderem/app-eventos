import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon,
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, 
  CheckCircle2, Share2, Upload, Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft, Search,
  RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ... (los estilos globales y componentes MapResizer, LogoSVG se mantienen igual) ...
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; }
  .leaflet-container { background: #aad3df !important; height: 100% !important; width: 100% !important; position: absolute !important; top: 0; left: 0; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; }
  .shimmer-bg { background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%); background-size: 1000px 100%; animation: shimmerAnim 1.5s infinite linear; }
  @keyframes shimmerAnim { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
  .ia-card { cursor: pointer; border: 3px solid transparent; border-radius: 20px; overflow: hidden; position: relative; background: #1e293b; min-height: 200px; }
  .ia-card.selected { border-color: #4f46e5; box-shadow: 0 0 20px rgba(79, 70, 229, 0.5); }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapResizer({ center }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); if (center) map.setView(center, 13); else map.setView([40.4167, -3.7037], 6); }, 300);
    return () => clearTimeout(timer);
  }, [map, center]);
  return null;
}

const LogoSVG = () => <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 22, width: 'auto' }} />;
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL || '', process.env.REACT_APP_SUPABASE_ANON_KEY || '');

export default function App() {
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('eventora_favs_v4') || '[]'));
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [form, setForm] = useState({ title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' });

  // IA STATE
  const [showIaModal, setShowIaModal] = useState(false);
  const [iaImgs, setIaImgs] = useState([null, null]);
  const [loading, setLoading] = useState([false, false]);

  useEffect(() => {
    fetchEvents();
    localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
  }, [favorites]);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    if (data) setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // GENERADOR SECUENCIAL
  const generateImages = async () => {
    if (!form.title) return alert("Escribe un título");
    
    setShowIaModal(true);
    setIaImgs([null, null]);
    setLoading([true, true]);

    const title = encodeURIComponent(form.title);
    
    // IA 1: Modelo "flux" (Realista)
    const url1 = `https://image.pollinations.ai/prompt/professional_event_photo_${title}?width=800&height=600&seed=${Math.floor(Math.random()*1000000)}&nologo=true&model=flux`;
    
    // IA 2: Modelo "turbo" (Más artístico, diferente seed y modelo)
    const url2 = `https://image.pollinations.ai/prompt/cinematic_poster_of_${title}_event?width=800&height=600&seed=${Math.floor(Math.random()*1000000)}&nologo=true&model=turbo`;

    setIaImgs([url1, url2]);
    
    // Simulamos carga para que el usuario vea que está trabajando
    setTimeout(() => setLoading([false, false]), 2500);
  };

  return (
    <div className={isDark ? "dark-theme" : "light-theme"} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>

      {/* MODAL IA */}
      {showIaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: isDark ? '#0f172a' : '#fff', borderRadius: 30, padding: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowIaModal(false)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#6366f1"/></button>
            <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Elige tu imagen</h2>
            
            <div style={{ display: 'grid', gap: 15 }}>
              {iaImgs.map((url, i) => (
                <div key={i} className="ia-card" onClick={() => { setForm({...form, image_url: url}); setShowIaModal(false); }}>
                  {loading[i] ? <div className="shimmer-bg" style={{height: 200}}/> : <img src={url} style={{width: '100%', height: 200, objectFit: 'cover'}}/>}
                </div>
              ))}
            </div>
            
            <button onClick={generateImages} style={{ width: '100%', padding: 15, marginTop: 20, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 15, cursor: 'pointer' }}>Generar nuevas</button>
          </div>
        </div>
      )}

      {/* ESTRUCTURA PRINCIPAL */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        
        {/* NAV */}
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
          <LogoSVG />
          <div style={{ display: 'flex', gap: 15 }}>
             <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{isDark ? <Sun color="#facc15"/> : <Moon color="#4f46e5"/>}</button>
          </div>
        </nav>

        {/* CONTENIDO (Solo renderizo Map o View por simplicidad en este ejemplo, adapta el tuyo) */}
        <main style={{ flex: 1, position: 'relative' }}>
          {view === 'map' ? (
             <MapContainer center={[40.41, -3.70]} zoom={6} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" />
                {events.map(ev => ev.lat && <Marker key={ev.id} position={[ev.lat, ev.lng]}/>)}
             </MapContainer>
          ) : (
            <div style={{ padding: 20 }}>
               {view === 'create' && (
                 <>
                   <input name="title" placeholder="Título" onChange={handleInputChange} style={{ width: '100%', padding: 10, marginBottom: 10 }} />
                   <button onClick={generateImages} style={{ width: '100%', padding: 10, background: '#4f46e5', color: 'white' }}>Generar Foto IA</button>
                 </>
               )}
            </div>
          )}
        </main>

        {/* BOTONERA (Corazón incluido) */}
        <nav style={{ position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 400, height: 75, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', zIndex: 3000, background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none' }}><LayoutList size={26} color={view === 'home' ? '#4f46e5' : '#64748b'}/></button>
          <button onClick={() => setView('favorites')} style={{ background: 'none', border: 'none' }}><Heart size={26} color={view === 'favorites' ? '#ef4444' : '#64748b'}/></button>
          <button onClick={() => setView('create')} style={{ background: 'none', border: 'none' }}><PlusCircle size={26} color={view === 'create' ? '#4f46e5' : '#64748b'}/></button>
          <button onClick={() => setView('map')} style={{ background: 'none', border: 'none' }}><MapIcon size={26} color={view === 'map' ? '#4f46e5' : '#64748b'}/></button>
        </nav>
      </div>
    </div>
  );
}
