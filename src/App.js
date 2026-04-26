import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download, X, CheckCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

var supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

var ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];

var INITIAL_FORM = {
  title: '',
  city: '',
  localidad: '',
  address: '',
  time: '21:00',
  date: '',
  category: 'MUSICA',
  image_url: ''
};

var categoryEmojis = {
  MUSICA: '🎵',
  GASTRONOMIA: '🍽️',
  TAURINO: '🐂',
  'FIESTAS PATRONALES': '🎉',
  OTROS: '📌'
};

var darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
var lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

var redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -30],
  className: ''
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  var parts = String(dateStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  var eventDate = new Date(dateStr + 'T23:59:59');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
}

function getDaysLabel(dateStr) {
  var days = getDaysLeft(dateStr);
  if (days === null) return '';
  if (days === 0) return { text: 'HOY', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (days === 1) return { text: 'MAÑANA', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (days <= 3) return { text: 'EN ' + days + ' DÍAS', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (days <= 7) return { text: 'EN ' + days + ' DÍAS', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  return { text: 'EN ' + days + ' DÍAS', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
}

function Splash(props) {
  useEffect(function () {
    var t = setTimeout(function () {
      props.onDone();
    }, 1400);

    return function () {
      clearTimeout(t);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#020617',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 20
    }}>
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png"
        alt="Eventora"
        style={{ height: 50, width: 'auto' }}
      />
      <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>
        Cargando eventos...
      </p>
      <Loader2 className="animate-spin" size={24} color="#4f46e5" />
    </div>
  );
}

function MapResizer(props) {
  var map = useMap();
  var prevCenter = useRef(null);

  useEffect(function () {
    map.invalidateSize();

    if (props.center) {
      var isNew = !prevCenter.current ||
        prevCenter.current[0] !== props.center[0] ||
        prevCenter.current[1] !== props.center[1];

      if (isNew) {
        map.flyTo(props.center, 9, { animate: true, duration: 1.5 });
        prevCenter.current = props.center;
      }
    } else {
      map.setView([40.4167, -3.7037], 6);
      prevCenter.current = null;
    }
  }, [props.center, map]);

  return null;
}

function exportToCSV(events) {
  if (!events.length) return alert('No hay eventos para exportar.');

  var headers = ['Titulo', 'Ciudad', 'Localidad', 'Direccion', 'Fecha', 'Hora', 'Categoria', 'Estado', 'Lat', 'Lng'];

  var rows = events.map(function (e) {
    return [
      e.title || '',
      e.city || '',
      e.localidad || '',
      e.address || '',
      formatDate(e.date),
      e.time || '',
      e.category || '',
      e.status || '',
      e.lat || '',
      e.lng || ''
    ].map(function (x) {
      return '"' + String(x).replace(/"/g, '""') + '"';
    }).join(';');
  });

  var csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = 'eventora_eventos_' + new Date().toISOString().split('T')[0] + '.csv';
  link.click();

  URL.revokeObjectURL(link.href);
}

// --- NUEVO: Componente Toast para notificaciones ---
function ToastNotification(props) {
  if (!props.show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: props.type === 'success' ? '#22c55e' : '#ef4444',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      animation: 'slideDown 0.3s ease-out'
    }}>
      {props.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
      <span style={{ fontWeight: '900' }}>{props.message}</span>
    </div>
  );
}

export default function App() {
  var _splash = useState(true);
  var showSplash = _splash[0];
  var setShowSplash = _splash[1];

  var _events = useState([]);
  var events = _events[0];
  var setEvents = _events[1];

  var _favorites = useState(function () {
    try {
      var saved = localStorage.getItem('eventora_favs_v5');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  var favorites = _favorites[0];
  var setFavorites = _favorites[1];

  var _profile = useState(null);
  var profile = _profile[0];
  var setProfile = _profile[1];

  var _view = useState('home');
  var view = _view[0];
  var setView = _view[1];

  var _dark = useState(true);
  var isDark = _dark[0];
  var setIsDark = _dark[1];

  var _cat = useState('TODOS');
  var selectedCategory = _cat[0];
  var setSelectedCategory = _cat[1];

  var _selected = useState(null);
  var selectedEvent = _selected[0];
  var setSelectedEvent = _selected[1];

  var _mapCenter = useState(null);
  var mapCenter = _mapCenter[0];
  var setMapCenter = _mapCenter[1];

  var _generating = useState(false);
  var isGenerating = _generating[0];
  var setIsGenerating = _generating[1];

  var _submitting = useState(false);
  var isSubmitting = _submitting[0];
  var setIsSubmitting = _submitting[1];

  var _form = useState(INITIAL_FORM);
  var form = _form[0];
  var setForm = _form[1];

  var _email = useState('');
  var userEmail = _email[0];
  var setUserEmail = _email[1];

  var _pendingSelected = useState(null);
  var selectedPendingEvent = _pendingSelected[0];
  var setSelectedPendingEvent = _pendingSelected[1];

  var _adminTab = useState('pending');
  var adminTab = _adminTab[0];
  var setAdminTab = _adminTab[1];

  var _search = useState('');
  var searchQuery = _search[0];
  var setSearchQuery = _search[1];

  var _dateFilter = useState('all');
  var dateFilter = _dateFilter[0];
  var setDateFilter = _dateFilter[1];

  var _animHeart = useState(null);
  var animHeart = _animHeart[0];
  var setAnimHeart = _animHeart[1];

  // NUEVO: Estado para el Toast
  var _toast = useState({ show: false, message: '', type: 'success' });
  var toast = _toast[0];
  var setToast = _toast[1];

  var listRef = useRef(null);

  // NUEVO: Calcular contador de pendientes
  var hasAdmin = profile && profile.? true : false;
  var pendingEventsCount = hasAdmin ? events.filter(function (e) { return e.status === 'pending'; }).length : 0;

  useEffect(function () {
    fetchEvents();
  }, []);

  useEffect(function () {
    localStorage.setItem('eventora_favs_v5', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(function () {
    function isAdminUser(user) {
      return !!(user && user.email && ADMIN_EMAILS.indexOf(user.email) !== -1);
    }

    function handleSession(session) {
      var user = session && session.user;
      setUserEmail(user ? user.email : '');
      setProfile(isAdminUser(user) ? { role: 'admin' } : null);
      fetchEvents();
    }

    supabase.auth.getSession().then(function (res) {
      handleSession(res.data && res.data.session);
    });

    var sub = supabase.auth.onAuthStateChange(function (event, session) {
      handleSession(session);
    });

    return function () {
      if (sub && sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe();
      }
    };
  }, []);

  function fetchEvents() {
    supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .then(function (res) {
        if (res.error) {
          console.error('❌ Error cargando eventos:', res.error);
          return;
        }

        var data = res.data || [];
        setEvents(data);

        var validIds = data.map(function (e) { return e.id; });

        setFavorites(function (prev) {
          return prev.filter(function (id) {
            return validIds.indexOf(id) !== -1;
          });
        });
      });
  }

  function handleInputChange(e) {
    var name = e.target.name;
    var value = e.target.value;
    var upperFields = ['title', 'city', 'localidad'];

    if (upperFields.indexOf(name) !== -1) {
      value = value.toUpperCase();
    }

    setForm(function (prev) {
      var next = Object.assign({}, prev);
      next[name] = value;
      return next;
    });
  }

  function toggleFavorite(id) {
    setFavorites(function (prev) {
      if (prev.indexOf(id) !== -1) {
        return prev.filter(function (x) { return x !== id; });
      }
      return prev.concat([id]);
    });

    setAnimHeart(id);

    setTimeout(function () {
      setAnimHeart(null);
    }, 700);
  }

  function generateAIImage() {
    if (!form.title) return alert('Escribe un título primero.');

    setIsGenerating(true);

    var seed = Math.floor(Math.random() * 999999);
    var url =
      'https://image.pollinations.ai/prompt/' +
      encodeURIComponent('professional event photography ' + form.title) +
      '?width=800&height=600&seed=' +
      seed +
      '&nologo=true&t=' +
      Date.now();

    setForm(function (prev) {
      return Object.assign({}, prev, { image_url: url });
    });

    setTimeout(function () {
      setIsGenerating(false);
    }, 1200);
  }

  async function handleGalleryUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type || file.type.indexOf('image/') !== 0) {
      alert('Selecciona una imagen válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    setIsGenerating(true);

    try {
      var ext = file.name.split('.').pop() || 'jpg';
      var safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
      var path = 'uploads/' + safeName;

      var upload = await supabase.storage
        .from('event-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (upload.error) {
        console.error('❌ Error subiendo imagen:', upload.error);
        alert('Error subiendo imagen:\n\n' + upload.error.message);
        return;
      }

      var publicUrlData = supabase.storage
        .from('event-images')
        .getPublicUrl(path);

      var publicUrl = publicUrlData.data.publicUrl;

      setForm(function (prev) {
        return Object.assign({}, prev, { image_url: publicUrl });
      });

      alert('✅ Imagen subida correctamente.');
    } catch (err) {
      console.error('❌ Error galería:', err);
      alert('Error subiendo imagen:\n\n' + (err.message || JSON.stringify(err)));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCitySearch(city) {
    if (city === 'ESPAÑA') {
      setMapCenter(null);
      return;
    }

    fetch(
      'https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' +
      encodeURIComponent(city + ', España')
    )
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data[0]) {
          setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  function geocodeAddress(address, localidad, city) {
    var fullAddress = [address, localidad, city, 'España']
      .filter(Boolean)
      .join(', ');

    console.log('🌍 Geocodificando:', fullAddress);

    return fetch(
      'https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' +
      encodeURIComponent(fullAddress)
    )
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data[0]) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }

        return fetch(
          'https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q=' +
          encodeURIComponent(city + ', España')
        )
          .then(function (r2) { return r2.json(); })
          .then(function (data2) {
            if (data2 && data2[0]) {
              return {
                lat: parseFloat(data2[0].lat),
                lng: parseFloat(data2[0].lon)
              };
            }

            return { lat: null, lng: null };
          });
      })
      .catch(function (err) {
        console.error('❌ Error geocoding:', err);
        return { lat: null, lng: null };
      });
  }

  function cleanImageUrl(url) {
    if (!url) return null;

    if (String(url).indexOf('data:image') === 0) {
      return null;
    }

    if (String(url).length > 1900) {
      return null;
    }

    return url;
  }

  function showToast(message, type) {
    setToast({ show: true, message: message, type: type });
    setTimeout(function () {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  }

  function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) {
      return alert('❌ Faltan campos:\n\n- Título\n- Ciudad\n- Fecha\n- Dirección');
    }

    setIsSubmitting(true);

    console.log('📤 Enviando evento...', form);

    geocodeAddress(form.address, form.localidad, form.city)
      .then(function (coords) {
        var eventToInsert = {
          title: form.title.trim(),
          category: form.category,
          city: form.city.trim(),
          localidad: form.localidad ? form.localidad.trim() : null,
          address: form.address.trim(),
          date: form.date,
          time: form.time || '21:00',
          image_url: cleanImageUrl(form.image_url),
          status: 'pending',
          lat: coords.lat,
          lng: coords.lng
        };

        console.log('📝 Evento que se va a guardar:', eventToInsert);

        return supabase
          .from('events')
          .insert([eventToInsert]);
      })
      .then(function (res) {
        if (res.error) {
          console.error('❌ Error Supabase completo:', res.error);
          showToast('❌ Error al enviar: ' + (res.error.message || 'Error desconocido'), 'error');
          return;
        }

        showToast('✅ Evento enviado a revisión correctamente', 'success');

        setForm(INITIAL_FORM);
        setView('home');
        fetchEvents();
      })
      .catch(function (err) {
        console.error('❌ Error completo:', err);
        showToast('❌ Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
      })
      .finally(function () {
        setIsSubmitting(false);
      });
  }

  function handleApproveEvent(id) {
    supabase
      .from('events')
      .update({ status: 'approved' })
      .eq('id', id)
      .then(function (res) {
        if (res.error) {
          console.error('❌ Error aprobando:', res.error);
          alert('Error aprobando evento:\n\n' + res.error.message);
          return;
        }

        setSelectedPendingEvent(null);
        fetchEvents();
        showToast('✅ Evento aprobado', 'success');
      });
  }

  function handleRejectEvent(id) {
    supabase
      .from('events')
      .update({ status: 'rejected' })
      .eq('id', id)
      .then(function (res) {
        if (res.error) {
          console.error('❌ Error rechazando:', res.error);
          alert('Error rechazando evento:\n\n' + res.error.message);
          return;
        }

        setSelectedPendingEvent(null);
        fetchEvents();
        showToast('!o rechazado', 'error');
      });
  }

  function handleDeleteEvent(id) {
    if (!window.confirm('¿Seguro que quieres borrar este evento?')) return;

    supabase
      .from('events')
      .delete()
      .eq('id', id)
      .then(function (res) {
        if (res.error) {
          console.error('❌ Error borrando:', res.error);
          alert('Error borrando evento:\n\n' + res.error.message);
          return;
        }

        setSelectedPendingEvent(null);
        fetchEvents();
        showToast('🗑️ Evento borrado', 'error');
      });
  }

  function shareEvent(ev) {
    var text =
      'EVENTO: ' +
      ev.title +
      ' | ' +
      ev.city +
      ' | ' +
      formatDate(ev.date) +
      ' | ' +
      ev.address +
      ', ' +
      (ev.localidad || '');

    if (navigator.share) {
      navigator.share({
        title: ev.title,
        text: text
      });
    } else {
      navigator.clipboard.writeText(text).then(function () {
        alert('Texto copiado al portapapeles');
      });
    }
  }

  // NUEVO: Función de Logout
  function handleLogout() {
    supabase.auth.signOut().then(function () {
      setUserEmail('');
      setProfile(null);
      fetchEvents();
      setView('home');
    });
  }

  function handleCategoryChange(cat) {
    setSelectedCategory(cat);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  function addToGoogleCalendar(ev) {
    var day = String(ev.date).replace(/-/g, '');
    var parts = String(ev.time || '12:00').split(':');
    var hour = parts[0] || '12';
    var min = parts[1] || '00';

    var startTime = day + 'T' + hour + min + '00';
    var endHour = parseInt(hour, 10) + 2;
    if (endHour >= 24) endHour = 23;

    var endTime = day + 'T' + String(endHour).padStart(2, '0') + min + '00';

    var details = ev.title + '\n' + ev.address + ', ' + (ev.localidad || '') + ' - ' + ev.city;

    var url =
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
      encodeURIComponent(ev.title) +
      '&dates=' +
      startTime +
      '/' +
      endTime +
      '&details=' +
      encodeURIComponent(details) +
      '&location=' +
      encodeURIComponent(ev.address + ', ' + (ev.localidad || '') + ', ' + ev.city);

    window.open(url, '_blank');
  }

  var today = new Date().toISOString().split('T')[0];

  var publicEvents = events.filter(function (e) {
    return e.status === 'approved' && e.date >= today;
  });

  var searchedEvents = searchQuery
    ? publicEvents.filter(function (e) {
        return (
          String(e.title || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 ||
          String(e.city || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1
        );
      })
    : publicEvents;

  var categoryEvents = searchedEvents.filter(function (e) {
    return selectedCategory === 'TODOS' || e.category === selectedCategory;
  });

  var filteredEvents = categoryEvents.filter(function (e) {
    if (dateFilter === 'today') return e.date === today;

    if (dateFilter === 'week') {
      var eventDate = new Date(e.date);
      var now = new Date();
      var weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      return eventDate >= now && eventDate <= weekEnd;
    }

    return true;
  });

  var favoriteEvents = publicEvents.filter(function (e) {
    return favorites.indexOf(e.id) !== -1;
  });

  // NUEVO: Filtrado de pendientes solo para admin
  var pendingEvents = hasAdmin
    ? events.filter(function (e) { return e.status === 'pending'; })
    : [];

  var approvedEvents = hasAdmin
    ? events.filter(function (e) { return e.status === 'approved'; })
    : [];

  var citiesList = [];

  publicEvents.forEach(function (e) {
    if (citiesList.indexOf(e.city) === -1) citiesList.push(e.city);
  });

  var featuredEvent = filteredEvents.length ? filteredEvents[0] : null;
  var restEvents = filteredEvents.length ? filteredEvents.slice(1) : [];

  var INPUT_STYLE = {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: 'none',
    background: 'rgba(128,128,128,0.1)',
    color: 'inherit',
    fontWeight: 700
  };

  if (showSplash) {
    return <Splash onDone={function () { setShowSplash(false); }} />;
  }

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* NUEVO: Toast Notification */}
      <ToastNotification show={toast.show} message={toast.message} type={toast.type} />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color .25s, color .25s; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; }
        .dark-theme { background:#020617; color:white; }
        .light-theme { background:#f8fafc; color:#0f172a; }
        .card-dark { background:#0f172a; border:1px solid #1e293b; color:white; }
        .card-light { background:white; border:1px solid #e2e8f0; color:#0f172a; box-shadow:0 4px 12px rgba(0,0,0,.05); }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .leaflet-container img { max-width:none!important; max-height:none!important; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
        @keyframes admin-pulse { 0%{transform:scale(1);color:#818cf8;} 50%{transform:scale(1.2);color:#ef4444;} 100%{transform:scale(1);color:#818cf8;} }
        .pulse-admin { animation:admin-pulse 1.4s infinite; }
        @keyframes heartPop { 0%{transform:scale(1);} 30%{transform:scale(1.5);} 60%{transform:scale(.9);} 100%{transform:scale(1);} }
        .heart-pop { animation:heartPop .6s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>

      <nav style={{
        height: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px',
        zIndex: 2000,
        borderBottom: '1px solid rgba(128,128,128,.2)',
        background: isDark ? '#0f172a' : '#fff',
        flexShrink: 0
      }}>
        <div
          style={{ cursor: 'pointer' }}
          onClick={function () {
            setView('home');
            setSelectedEvent(null);
            setSelectedPendingEvent(null);
            setSearchQuery('');
          }}
        >
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png"
            alt="Eventora"
            style={{ height: 18, width: 'auto' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* NUEVO: Botón Admin con contador */}
          {hasAdmin && (
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={function () {
              setView('admin');
              setSelectedEvent(null);
              setSelectedPendingEvent(null);
              setAdminTab('pending');
              fetchEvents();
            }}>
              <ShieldCheck
                size={20}
                className={pendingEventsCount > 0 ? 'pulse-admin' : ''}
                style={{ color: '#6366f1', marginRight: 4 }}
              />
              {pendingEventsCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 900,
                  borderRadius: '50%',
                  padding: '2px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                  border: '2px solid ' + (isDark ? '#0f172a' : '#fff')
                }}>
                  {{pendingEventsCount}
                </span>
              )}
            </div>
          )}

          {{!userEmail && (
            <button onClick={handleLogin} style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 8,
              fontWeight: 900,
              cursor: 'pointer'
            }}>
              LOGIN
            </button>
          )}

          {userEmail && (
            <button onClick={handleLogout} style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 8,
              fontWeight: 900,
              cursor: 'pointer'
            }}>
              SALIR
            </button>
          )}

          <button
            onClick={function () { setIsDark(!isDark); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
          >
            {isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}
          </button>

          <Sparkles
            size={18}
            color="#6366f1"
            style={{ cursor: 'pointer' }}
            onClick={function () { setView('profile'); }}
          />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {view === 'map' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <div style={{
              position: 'absolute',
              top: 15,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              width: '85%',
              maxWidth: 300
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 15,
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,.2)'
              }}>
                <Search size={16} color="#6366f1" />

                <select
                  onChange={function (e) { handleCitySearch(e.target.value); }}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: 'none',
                    outline: 'none',
                    fontWeight: 900,
                    fontSize: 11,
                    color: '#0f172a',
                    background: 'transparent'
                  }}
                >
                  <option value="ESPAÑA">BUSCAR CIUDAD...</option>

                  {citiesList.map(function (c) {
                    return <option key={c} value={c}>{c}</option>;
                  })}
                </select>
              </div>
            </div>

            <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <MapResizer center={mapCenter} />

              <TileLayer
                url={isDark ? darkTileUrl : lightTileUrl}
                attribution="Google Maps"
                maxZoom={20}
