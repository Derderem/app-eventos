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

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  .leaflet-container {
    background-color: #aad3df !important; 
  }
  
  .leaflet-tile {
    margin: 0 !important;
    padding: 0 !important;
  }

  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
    border-radius: 8px !important;
    overflow: hidden;
  }
  
  .leaflet-control-zoom a {
    border: none !important;
    border-bottom: 1px solid #ccc !important;
  }
  
  .leaflet-control-zoom a:last-child {
    border-bottom: none !important;
  }

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
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6); 
    }, 100);
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
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [mapReady, setMapReady] = useState(false);

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

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter(e => e.date >= today);

  return (
    <div className={isDark ? "dark" : ""} style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      
      {/* MAPA - Extendido mas alla de la pantalla para eliminar bordes */}
      {view === 'map' && (
        <div style={{ 
          position: 'fixed', 
          top: -50, 
          left: -50, 
          width: 'calc(100vw + 100px)', 
          height: 'calc(100vh + 100px)', 
          zIndex: 1,
          background: '#aad3df',
          overflow: 'hidden'
        }}>
          <MapContainer 
            center={[40.4167, -3.7037]} 
            zoom={6} 
            style={{ 
              width: '100%', 
              height: '100%'
            }}
            zoomSnap={1}
            whenReady={() => setMapReady(true)}
          >
            <SpainMapController />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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

      {/* Contenido principal */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        pointerEvents: view === 'map' ? 'none' : 'auto'
      }}>
        
        {/* NAVBAR */}
        <nav style={{ 
          height: 70, 
          flexShrink: 0, 
          background: 'rgba(15, 23, 42, 0.8)', 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgb(30, 41, 59)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 32px',
          zIndex: 2000,
          pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setView('home')}><LogoSVG /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {profile?.role === 'admin' && <ShieldCheck size={28} style={{ color: '#818cf8' }} />}
            <button onClick={() => setIsDark(!isDark)} style={{ padding: 8, background: 'rgba(51, 65, 85, 0.5)', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
               {isDark ? <Sun size={24} style={{ color: '#facc15' }} /> : <Moon size={24} style={{ color: '#4f46e5' }} />}
            </button>
            <div 
              onClick={() => setView('profile')}
              style={{ 
                width: 40, 
                height: 40, 
                background: '#4f46e5', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 900, 
                border: '2px solid white', 
                cursor: 'pointer',
                textTransform: 'uppercase',
                color: 'white'
              }}
            >
              {user ? user.email[0] : '?'}
            </div>
          </div>
        </nav>

        {/* CONTENIDO */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', background: view === 'map' ? 'transparent' : '#020617' }}>
          {view === 'home' && (
            <div className="no-scrollbar" style={{ maxWidth: 576, margin: '0 auto', padding: 16, height: '100%', overflowY: 'auto', paddingBottom: 160 }}>
              {publicEvents.map(ev => (
                <div key={ev.id} style={{ background: '#0f172a', borderRadius: 40, overflow: 'hidden', border: '1px solid rgb(30, 41, 59)', marginBottom: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                  <div style={{ position: 'relative', height: 208, overflow: 'hidden' }}>
                    <img src={ev.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button style={{ position: 'absolute', top: 20, right: 20, padding: 12, background: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Heart size={20} /></button>
                  </div>
                  <div style={{ padding: 24, textAlign: 'center', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', fontSize: 20, color: 'white' }}>{ev.title}</div>
                </div>
              ))}
            </div>
          )}

          {view === 'profile' && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, textTransform: 'uppercase', fontSize: 24, color: 'rgb(51, 65, 85)', fontStyle: 'italic' }}>Pantalla Perfil</div>}
        </main>

        {/* BOTTOM NAV */}
        <nav style={{ 
          position: 'fixed', 
          bottom: 24, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '92%', 
          maxWidth: 420, 
          background: 'rgba(15, 23, 42, 0.95)', 
          backdropFilter: 'blur(24px)',
          border: '1px solid rgb(30, 41, 59)',
          height: 80,
          borderRadius: 40,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 2000,
          padding: '0 16px',
          pointerEvents: 'auto'
        }}>
          <button 
            onClick={() => setView('home')} 
            style={{ 
              padding: 16, 
              borderRadius: 16, 
              border: 'none', 
              cursor: 'pointer',
              background: view === 'home' ? '#2563eb' : 'transparent',
              color: view === 'home' ? 'white' : 'rgb(100, 116, 139)',
              boxShadow: view === 'home' ? '0 10px 15px -3px rgba(59, 130, 246, 0.5)' : 'none'
            }}
          >
            <LayoutList size={26}/>
          </button>
          <button 
            onClick={() => setView('map')} 
            style={{ 
              padding: 16, 
              borderRadius: 16, 
              border: 'none', 
              cursor: 'pointer',
              background: view === 'map' ? '#2563eb' : 'transparent',
              color: view === 'map' ? 'white' : 'rgb(100, 116, 139)',
              boxShadow: view === 'map' ? '0 10px 15px -3px rgba(59, 130, 246, 0.5)' : 'none'
            }}
          >
            <MapIcon size={26}/>
          </button>
        </nav>
      </div>
    </div>
  );
}
