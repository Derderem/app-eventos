import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2, Map as MapIcon,
  Clock, LayoutList, ShieldCheck, Sparkles, Loader2,
  ArrowLeft, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// ESTILOS GLOBALES - CON FIX DEFINITIVO PARA MAPA Y NAV
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

  /* ✅ FIX DEFINITIVO LÍNEAS BLANCAS EN MÓVIL */
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
const initialFormState = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };

export default function App() {
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('eventora_favs_v4');
    return saved ? JSON.parse(saved) : [];
  });
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventora_favs_v4', JSON.stringify(favorites));
    }
  }, [favorites]);

  // ✅ FIX DEFINITIVO ADMIN: Comprueba sesión al cargar y escucha cambios
  useEffect(() => {
    const checkIsAdmin = (user) => {
      if (!user) return false;
      return ADMIN_EMAILS.includes(user.email) || ADMIN_IDS.includes(user.id);
    };

    const handleSession = (session) => {
      if (checkIsAdmin(session?.user)) {
        setProfile({ role: 'admin' });
      } else {
        setProfile(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
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

  // ✅ IA DE 1 SOLA FOTO, realista y basada en el título (la que te funcionaba)
  const generateAIImage = () => {
    if (!form.title) return alert("Escribe un título primero");
    setIsGenerating(true);

    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/professional_event_photography_${encodeURIComponent(form.title)}?width=800&height=600&seed=${seed}&nologo=true&t=${Date.now()}`;

    setForm({ ...form, image_url: url });
    setTimeout(() => setIsGenerating(false), 2000);
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
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=${encodeURIComponent(city + ', España')}`);
      const data = await response.json();
      if (data[0]) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch(err) {
      console.error(err);
    }
  };

  // ✅ LÓGICA DE ENVÍO DEL EVENTO A SUPABASE
  const handleSubmitEvent = async () => {
    if (!form.title || !form.date || !form.city || !form.address) {
      alert("Por favor, rellena los campos principales (título, ciudad, fecha y dirección).");
      return;
    }

    setIsSubmitting(true);
    const eventData = { ...form, status: 'pending' };

    try {
      const { error } = await supabase.from('events').insert([eventData]);
      if (error) throw error;
      
      alert("¡Evento enviado a revisión! Muchas gracias.");
      setForm(initialFormState); // Resetea el formulario
      setView('home'); // Vuelve a la home
      fetchEvents(); // Actualiza la lista de eventos para el admin
    } catch (error) {
      alert("Hubo un error al enviar el evento. Inténtalo de nuevo.");
      console.error("Error al insertar evento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
