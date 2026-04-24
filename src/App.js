import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2, Map as MapIcon,
  Clock, LayoutList, ShieldCheck, Sparkles, Loader2, CheckCircle, X,
  ArrowLeft, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAIL = 'jacobogarver@gmail.com';
const ADMIN_ID = '4d76c965-66de-491d-8cc1-6d37096262c9';

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
const Logo = () => (
  <img 
    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" 
    alt="Eventora" 
    style={{ height: 22 }}
  />
);

function MapResizer({ center }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      if (center) map.setView(center, 13);
      else map.setView([40.4167, -3.7037], 6);
    }, 300);
  }, [map, center]);
  return null;
}

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function App() {
  // Estados
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    title: '', city: '', localidad: '', address: '', 
    date: '', time: '21:00', category: 'MUSICA', image_url: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    fetchEvents();
    const saved = localStorage.getItem('favs');
    if (saved) setFavorites(JSON.parse(saved));
    
    // Verificar si es admin
    checkAdmin();
  }, []);

  // Guardar favoritos
  useEffect(() => {
    localStorage.setItem('favs', JSON.stringify(favorites));
  }, [favorites]);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === ADMIN_EMAIL || session?.user?.id === ADMIN_ID) {
      setIsAdmin(true);
    }
    
    // Escuchar cambios de auth
    supabase.auth.onAuthStateChange((event, session) => {
      const isUserAdmin = session?.user?.email === ADMIN_EMAIL || session?.user?.id === ADMIN_ID;
      setIsAdmin(isUserAdmin);
    });
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    if (data) setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const upperFields = ['title', 'city', 'localidad'];
    setForm({ ...form, [name]: upperFields.includes(name) ? value.toUpperCase() : value });
  };

  const generateImage = () => {
    if (!form.title) return alert('Escribe un título primero');
    setLoading(true);
    const seed = Date.now();
    const url = `https://image.pollinations.ai/prompt/professional_event_${encodeURIComponent(form.title)}?width=800&height=600&seed=${seed}&nologo=true`;
    setForm({ ...form, image_url: url });
    setTimeout(() => setLoading(false), 1500);
  };

  const submitEvent = async () => {
    if (!form.title || !form.date) return alert('Faltan campos obligatorios');
    
    try {
      const { error } = await supabase.from('events').insert([{ ...form, status: 'pending' }]);
      if (error) throw error;
      alert('Evento enviado a revisión');
      setForm({ title: '', city: '', localidad: '', address: '', date: '', time: '21:00', category: 'MUSICA', image_url: '' });
      setView('home');
      fetchEvents();
    } catch (err) {
      alert('Error al enviar');
      console.error(err);
    }
  };

  const approveEvent = async (id) => {
    await supabase.from('events').update({ status: 'approved' }).eq('id', id);
    fetchEvents();
  };

  const deleteEvent = async (id) => {
    if (confirm('¿Eliminar este evento?')) {
      await supabase.from('events').delete().eq('id', id);
      fetchEvents();
    }
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const today = new Date().toISOString().split('T')[0];
  const approvedEvents = events.filter(e => e.status === 'approved' && e.date >= today);
  const pendingEvents = events.filter(e => e.status === 'pending');
  const favoriteEvents = approvedEvents.filter(e => favorites.includes(e.id));

  // ============================================================
  // RENDER VISTAS
  // ============================================================
  
  // VISTA MAPA
  const MapView = () => (
    <div style={{ position: 'absolute', inset: 0, background: '#aad3df' }}>
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: 350 }}>
        <div style={{ background: 'white', borderRadius: 15, padding: 10, display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <Search size={20} color="#6366f1" style={{ marginRight: 10 }} />
          <select 
            onChange={(e) => {
              const city = e.target.value;
              if (city === 'ESPAÑA') setMapCenter(null);
              else {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city},España`)
                  .then(r => r.json())
                  .then(d => d[0] && setMapCenter([parseFloat(d[0].lat), parseFloat(d[0].lon)]));
              }
            }}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14 }}
          >
            <option>📍 BUSCAR CIUDAD...</option>
            {[...new Set(approvedEvents.map(e => e.city))].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      
      <MapContainer center={[40.41, -3.70]} zoom={6} style={{ width: '100%', height: '100%' }}>
        <MapResizer center={mapCenter} />
        <TileLayer 
          url="https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}" 
          attribution="Google Maps"
        />
        {approvedEvents.map(ev => ev.lat && (
          <Marker key={ev.id} position={[ev.lat, ev.lng]}>
            <Popup>{ev.title}<br/>{ev.city}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );

  // VISTA ADMIN
  const AdminView = () => (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PANEL ADMIN</h2>
      <h3 style={{ color: '#6366f1', marginBottom: 15 }}>Eventos Pendientes ({pendingEvents.length})</h3>
      
      {pendingEvents.length === 0 ? (
        <p style={{ textAlign: 'center', opacity: 0.6 }}>No hay eventos pendientes</p>
      ) : (
        pendingEvents.map(ev => (
          <div key={ev.id} style={{ background: isDark ? '#1e293b' : '#f1f5f9', padding: 15, borderRadius: 15, marginBottom: 15 }}>
            <img src={ev.image_url} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} alt="" />
            <h4>{ev.title}</h4>
            <p style={{ fontSize: 12, opacity: 0.7 }}>{ev.city} | {ev.date}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => approveEvent(ev.id)} style={{ flex: 1, padding: 10, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
                <CheckCircle size={16} /> APROBAR
              </button>
              <button onClick={() => deleteEvent(ev.id)} style={{ padding: 10, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8 }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // VISTA HOME
  const HomeView = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 10, padding: 15, overflowX: 'auto', background: isDark ? '#020617' : '#f8fafc' }}>
        {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS'].map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 20px', borderRadius: 20, border: 'none',
              background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'),
              color: selectedCategory === cat ? 'white' : 'inherit',
              fontWeight: 'bold', whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
        {approvedEvents
          .filter(e => selectedCategory === 'TODOS' || e.category === selectedCategory)
          .map(ev => (
          <div key={ev.id} style={{ background: isDark ? '#0f172a' : 'white', borderRadius: 20, overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ position: 'relative', height: 180 }}>
              <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <button onClick={() => toggleFavorite(ev.id)} style={{ position: 'absolute', top: 10, right: 10, background: 'white', borderRadius: '50%', padding: 8, border: 'none' }}>
                <Heart size={20} fill={favorites.includes(ev.id) ? 'red' : 'none'} color={favorites.includes(ev.id) ? 'red' : '#666'} />
              </button>
            </div>
            <div style={{ padding: 15 }}>
              <h3 style={{ marginBottom: 5 }}>{ev.title}</h3>
              <p style={{ fontSize: 12, color: '#6366f1', marginBottom: 10 }}>{ev.city} | {ev.date}</p>
              <button onClick={() => setSelectedEvent(ev)} style={{ width: '100%', padding: 12, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontWeight: 'bold' }}>
                VER DETALLES
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // VISTA DETALLE
  const DetailView = () => (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
        <ArrowLeft /> Volver
      </button>
      <img src={selectedEvent.image_url} style={{ width: '100%', height: 250, objectFit: 'cover', borderRadius: 20, marginBottom: 20 }} alt="" />
      <h2>{selectedEvent.title}</h2>
      <p style={{ color: '#6366f1', marginBottom: 20 }}>{selectedEvent.city} - {selectedEvent.date}</p>
      
      <div style={{ display: 'grid', gap: 15, marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Calendar color="#
