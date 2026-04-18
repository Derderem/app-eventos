import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2, Map as MapIcon,
  Clock, LayoutList, ShieldCheck, Sparkles, Loader2, 
  CheckCircle2, ArrowLeft, Search, X, RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// ESTILOS GLOBALES - RESTAURADOS Y LIMPIOS
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, sans-serif; }
  
  html, body, #root {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .leaflet-container { 
    background: #aad3df !important; 
    height: 100% !important; 
    width: 100% !important;
    z-index: 1 !important;
  }

  .leaflet-control-attribution {
    font-size: 9px !important;
    background: rgba(255,255,255,0.8) !important;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Temas */
  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  
  /* Tarjetas */
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  /* Animaciones */
  @keyframes pulse-admin {
    0% { transform: scale(1); color: #818cf8; }
    50% { transform: scale(1.15); color: #ef4444; }
    100% { transform: scale(1); color: #818cf8; }
  }
  .pulse-admin { animation: pulse-admin 2s infinite; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin { animation: spin 1s linear infinite; }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  .fade-in { animation: fadeIn 0.4s ease-out; }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .shimmer-bg {
    background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%);
    background-size: 1000px 100%;
    animation: shimmer 1.5s infinite linear;
  }

  /* Estilo Modal IA */
  .ia-card {
    transition: all 0.3s ease;
    cursor: pointer;
    border: 3px solid transparent;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    background: #1e293b;
    min-height: 200px;
  }
  .ia-card:hover { transform: scale(1.02); border-color: #6366f1; }
  .ia-card.selected { border-color: #4f46e5; box-shadow: 0 0 25px rgba(79, 70, 229, 0.6); }
`;

// FIX LEAFLET ICONS
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapResizer({ center }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView(center || [40.4167, -3.7037], center ? 13 : 6);
    }, 300);
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

export default function App() {
  // === ESTADOS PRINCIPALES ===
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('eventora_favs_v4');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  // === ESTADO FORMULARIO ===
  const [form, setForm] = useState({ 
    title: '', city: '', localidad: '', address: '', 
    time: '21:00', date: '', category: 'MUSICA', image_url: '' 
  });

  // === ESTADO IA ===
  const [showIaModal, setShowIaModal] = useState(false);
  const [iaUrls, setIaUrls] = useState([null, null]); // Array para guardar 2 URLs
  const [iaStatuses, setIaStatuses] = useState(['idle', 'idle']); // ['loading', 'loaded', 'error']
  const [reloadKey, setReloadKey] = useState(0); // Para forzar recarga visual

  // === EFECTOS ===
  useEffect(() => {
    fetchEvents();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      else setProfile(null);
    });
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
  }, [favorites]);

  // === FUNCIONES ===
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*');
      if (data) setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) { console.error('Error:', err); }
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const needsUpper = ['title', 'city', 'localidad'];
    const val = needsUpper.includes(name) ? value.toUpperCase() : value;
    setForm({ ...form, [name]: val });
  };

  // ⭐ GENERAR IMÁGENES (SIN BLOBS PARA EVITAR CRASHES)
  const triggerGeneration = () => {
    const cat = form.category.toLowerCase();
    const title = form.title.toLowerCase().substring(0, 40);
    
    // Seeds aleatorios únicos
    const seed1 = Math.random() * 1000000;
    const seed2 = Math.random() * 1000000 + 999999;
    
    // Prompts enfocados en el título
    const url1 = `https://image.pollinations.ai/prompt/${encodeURIComponent(title)}_${cat}_professional_photo_realistic?width=800&height=600&seed=${seed1}&nologo=true`;
    const url2 = `https://image.pollinations.ai/prompt/${encodeURIComponent(title)}_${cat}_artistic_poster_dramatic?width=800&height=600&seed=${seed2}&nologo=true`;

    console.log('🚀 Generando URL 1:', url1);
    console.log('🚀 Generando URL 2:', url2);

    // Inicializamos estados a loading inmediatamente para feedback visual
    setIaUrls([url1, url2]);
    setIaStatuses(['loading', 'loading']);
    setReloadKey(prev => prev + 1);
  };

  const generateAIImages = () => {
    if (!form.title) return alert("Escribe un título primero");
    setShowIaModal(true);
    setTimeout(triggerGeneration, 100);
  };

  const regenerateIaImages = () => {
    setIaStatuses(['loading', 'loading']);
    triggerGeneration();
  };

  const selectImage = (index, url) => {
    setForm({ ...form, image_url: url });
    setShowIaModal(false);
  };

  const handleCitySearch = async (city) => {
    if (city === 'ESPAÑA') { setMapCenter(null); return; }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Spain')}`);
      const data = await response.json();
      if (data[0]) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
    } catch (e) { console.log(e); }
  };

  // === DATOS DERIVADOS ===
  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const filteredEvents = publicEvents.filter(e => selectedCategory === 'TODOS' || e.category === selectedCategory);
  const citiesList = [...new Set(publicEvents.map(e => e.city))];

  return (
    <div className={isDark ? "dark-theme" : "light-theme"} style={{ width: '100vw', height: '100vh' }}>
      <style>{globalStyles}</style>

      {/* HEADER */}
      <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(128,128,128,0.1)', zIndex: 2000, background: isDark ? '#0f172a' : '#fff' }}>
        <LogoSVG onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ cursor: 'pointer' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {profile?.role === 'admin' && <ShieldCheck size={24} className={events.filter(e => e.status === 'pending').length > 0 ? 'pulse-admin' : ''} />}
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', color: 'inherit' }}>
            {isDark ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          <Sparkles size={20} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* VISTA MAPA */}
        {view === 'map' && (
          <div style={{ position: 'absolute', inset: 0, background: '#aad3df', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '80%' }}>
              <div style={{ background: 'white', padding: 8, borderRadius: 20, display: 'flex', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <Search size={16} color="#6366f1"/>
                <select onChange={(e) => handleCitySearch(e.target.value)} style={{ width: '100%', marginLeft: 10, border: 'none', outline: 'none', fontWeight: 'bold' }}>
                  <option value="ESPAÑA">📍 BUSCAR...</option>
                  {citiesList.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <MapContainer center={[40.41, -3.7]} zoom={6} style={{ width: '100%', height: '100%' }}>
              <MapResizer center={mapCenter} />
              <TileLayer url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} maxZoom={19} />
              {publicEvents.filter(e => e.lat && e.lng).map(ev => (
                <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                  <Popup><b>{ev.title}</b></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* HOME LIST */}
        {view === 'home' && !selectedEvent && (
          <>
            {/* CATEGORIAS */}
            <div className="no-scrollbar" style={{ display: 'flex', gap: 12, padding: '15px 20px', background: isDark ? '#020617' : '#f8fafc', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  style={{ 
                    padding: '8px 20px', borderRadius: 99, border: 'none', 
                    background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'),
                    color: selectedCategory === cat ? 'white' : 'inherit', 
                    fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' 
                  }}
                >{cat}</button>
              ))}
            </div>

            {/* EVENTOS */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {filteredEvents.map(ev => (
                <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 32, marginBottom: 20, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', height: 180 }}>
                    <img src={ev.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    
                    {/* CORAZÓN DE FAVORITO - DEVUELTO */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(ev.id); }} 
                      style={{ position: 'absolute', top: 15, right: 15, width: 40, height: 40, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', border: 'none' }}
                    >
                      <Heart size={20} fill={favorites.includes(ev.id) ? "#ef4444" : "none"} color="#ef4444" />
                    </button>
                  </div>
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <h3 style={{ fontWeight: 900, marginBottom: 8 }}>{ev.title}</h3>
                    <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>{ev.city} | {ev.date}</p>
                    <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', marginTop: 15, padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 11 }}>VER DETALLE</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DETALLE EVENTO */}
        {selectedEvent && (
          <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: 20, paddingBottom: 100 }}>
             <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 15 }}>
               <ArrowLeft size={18}/> VOLVER
             </button>
             
             <div className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 30, overflow: 'hidden' }}>
                <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="" />
                <div style={{ padding: 25 }}>
                  <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 20 }}>{selectedEvent.title}</h2>
                  
                  <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 15 }}><Calendar color="#6366f1"/> <span style={{ fontWeight: 700 }}>{selectedEvent.date}</span></div>
                    <div style={{ display: 'flex', gap: 15 }}><Clock color="#6366f1"/> <span style={{ fontWeight: 700 }}>{selectedEvent.time}H</span></div>
                    
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, border: '1px dashed #6366f1', background: 'rgba(99,102,241,0.1)', borderRadius: 15, cursor: 'pointer' }}
                    >
                      <MapPin color="#6366f1" size={24} style={{ marginBottom: 5 }}/>
                      <span style={{ fontWeight: 900, fontSize: 12 }}>IR AL LUGAR</span>
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* CREAR EVENTO */}
        {view === 'create' && (
          <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>NUEVO EVENTO</h2>
            
            <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 20, borderRadius: 30, display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input name="title" placeholder="TÍTULO DEL EVENTO" value={form.title} onChange={handleInputChange} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)' }} />
              
              <div style={{ display: 'flex', gap: 10 }}>
                <input name="city" placeholder="CIUDAD" value={form.city} onChange={handleInputChange} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)' }} />
                <select name="category" value={form.category} onChange={handleInputChange} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)' }}>
                  <option>MÚSICA</option><option>GASTRONOMÍA</option><option>OTRO</option>
                </select>
              </div>

              <input name="address" placeholder="DIRECCIÓN / LOCALIDAD" value={form.address} onChange={handleInputChange} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)' }} />
              
              <div style={{ display: 'flex', gap: 10 }}>
                 <input name="date" type="date" value={form.date} onChange={handleInputChange} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)' }} />
                 <input name="time" type="time" value={form.time} onChange={handleInputChange} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: 'rgba(128,128,128,0.1)' }} />
              </div>

              {/* BOTONES FOTO */}
              <div style={{ display: 'flex', gap: 10 }}>
                 <button onClick={generateAIImages} style={{ flex: 1, padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                   <Sparkles size={14}/> IA FOTO
                 </button>
                 <label style={{ flex: 1, padding: 12, background: '#1e293b', color: 'white', textAlign:'center', borderRadius: 12, fontWeight: 900, cursor: 'pointer' }}>
                   SUBIR GALERÍA <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => {
                     const file = e.target.files[0];
                     if(file){ const r=new FileReader(); r.onload=(v)=>setForm({...form,image_url:v.target.result}); r.readAsDataURL(file); }
                   }}/>
                 </label>
              </div>

              {form.image_url && (
                <div style={{ position: 'relative' }}>
                  <img src={form.image_url} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 15 }} alt="" />
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'green', color: 'white', padding: '4px 8px', borderRadius: 10, fontSize: 10, fontWeight: 900 }}>OK</div>
                </div>
              )}

              <button style={{ width: '100%', padding: 18, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 15, fontWeight: 900, fontSize: 14 }}>ENVIAR A REVISIÓN</button>
            </div>
          </div>
        )}

        {/* SOPORTE */}
        {view === 'profile' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: 20 }}>
             <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 40, borderRadius: 50, textAlign: 'center' }}>
               <h2>SOPORTE</h2>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 20 }}>
                 <a href="#" style={{ padding: 15, background: '#29abe0', color: 'white', borderRadius: 18, textDecoration: 'none', fontWeight: 900 }}>APOYAR EN KO-FI</a>
                 <a href="#" style={{ padding: 15, background: '#003087', color: 'white', borderRadius: 18, textDecoration: 'none', fontWeight: 900 }}>APOYAR EN PAYPAL</a>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* NAV INFERIOR */}
      <nav style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 360, height: 70, borderRadius: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', zIndex: 3000 }}>
        <button onClick={() => {setView('home'); setSelectedEvent(null);}} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none' }}>
           <LayoutList size={24} color={view==='home'? '#4f46e5':'#64748b'}/>
        </button>
        <button onClick={() => setView('favorites')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none' }}>
           <Heart size={24} fill={view==='favorites'? '#ef4444':'none'} color={view==='favorites'? '#ef4444':'#64748b'}/>
        </button>
        <button onClick={() => setView('create')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none' }}>
           <PlusCircle size={24} color={view==='create'? '#4f46e5':'#64748b'}/>
        </button>
        <button onClick={() => setView('map')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none' }}>
           <MapIcon size={24} color={view==='map'? '#4f46e5':'#64748b'}/>
        </button>
      </nav>

      {/* MODAL IA CORREGIDO (Versión Anti-Bug) */}
      {showIaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="fade-in" style={{ background: isDark ? '#0f172a' : '#fff', borderRadius: 30, padding: 25, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowIaModal(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', padding: 5 }}><X size={24} /></button>
            
            <h3 style={{ textAlign: 'center', fontWeight: 900 }}>ELIGE TU FOTO</h3>
            <p style={{ textAlign: 'center', fontSize: 12, opacity: 0.7, marginBottom: 15 }}>La primera es realista, la segunda artística.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              {[0, 1].map((idx) => {
                const status = iaStatuses[idx];
                const url = iaUrls[idx];
                return (
                  <div key={idx} className={`ia-card ${status === 'loaded' ? 'clickable' : ''}`} onClick={() => status === 'loaded' && selectImage(idx, url)}>
                    
                    {status === 'loading' && (
                      <div className="shimmer-bg" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" size={24} color="#6366f1"/>
                      </div>
                    )}

                    {status === 'loaded' && url && (
                      <>
                        <img 
                          key={`${reloadKey}-${url}`} // KEY ÚNICA PARA FORZAR CARGA
                          src={url} 
                          style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} 
                          alt={`Option ${idx+1}`}
                          onLoad={() => setIaStatuses(prev => { const n = [...prev]; n[idx]='loaded'; return n; })}
                          onError={() => setIaStatuses(prev => { const n = [...prev]; n[idx]='error'; return n; })}
                        />
                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: idx === 0 ? '#4f46e5' : '#ec4899', color: 'white', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 900 }}>
                          {idx===0?'REALISTA':'ARTÍSTICA'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={regenerateIaImages} style={{ width: '100%', marginTop: 15, padding: 12, background: 'transparent', border: '1px dashed #6366f1', color: '#6366f1', borderRadius: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <RefreshCw size={14}/> OTROS 2 MODELOS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
