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

// ============================================================
// ESTILOS GLOBALES
// ============================================================
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  html, body, #root {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  .leaflet-container { 
    background: #aad3df !important; 
    height: 100% !important; 
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    outline: none !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .dark-theme { background-color: #020617; color: white; }
  .light-theme { background-color: #f8fafc; color: #0f172a; }
  .card-dark { background-color: #0f172a; border: 1px solid #1e293b; color: white; }
  .card-light { background-color: white; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }

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
  .ia-card.selected {
    border-color: #4f46e5;
    box-shadow: 0 0 25px rgba(79, 70, 229, 0.6);
  }
  .fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (center) map.setView(center, 13, { animate: true });
      else map.setView([40.4167, -3.7037], 6);
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
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('eventora_favs_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  
  // ESTADOS IA
  const [showIaModal, setShowIaModal] = useState(false);
  const [iaUrl1, setIaUrl1] = useState('');
  const [iaUrl2, setIaUrl2] = useState('');
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const [form, setForm] = useState({ title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' });

  useEffect(() => {
    fetchEvents();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      else setProfile(null);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
  }, [favorites]);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    if (data) setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const needsUpper = ['title', 'city', 'localidad'];
    setForm({ ...form, [name]: needsUpper.includes(name) ? value.toUpperCase() : value });
  };

  // ⭐⭐⭐ FUNCIÓN IA MEJORADA ⭐⭐⭐
  const generateImages = async () => {
    if (!form.title) return alert("Escribe un título");

    setShowIaModal(true);
    setIaUrl1('');
    setIaUrl2('');
    setLoading1(true);
    setLoading2(true);

    // 1. Limpiamos el título y categoría para el prompt
    const cleanTitle = form.title.toLowerCase();
    const cleanCat = form.category.toLowerCase();
    
    // 2. Definimos Seeds y Parámetros Únicos
    const seed1 = Math.floor(Math.random() * 1000000);
    const seed2 = Math.floor(Math.random() * 1000000) + 1000;

    // 3. GENERAR OPCIÓN 1 (Realista)
    const prompt1 = encodeURIComponent(`Professional high-quality photography of ${cleanTitle} ${cleanCat} event, realistic, 8k, highly detailed`);
    setIaUrl1(`https://image.pollinations.ai/prompt/${prompt1}?width=800&height=600&seed=${seed1}&nologo=true&model=flux`);

    // 4. GENERAR OPCIÓN 2 (Cinematográfica) con un pequeño retraso para no bloquear el servidor
    setTimeout(() => {
        const prompt2 = encodeURIComponent(`Cinematic artistic poster for ${cleanTitle} ${cleanCat}, vibrant colors, dramatic lighting, epic composition`);
        setIaUrl2(`https://image.pollinations.ai/prompt/${prompt2}?width=800&height=600&seed=${seed2}&nologo=true&model=flux-pro`);
    }, 800);
  };

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
  const citiesList = [...new Set(publicEvents.map(e => e.city))];

  return (
    <div className={isDark ? "dark-theme" : "light-theme"} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>

      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* NAV */}
        <nav style={{ height: 65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(128,128,128,0.2)', background: isDark ? '#0f172a' : '#fff', zIndex: 10 }}>
          <div onClick={() => setView('home')}><LogoSVG /></div>
          <div style={{ display: 'flex', gap: 15 }}>
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none' }}>
               {isDark ? <Sun color="#facc15" /> : <Moon color="#4f46e5" />}
            </button>
            <Sparkles color="#6366f1" onClick={() => setView('profile')} />
          </div>
        </nav>

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          
          {/* MAPA */}
          {view === 'map' && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 }}>
                <select onChange={(e) => handleCitySearch(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 15, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontWeight: 900 }}>
                  <option value="ESPAÑA">📍 BUSCAR CIUDAD...</option>
                  {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <MapContainer center={[40.41, -3.7]} zoom={6} style={{ width: '100%', height: '100%' }}>
                <MapResizer center={mapCenter} />
                <TileLayer url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" />
                {publicEvents.map(ev => ev.lat && <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><b>{ev.title}</b></Popup></Marker>)}
              </MapContainer>
            </div>
          )}

          {/* HOME */}
          {view === 'home' && !selectedEvent && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, padding: 15, overflowX: 'auto', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '8px 18px', borderRadius: 20, border: 'none', background: selectedCategory === cat ? '#4f46e5' : '#e2e8f0', fontWeight: 900, whiteSpace: 'nowrap' }}>{cat}</button>
                ))}
              </div>
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 100 }}>
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={isDark ? "card-dark" : "card-light"} style={{ borderRadius: 25, overflow: 'hidden', marginBottom: 20 }}>
                    <img src={ev.image_url} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                    <div style={{ padding: 15, textAlign: 'center' }}>
                      <h3 style={{ fontWeight: 900 }}>{ev.title}</h3>
                      <p style={{ fontSize: 11, color: '#6366f1' }}>{ev.city} | {ev.date}</p>
                      <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 12, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 900 }}>DETALLES</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CREAR */}
          {view === 'create' && (
            <div className="no-scrollbar" style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
              <div className={isDark ? "card-dark" : "card-light"} style={{ padding: 20, borderRadius: 25, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ textAlign: 'center', fontWeight: 900 }}>AÑADIR EVENTO</h2>
                <input name="title" placeholder="TÍTULO" style={{ padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)' }} onChange={handleInputChange} />
                <input name="city" placeholder="CIUDAD" style={{ padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)' }} onChange={handleInputChange} />
                <select name="category" style={{ padding: 12, borderRadius: 10, border: 'none', background: 'rgba(128,128,128,0.1)' }} onChange={handleInputChange}>
                  <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINO">TAURINO</option><option value="OTROS">OTROS</option>
                </select>
                <div style={{ display: 'flex', gap: 10 }}>
                   <button onClick={generateImages} style={{ flex: 1, padding: 12, background: '#4f46e5', color: 'white', borderRadius: 10, border: 'none', fontWeight: 900 }}><Sparkles size={16}/> IA FOTO</button>
                   <label style={{ flex: 1, padding: 12, background: '#1e293b', color: 'white', borderRadius: 10, textAlign: 'center', fontWeight: 900 }}>SUBIR <input type="file" style={{display:'none'}} onChange={handleGalleryUpload}/></label>
                </div>
                {form.image_url && <img src={form.image_url} style={{ width: '100%', borderRadius: 15 }} />}
                <button style={{ padding: 15, background: '#4f46e5', color: 'white', borderRadius: 12, border: 'none', fontWeight: 900 }}>ENVIAR REVISIÓN</button>
              </div>
            </div>
          )}
        </main>

        {/* MODAL IA */}
        {showIaModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="fade-in" style={{ background: isDark ? '#0f172a' : '#fff', borderRadius: 25, padding: 20, width: '100%', maxWidth: 450, position: 'relative' }}>
              <button onClick={closeIaModal} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#6366f1' }}><X/></button>
              <h3 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 15 }}>ELIGE TU FOTO IA</h3>
              
              <div style={{ display: 'grid', gap: 15 }}>
                {/* FOTO 1 */}
                <div className="ia-card" onClick={() => !loading1 && selectIaImage(iaUrl1)}>
                  {loading1 && <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" color="#6366f1"/></div>}
                  <img src={iaUrl1} style={{ width: '100%', height: 200, objectFit: 'cover', display: loading1 ? 'none' : 'block' }} onLoad={() => setLoading1(false)} />
                  {!loading1 && <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: 5, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, textAlign: 'center' }}>OPCIÓN 1: REALISTA</div>}
                </div>

                {/* FOTO 2 */}
                <div className="ia-card" onClick={() => !loading2 && selectIaImage(iaUrl2)}>
                  {loading2 && <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" color="#ec4899"/></div>}
                  <img src={iaUrl2} style={{ width: '100%', height: 200, objectFit: 'cover', display: loading2 ? 'none' : 'block' }} onLoad={() => setLoading2(false)} />
                  {!loading2 && <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: 5, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, textAlign: 'center' }}>OPCIÓN 2: ARTÍSTICA</div>}
                </div>
              </div>

              <button onClick={generateImages} style={{ width: '100%', marginTop: 15, padding: 12, border: '2px dashed #6366f1', background: 'none', color: '#6366f1', borderRadius: 10, fontWeight: 900 }}>REGENERAR FOTOS</button>
            </div>
          </div>
        )}

        {/* NAV INFERIOR */}
        <nav style={{ position: 'fixed', bottom: 15, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 400, height: 70, borderRadius: 30, background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 100 }}>
          <LayoutList onClick={() => setView('home')} color={view === 'home' ? '#4f46e5' : '#64748b'} />
          <PlusCircle onClick={() => setView('create')} color={view === 'create' ? '#4f46e5' : '#64748b'} />
          <MapIcon onClick={() => setView('map')} color={view === 'map' ? '#4f46e5' : '#64748b'} />
        </nav>
      </div>
    </div>
  );
}
