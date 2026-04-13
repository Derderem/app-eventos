import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload,
  Coffee, LogOut, ExternalLink, CreditCard, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

/* =========================
   FIX SOLO MAPA (IMPORTANTE)
========================= */
const appStyles = `
  .leaflet-container {
    background: #cbd2d3 !important;
  }

  /* FIX REAL para líneas entre tiles */
  .leaflet-tile {
    filter: none !important;
  }

  .leaflet-pane img {
    outline: none !important;
    border: none !important;
  }
`;

/* FIX ICONOS LEAFLET */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* CENTRAR ESPAÑA */
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6);
    }, 300);
  }, [map]);
  return null;
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY
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
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
    else {
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

  /* =========================
     TU LÓGICA IGUAL
  ========================= */

  const generateIA = () => {};
  const handleGalleryUpload = () => {};

  const handleCreate = async (e) => {
    e.preventDefault();

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        form.address + ', ' + form.city + ', España'
      )}&limit=1`
    );

    const geo = await res.json();

    let lat = 40.4167;
    let lng = -3.7037;

    if (geo?.length > 0) {
      lat = parseFloat(geo[0].lat);
      lng = parseFloat(geo[0].lon);
    }

    await supabase.from('events').insert([
      {
        ...form,
        lat,
        lng,
        status: profile?.role === 'admin' ? 'approved' : 'pending',
        organizer_id: user?.id
      }
    ]);

    fetchEvents();
    setView('home');
  };

  const toggleFavorite = async (ev) => {
    if (!user) return;

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
  const publicEvents = activeEvents.filter(e => e.status === 'approved');

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{appStyles}</style>

      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white">

        {/* ================= MAPA ================= */}
        {view === 'map' && (
          <MapContainer
            center={[40.4167, -3.7037]}
            zoom={6}
            className="h-full w-full"
          >
            <SpainMapController />

            {/* 🔥 MAPA EN ESPAÑOL REAL */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />

            {publicEvents.map(ev => (
              ev.lat && (
                <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                  <Popup>{ev.title}</Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}

      </div>
    </div>
  );
}

export default App;
