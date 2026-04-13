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

// ✅ FIX REAL (SIN ROMPER TU DISEÑO)
const customGlobalStyles = `
  .leaflet-container { background-color: #f5f5f5 !important; }

  /* 🔥 SOLUCIÓN REAL SIN HACKS */
  .leaflet-tile {
    image-rendering: auto;
    transform: translateZ(0);
  }

  .leaflet-map-pane {
    will-change: transform;
  }

  .logo-eventora {
    font-family: 'Arial Black', sans-serif;
    font-weight: 900;
    font-style: italic;
    display: flex;
    align-items: center;
    letter-spacing: -2px;
    font-size: 26px;
  }
  .c-cian { color: #00e5ff; }
  .c-blue { color: #2979ff; }
  .c-purple { color: #aa00ff; }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ✅ CONTROLLER MÁS ESTABLE
function SpainMapController() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6, { animate: false });
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

  const paypalUrl = "https://paypal.me/TU_USUARIO"; 
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

  const today = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter(e => e.date >= today);
  const publicEvents = activeEvents.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{customGlobalStyles}</style>

      <div className="h-screen w-screen flex flex-col bg-[#020617] text-white font-sans overflow-hidden transition-all duration-500">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top text-center">
            <CheckCircle2 size={16} className="inline mr-2"/>
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        {/* NAVBAR ORIGINAL */}
        <nav className="h-[70px] shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-6 z-[2000] shadow-sm">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
             <div className="logo-eventora">
                <span className="c-cian">E</span>
                <span className="c-cian">V</span>
                <span className="c-blue">E</span>
                <span className="c-blue">N</span>
                <span className="c-purple">T</span>
                <span className="c-purple">O</span>
                <span className="c-purple">R</span>
                <span className="c-purple">A</span>
                <Calendar className="text-indigo-400 ml-2" size={24} />
             </div>
          </div>
          <button onClick={() => setIsDark(!isDark)}>
             {isDark ? <Sun size={24}/> : <Moon size={24}/>}
          </button>
        </nav>

        <main className="flex-1 relative overflow-y-auto">

          {/* HOME (COMPLETO) */}
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40">
              {publicEvents.map(ev => (
                <div key={ev.id} className="bg-[#0f172a] rounded-2xl p-4 mb-4">
                  <h3 className="font-bold">{ev.title}</h3>
                </div>
              ))}
            </div>
          )}

          {/* MAPA */}
          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-[#cbd2d3]"> 
              <MapContainer 
                center={[40.41, -3.70]} 
                zoom={6} 
                preferCanvas={true}
                className="h-full w-full" 
                zoomControl={false}
              > 
                <SpainMapController />

                {/* 🔥 TILE SIN LÍNEAS */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap"
                /> 

                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="text-center">
                        <strong>{ev.title}</strong>
                        <br/>
                        {ev.city}
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}

        </main>

        {/* NAV INFERIOR ORIGINAL */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-[#0f172a] h-[80px] rounded-3xl flex items-center justify-around">
          <button onClick={() => setView('home')}>
            <LayoutList size={26}/>
          </button>
          <button onClick={() => setView('map')}>
            <MapIcon size={26}/>
          </button>
        </nav>

      </div>
    </div>
  );
}

export default App;
