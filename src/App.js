import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck,
  Loader2, ArrowLeft, Search, Share2, Star, X, CheckCircle, Info, RotateCcw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

var FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1000';

var darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
var lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

var redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -30],
  className: ''
});

// -------------------- UTILIDADES --------------------

function formatDate(dateStr) {
  if (!dateStr) return '';
  var parts = String(dateStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

function getLocalDateString(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getDaysLabel(dateStr) {
  if (!dateStr) return null;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var target = new Date(dateStr + 'T23:59:59');
  var days = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (isNaN(days)) return null;

  if (days < 0) {
    return {
      text: 'FINALIZADO',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.15)'
    };
  }

  if (days === 0) {
    return {
      text: 'HOY',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)'
    };
  }

  if (days === 1) {
    return {
      text: 'MAÑANA',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.15)'
    };
  }

  if (days <= 3) {
    return {
      text: 'EN ' + days + ' DÍAS',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)'
    };
  }

  if (days <= 7) {
    return {
      text: 'EN ' + days + ' DÍAS',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.15)'
    };
  }

  return {
    text: 'EN ' + days + ' DÍAS',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.15)'
  };
}

function getEventImage(ev) {
  return ev && ev.image_url ? ev.image_url : FALLBACK_IMAGE;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function isValidCoord(value) {
  var n = Number(value);
  return !Number.isNaN(n) && Number.isFinite(n);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise(function (resolve, reject) {
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      var ok = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (ok) resolve();
      else reject(new Error('No se pudo copiar'));
    } catch (e) {
      reject(e);
    }
  });
}

async function geocodeAddress(address, localidad, city) {
  var query = [address, localidad, city, 'España'].filter(Boolean).join(', ');

  if (!query.trim()) {
    return { lat: null, lng: null };
  }

  try {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query);
    var res = await fetch(url);
    var data = await res.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.log('No se pudo geocodificar:', e);
  }

  return { lat: null, lng: null };
}

// -------------------- COMPONENTES --------------------

function Splash({ onDone }) {
  useEffect(function () {
    var t = setTimeout(function () {
      onDone();
    }, 1000);

    return function () {
      clearTimeout(t);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20
      }}
    >
      <img
        src="/icon-192.png"
        alt="Eventora"
        style={{
          height: 80,
          width: 80,
          borderRadius: 20
        }}
      />

      <p
        style={{
          color: '#6366f1',
          fontSize: 11,
          fontWeight: 700
        }}
      >
        Cargando...
      </p>

      <Loader2 className="animate-spin" size={24} />
    </div>
  );
}

function Toast(props) {
  if (!props.show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: props.type === 'success' ? '#22c55e' : '#ef4444',
        color: 'white',
        padding: '12px 20px',
        borderRadius: 999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        animation: 'slideDown 0.3s ease-out',
        fontWeight: 900,
        fontSize: 12,
        maxWidth: '90%',
        textAlign: 'center'
      }}
    >
      {props.message}
    </div>
  );
}

function EventCard({
  ev,
  featured,
  isDark,
  favorites,
  animHeart,
  toggleFavorite,
  selectEventById
}) {
  var dl = getDaysLabel(ev.date);

  return (
    <div
      className={isDark ? 'card-dark' : 'card-light'}
      style={{
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 15,
        border: featured ? '2px solid #22c55e' : undefined,
        position: 'relative'
      }}
    >
      <div style={{ position: 'relative' }}>
        {featured && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 5,
              background: '#22c55e',
              color: 'white',
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Star size={12} fill="white" />
            DESTACADO
          </div>
        )}

        {/* AQUÍ YA NO VA LA ETIQUETA DE DÍAS. LA FOTO QUEDA LIMPIA. */}
        <div
          style={{
            position: 'relative',
            height: featured ? 200 : 160,
            background: '#020617'
          }}
        >
          <img
            src={getEventImage(ev)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
            alt={ev.title || 'Evento'}
          />

          <button
            type="button"
            onClick={function () {
              toggleFavorite(ev.id);
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              padding: featured ? 8 : 7,
              background: 'white',
              borderRadius: '50%',
              border: 'none',
              color: '#ef4444',
              display: 'flex',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.25)'
            }}
            aria-label="Favorito"
          >
            <Heart
              size={featured ? 18 : 16}
              className={animHeart === ev.id ? 'heart-pop' : ''}
              fill={favorites.indexOf(ev.id) !== -1 ? 'red' : 'none'}
            />
          </button>
        </div>

        <div
          style={{
            padding: 15,
            textAlign: 'center'
          }}
        >
          <p
            style={{
              fontSize: 9,
              color: '#6366f1',
              fontWeight: 800,
              letterSpacing: 1,
              marginBottom: 5
            }}
          >
            {categoryEmojis[ev.category] || '📌'} {ev.city} | {formatDate(ev.date)}
          </p>

          {/* ETIQUETA DE DÍAS MOVIDA FUERA DE LA FOTO */}
          {dl && (
            <div
              style={{
                display: 'inline-block',
                background: dl.bg,
                color: dl.color,
                padding: '3px 10px',
                borderRadius: 8,
                fontSize: 9,
                fontWeight: 900,
                marginBottom: 8
              }}
            >
              {dl.text}
            </div>
          )}

          <h3
            style={{
              fontWeight: 900,
              fontSize: featured ? 17 : 15,
              marginBottom: 10,
              lineHeight: 1.2
            }}
          >
            {ev.title}
          </h3>

          <button
            type="button"
            onClick={function () {
              selectEventById(ev.id);
            }}
            style={{
              width: '100%',
              padding: featured ? 12 : 11,
              borderRadius: 14,
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              fontWeight: 900,
              fontSize: featured ? 11 : 10,
              cursor: 'pointer'
            }}
          >
            {featured ? 'VER DETALLES' : 'DETALLES'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoZoom({ src, alt, onBack, onInfo, onShare }) {
  var _scale = useState(1);
  var scale = _scale[0];
  var setScale = _scale[1];

  var _translate = useState({ x: 0, y: 0 });
  var translate = _translate[0];
  var setTranslate = _translate[1];

  var pointersRef = useRef({});
  var scaleRef = useRef(1);
  var translateRef = useRef({ x: 0, y: 0 });

  var gestureRef = useRef({
    startDistance: 1,
    startScale: 1,
    startMid: { x: 0, y: 0 },
    startPointer: { x: 0, y: 0 },
    startTranslate: { x: 0, y: 0 }
  });

  useEffect(function () {
    pointersRef.current = {};
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [src]);

  function updateScale(nextScale) {
    scaleRef.current = nextScale;
    setScale(nextScale);
  }

  function updateTranslate(nextTranslate) {
    translateRef.current = nextTranslate;
    setTranslate(nextTranslate);
  }

  function resetZoom() {
    updateScale(1);
    updateTranslate({ x: 0, y: 0 });
    pointersRef.current = {};
  }

  function getPoints() {
    return Object.keys(pointersRef.current).map(function (key) {
      return pointersRef.current[key];
    });
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    pointersRef.current[e.pointerId] = {
      x: e.clientX,
      y: e.clientY
    };

    var pts = getPoints();

    if (pts.length === 1) {
      gestureRef.current.startPointer = {
        x: e.clientX,
        y: e.clientY
      };

      gestureRef.current.startTranslate = {
        x: translateRef.current.x,
        y: translateRef.current.y
      };
    }

    if (pts.length >= 2) {
      var a = pts[0];
      var b = pts[1];

      gestureRef.current.startDistance = getDistance(a, b) || 1;
      gestureRef.current.startScale = scaleRef.current;
      gestureRef.current.startMid = getMidpoint(a, b);
      gestureRef.current.startTranslate = {
        x: translateRef.current.x,
        y: translateRef.current.y
      };
    }
  }

  function handlePointerMove(e) {
    if (!pointersRef.current[e.pointerId]) return;

    e.preventDefault();

    pointersRef.current[e.pointerId] = {
      x: e.clientX,
      y: e.clientY
    };

    var pts = getPoints();

    // PINCH-TO-ZOOM CON DOS DEDOS
    if (pts.length >= 2) {
      var a = pts[0];
      var b = pts[1];

      var currentDistance = getDistance(a, b) || 1;
      var currentMid = getMidpoint(a, b);

      var nextScale = clamp(
        gestureRef.current.startScale * (currentDistance / gestureRef.current.startDistance),
        1,
        5
      );

      var dx = currentMid.x - gestureRef.current.startMid.x;
      var dy = currentMid.y - gestureRef.current.startMid.y;

      updateScale(nextScale);

      if (nextScale <= 1.01) {
        updateTranslate({ x: 0, y: 0 });
      } else {
        updateTranslate({
          x: gestureRef.current.startTranslate.x + dx,
          y: gestureRef.current.startTranslate.y + dy
        });
      }

      return;
    }

    // ARRASTRAR FOTO CUANDO YA ESTÁ AMPLIADA
    if (pts.length === 1 && scaleRef.current > 1) {
      var moveDx = e.clientX - gestureRef.current.startPointer.x;
      var moveDy = e.clientY - gestureRef.current.startPointer.y;

      updateTranslate({
        x: gestureRef.current.startTranslate.x + moveDx,
        y: gestureRef.current.startTranslate.y + moveDy
      });
    }
  }

  function handlePointerUp(e) {
    delete pointersRef.current[e.pointerId];

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    var pts = getPoints();

    if (pts.length === 1) {
      gestureRef.current.startPointer = {
        x: pts[0].x,
        y: pts[0].y
      };

      gestureRef.current.startTranslate = {
        x: translateRef.current.x,
        y: translateRef.current.y
      };
    }

    if (scaleRef.current <= 1.01) {
      updateScale(1);
      updateTranslate({ x: 0, y: 0 });
    }
  }

  function handleWheel(e) {
    e.preventDefault();

    var nextScale = clamp(scaleRef.current - e.deltaY * 0.0018, 1, 5);

    updateScale(nextScale);

    if (nextScale <= 1.01) {
      updateTranslate({ x: 0, y: 0 });
    }
  }

  function handleDoubleClick(e) {
    e.preventDefault();

    if (scaleRef.current > 1) {
      resetZoom();
    } else {
      updateScale(2.4);
      updateTranslate({ x: 0, y: 0 });
    }
  }

  var controlButtonStyle = {
    border: 'none',
    borderRadius: 999,
    padding: '10px 13px',
    background: 'rgba(15,23,42,0.82)',
    color: 'white',
    fontSize: 11,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        overflow: 'hidden'
      }}
    >
      <div
        className="zoom-touch-area"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none',
          cursor: scale > 1 ? 'grab' : 'zoom-in'
        }}
      >
        <img
          src={src}
          alt={alt || 'Foto del evento'}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform:
              'translate3d(' +
              translate.x +
              'px,' +
              translate.y +
              'px,0) scale(' +
              scale +
              ')',
            transformOrigin: 'center center',
            transition: getPoints().length > 0 ? 'none' : 'transform 0.12s ease-out',
            willChange: 'transform',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          pointerEvents: 'none'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            ...controlButtonStyle,
            pointerEvents: 'auto'
          }}
        >
          <ArrowLeft size={15} />
          EVENTOS
        </button>

        <div
          style={{
            background: 'rgba(15,23,42,0.82)',
            color: 'white',
            borderRadius: 999,
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 900,
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto'
          }}
        >
          {Math.round(scale * 100)}%
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 18,
          zIndex: 20,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          pointerEvents: 'none'
        }}
      >
        <button
          type="button"
          onClick={onInfo}
          style={{
            ...controlButtonStyle,
            pointerEvents: 'auto'
          }}
        >
          <Info size={15} />
          INFO
        </button>

        <button
          type="button"
          onClick={resetZoom}
          style={{
            ...controlButtonStyle,
            pointerEvents: 'auto'
          }}
        >
          <RotateCcw size={15} />
          RESET
        </button>

        <button
          type="button"
          onClick={onShare}
          style={{
            ...controlButtonStyle,
            background: 'rgba(79,70,229,0.92)',
            pointerEvents: 'auto'
          }}
        >
          <Share2 size={15} />
          COPIAR LINK
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11,
          fontWeight: 800,
          textAlign: 'center',
          pointerEvents: 'none',
          opacity: scale === 1 ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}
      >
        Pellizca con dos dedos para ampliar
        <br />
        Doble toque para zoom rápido
      </div>
    </div>
  );
}

// -------------------- APP PRINCIPAL --------------------

export default function App() {
  var _splash = useState(true);
  var showSplash = _splash[0];
  var setShowSplash = _splash[1];

  var _events = useState([]);
  var events = _events[0];
  var setEvents = _events[1];

  var _favorites = useState(function () {
    try {
      return JSON.parse(localStorage.getItem('eventora_favs_v5')) || [];
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

  var _selectedId = useState(null);
  var selectedEventId = _selectedId[0];
  var setSelectedEventId = _selectedId[1];

  var _imageZoomMode = useState(false);
  var imageZoomMode = _imageZoomMode[0];
  var setImageZoomMode = _imageZoomMode[1];

  var _submitting = useState(false);
  var isSubmitting = _submitting[0];
  var setIsSubmitting = _submitting[1];

  var _form = useState(INITIAL_FORM);
  var form = _form[0];
  var setForm = _form[1];

  var _email = useState('');
  var userEmail = _email[0];
  var setUserEmail = _email[1];

  var _search = useState('');
  var searchQuery = _search[0];
  var setSearchQuery = _search[1];

  var _animHeart = useState(null);
  var animHeart = _animHeart[0];
  var setAnimHeart = _animHeart[1];

  var _toast = useState({
    show: false,
    message: '',
    type: 'success'
  });
  var toast = _toast[0];
  var setToast = _toast[1];

  var _cityFilter = useState('TODAS');
  var cityFilter = _cityFilter[0];
  var setCityFilter = _cityFilter[1];

  var listRef = useRef(null);

  var selectedEvent = events.find(function (e) {
    return String(e.id) === String(selectedEventId);
  });

  var selectedDaysLabel = selectedEvent ? getDaysLabel(selectedEvent.date) : null;

  var hasAdmin = !!(
    profile &&
    profile.email &&
    ADMIN_EMAILS.indexOf(profile.email) !== -1
  );

  var pendingEventsCount = hasAdmin
    ? events.filter(function (e) {
        return e.status === 'pending';
      }).length
    : 0;

  var applyEvents = useCallback(function (data) {
    var sorted = (data || []).slice().sort(function (a, b) {
      return new Date(a.date) - new Date(b.date);
    });

    setEvents(sorted);

    var validIds = sorted.map(function (e) {
      return e.id;
    });

    setFavorites(function (prev) {
      return prev.filter(function (id) {
        return validIds.indexOf(id) !== -1;
      });
    });
  }, []);

  var fetchEvents = useCallback(function () {
    var cached = localStorage.getItem('eventora_cache_events_v1');

    if (cached) {
      try {
        applyEvents(JSON.parse(cached));
      } catch (e) {}
    }

    supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .then(function (r) {
        if (r.error) {
          console.log('Error cargando eventos:', r.error);
          return;
        }

        var data = r.data || [];
        applyEvents(data);

        try {
          localStorage.setItem('eventora_cache_events_v1', JSON.stringify(data));
        } catch (e) {}
      });
  }, [applyEvents]);

  var finishSplash = useCallback(function () {
    setShowSplash(false);
  }, []);

  useEffect(function () {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(function () {
    localStorage.setItem('eventora_favs_v5', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(function () {
    function readRoute() {
      var path = window.location.pathname || '/';
      var parts = path.split('/').filter(Boolean);

      if (parts[0] === 'evento' && parts[1]) {
        setSelectedEventId(parts[1]);
        setView('detail');
        setImageZoomMode(true);
      } else {
        setView(function (current) {
          return current === 'detail' ? 'home' : current;
        });
        setSelectedEventId(null);
        setImageZoomMode(false);
      }
    }

    readRoute();

    window.addEventListener('popstate', readRoute);

    return function () {
      window.removeEventListener('popstate', readRoute);
    };
  }, []);

  useEffect(function () {
    function isAdminUser(user) {
      return !!(user && user.email && ADMIN_EMAILS.indexOf(user.email) !== -1);
    }

    function handleSession(session) {
      var u = session && session.user;

      setUserEmail(u ? u.email : '');

      if (isAdminUser(u)) {
        setProfile({
          role: 'admin',
          email: u.email
        });
      } else {
        setProfile(null);
      }

      fetchEvents();
    }

    supabase.auth.getSession().then(function (r) {
      handleSession(r.data && r.data.session);
    });

    var sub = supabase.auth.onAuthStateChange(function (event, session) {
      handleSession(session);
    });

    return function () {
      if (sub && sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe();
      }
    };
  }, [fetchEvents]);

  function showToast(message, type) {
    setToast({
      show: true,
      message: message,
      type: type || 'success'
    });

    setTimeout(function () {
      setToast({
        show: false,
        message: '',
        type: 'success'
      });
    }, 3000);
  }

  function goHome() {
    setView('home');
    setSelectedEventId(null);
    setImageZoomMode(false);

    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  }

  function handleInputChange(e) {
    var name = e.target.name;
    var value = e.target.value;

    if (['title', 'city', 'localidad'].indexOf(name) !== -1) {
      value = value.toUpperCase();
    }

    setForm(function (prev) {
      return {
        ...prev,
        [name]: value
      };
    });
  }

  function toggleFavorite(id) {
    setFavorites(function (prev) {
      if (prev.indexOf(id) !== -1) {
        return prev.filter(function (x) {
          return x !== id;
        });
      }

      return prev.concat([id]);
    });

    setAnimHeart(id);

    setTimeout(function () {
      setAnimHeart(null);
    }, 700);
  }

  async function handleSubmitEvent(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!form.title || !form.date || !form.city || !form.address) {
      showToast('Faltan campos obligatorios', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      var coords = await geocodeAddress(form.address, form.localidad, form.city);

      var payload = {
        ...form,
        status: 'pending',
        lat: coords.lat,
        lng: coords.lng
      };

      var r = await supabase.from('events').insert([payload]);

      if (r.error) {
        throw r.error;
      }

      showToast('Evento enviado para revisión', 'success');
      setForm(INITIAL_FORM);
      goHome();
      fetchEvents();
    } catch (err) {
      console.log(err);
      showToast('Error al enviar el evento', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectEventById(id) {
    setSelectedEventId(id);
    setView('detail');
    setImageZoomMode(true);
    window.history.pushState({}, '', '/evento/' + id);
  }

  function shareRealLink(ev) {
    if (!ev) return;

    var realLink = window.location.origin + '/evento/' + ev.id;

    copyText(realLink)
      .then(function () {
        showToast('Enlace copiado', 'success');
      })
      .catch(function () {
        showToast('No se pudo copiar el enlace', 'error');
      });
  }

  function handleApproveEvent(id) {
    supabase
      .from('events')
      .update({ status: 'approved' })
      .eq('id', id)
      .then(function (r) {
        if (r.error) {
          showToast('Error al aprobar', 'error');
          return;
        }

        showToast('Evento aprobado', 'success');
        fetchEvents();
      });
  }

  function handleRejectEvent(id) {
    supabase
      .from('events')
      .update({ status: 'rejected' })
      .eq('id', id)
      .then(function (r) {
        if (r.error) {
          showToast('Error al rechazar', 'error');
          return;
        }

        showToast('Evento rechazado', 'success');
        fetchEvents();
      });
  }

  function handleDeleteEvent(id) {
    var ok = window.confirm('¿Seguro que quieres eliminar este evento?');

    if (!ok) return;

    supabase
      .from('events')
      .delete()
      .eq('id', id)
      .then(function (r) {
        if (r.error) {
          showToast('Error al eliminar', 'error');
          return;
        }

        showToast('Evento eliminado', 'success');
        fetchEvents();
      });
  }

  function handleLogin() {
    var email = window.prompt('Email de administrador:');

    if (!email) return;

    supabase.auth.signInWithOtp({ email: email.trim() }).then(function (r) {
      if (r.error) {
        showToast('Error enviando email', 'error');
        return;
      }

      showToast('Revisa tu email para entrar', 'success');
    });
  }

  function handleLogout() {
    supabase.auth.signOut().then(function () {
      setUserEmail('');
      setProfile(null);
      goHome();
      showToast('Sesión cerrada', 'success');
    });
  }

  var todayIso = getLocalDateString(new Date());

  var publicEvents = events.filter(function (e) {
    return e.status === 'approved' && e.date && e.date >= todayIso;
  });

  var filteredEvents = publicEvents.filter(function (e) {
    if (selectedCategory !== 'TODOS' && e.category !== selectedCategory) {
      return false;
    }

    if (cityFilter !== 'TODAS' && e.city !== cityFilter) {
      return false;
    }

    if (searchQuery) {
      var haystack = normalizeText([
        e.title,
        e.city,
        e.localidad,
        e.address,
        e.category
      ].join(' '));

      if (haystack.indexOf(normalizeText(searchQuery)) === -1) {
        return false;
      }
    }

    return true;
  });

  var citiesList = Array.from(
    new Set(
      publicEvents
        .map(function (e) {
          return e.city;
        })
        .filter(Boolean)
    )
  ).sort();

  var featuredEvent =
    filteredEvents.find(function (e) {
      return e.featured === true || e.featured === 'true';
    }) || filteredEvents[0];

  var restEvents = filteredEvents.filter(function (e) {
    return !(featuredEvent && e.id === featuredEvent.id);
  });

  var pendingEvents = events.filter(function (e) {
    return e.status === 'pending';
  });

  var approvedEvents = events.filter(function (e) {
    return e.status === 'approved';
  });

  var mapEvents = publicEvents.filter(function (e) {
    return isValidCoord(e.lat) && isValidCoord(e.lng);
  });

  var mapCenter =
    mapEvents.length > 0
      ? [Number(mapEvents[0].lat), Number(mapEvents[0].lng)]
      : [40.4168, -3.7038];

  var INPUT_STYLE = {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: isDark ? '1px solid #1e293b' : '1px solid #cbd5e1',
    background: isDark ? '#0f172a' : '#ffffff',
    color: 'inherit',
    fontWeight: 700,
    outline: 'none'
  };

  if (showSplash) {
    return <Splash onDone={finishSplash} />;
  }

  return (
    <div
      className={isDark ? 'dark-theme' : 'light-theme'}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button, input, select, textarea {
          font-family: inherit;
        }

        .dark-theme {
          background: #020617;
          color: white;
        }

        .light-theme {
          background: #f8fafc;
          color: #0f172a;
        }

        .card-dark {
          background: #0f172a;
          border: 1px solid #1e293b;
          color: white;
        }

        .card-light {
          background: white;
          border: 1px solid #e2e8f0;
          color: #0f172a;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .leaflet-container img {
          max-width: none !important;
        }

        .zoom-touch-area {
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes heartPop {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.5);
          }
          60% {
            transform: scale(.9);
          }
          100% {
            transform: scale(1);
          }
        }

        .heart-pop {
          animation: heartPop .6s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* NAVBAR. SE OCULTA EN EL MODO FOTO ZOOM PARA QUE LA FOTO OCUPE TODA LA PANTALLA */}
      {!(view === 'detail' && imageZoomMode) && (
        <nav
          style={{
            height: 54,
            minHeight: 54,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 12px',
            zIndex: 2000,
            borderBottom: '1px solid rgba(128,128,128,.2)',
            background: isDark ? '#0f172a' : '#ffffff'
          }}
        >
          <button
            type="button"
            onClick={goHome}
            style={{
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            aria-label="Inicio"
          >
            <img
              src="/icon-192.png"
              alt="Eventora"
              style={{
                height: 28,
                width: 28,
                borderRadius: 8
              }}
            />
          </button>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            {hasAdmin && (
              <button
                type="button"
                onClick={function () {
                  setView('admin');
                  fetchEvents();
                }}
                style={{
                  position: 'relative',
                  border: 'none',
                  background: 'transparent',
                  color: '#6366f1',
                  cursor: 'pointer',
                  display: 'flex'
                }}
                aria-label="Admin"
              >
                <ShieldCheck size={22} />

                {pendingEventsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: '#ef4444',
                      color: 'white',
                      borderRadius: 999,
                      minWidth: 17,
                      height: 17,
                      fontSize: 10,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px'
                    }}
                  >
                    {pendingEventsCount}
                  </span>
                )}
              </button>
            )}

            {!userEmail ? (
              <button
                type="button"
                onClick={handleLogin}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  background: '#4f46e5',
                  color: 'white',
                  padding: '8px 12px',
                  fontSize: 10,
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                LOGIN
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: 'white',
                  padding: '8px 12px',
                  fontSize: 10,
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                SALIR
              </button>
            )}

            <button
              type="button"
              onClick={function () {
                setIsDark(!isDark);
              }}
              style={{
                border: 'none',
                borderRadius: 999,
                background: isDark ? '#1e293b' : '#e2e8f0',
                color: 'inherit',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Tema"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </nav>
      )}

      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* HOME */}
        {view === 'home' && (
          <div
            ref={listRef}
            className="no-scrollbar"
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: 15,
              paddingBottom: 95,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div
              style={{
                marginBottom: 15
              }}
            >
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 1000,
                  letterSpacing: -1
                }}
              >
                Eventos
              </h1>
              <p
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  fontWeight: 700
                }}
              >
                Descubre próximos eventos cerca de ti
              </p>
            </div>

            <div
              style={{
                borderRadius: 22,
                padding: 12,
                marginBottom: 15,
                background: isDark ? '#0f172a' : '#ffffff',
                border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div
                style={{
                  position: 'relative'
                }}
              >
                <Search
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.55
                  }}
                />

                <input
                  placeholder="Buscar evento, ciudad..."
                  value={searchQuery}
                  onChange={function (e) {
                    setSearchQuery(e.target.value);
                  }}
                  style={{
                    ...INPUT_STYLE,
                    paddingLeft: 38,
                    paddingRight: 38
                  }}
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={function () {
                      setSearchQuery('');
                    }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8
                }}
              >
                <select
                  value={selectedCategory}
                  onChange={function (e) {
                    setSelectedCategory(e.target.value);
                  }}
                  style={{
                    ...INPUT_STYLE,
                    flex: 1
                  }}
                >
                  {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map(
                    function (cat) {
                      return (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      );
                    }
                  )}
                </select>

                <select
                  value={cityFilter}
                  onChange={function (e) {
                    setCityFilter(e.target.value);
                  }}
                  style={{
                    ...INPUT_STYLE,
                    flex: 1
                  }}
                >
                  <option value="TODAS">TODAS</option>
                  {citiesList.map(function (city) {
                    return (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {filteredEvents.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 50,
                  opacity: 0.7,
                  fontWeight: 800
                }}
              >
                Sin eventos
              </div>
            )}

            {featuredEvent && (
              <EventCard
                ev={featuredEvent}
                featured={true}
                isDark={isDark}
                favorites={favorites}
                animHeart={animHeart}
                toggleFavorite={toggleFavorite}
                selectEventById={selectEventById}
              />
            )}

            {restEvents.map(function (ev) {
              return (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  featured={false}
                  isDark={isDark}
                  favorites={favorites}
                  animHeart={animHeart}
                  toggleFavorite={toggleFavorite}
                  selectEventById={selectEventById}
                />
              );
            })}
          </div>
        )}

        {/* DETALLE EVENTO */}
        {view === 'detail' && selectedEvent && imageZoomMode && (
          <PhotoZoom
            src={getEventImage(selectedEvent)}
            alt={selectedEvent.title}
            onBack={goHome}
            onInfo={function () {
              setImageZoomMode(false);
            }}
            onShare={function () {
              shareRealLink(selectedEvent);
            }}
          />
        )}

        {view === 'detail' && selectedEvent && !imageZoomMode && (
          <div
            className="no-scrollbar"
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: 15,
              paddingBottom: 35,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <button
              type="button"
              onClick={function () {
                setImageZoomMode(true);
              }}
              style={{
                border: 'none',
                borderRadius: 14,
                background: '#4f46e5',
                color: 'white',
                padding: '11px 14px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                marginBottom: 12,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={15} />
              VOLVER A LA FOTO
            </button>

            <div
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                background: isDark ? '#0f172a' : '#ffffff',
                border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0'
              }}
            >
              <button
                type="button"
                onClick={function () {
                  setImageZoomMode(true);
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: '#000',
                  padding: 0,
                  cursor: 'zoom-in',
                  display: 'block'
                }}
              >
                <img
                  src={getEventImage(selectedEvent)}
                  alt={selectedEvent.title}
                  style={{
                    width: '100%',
                    height: 260,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </button>

              <div
                style={{
                  padding: 18,
                  textAlign: 'center'
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: '#6366f1',
                    fontWeight: 900,
                    letterSpacing: 1,
                    marginBottom: 8
                  }}
                >
                  {categoryEmojis[selectedEvent.category] || '📌'} {selectedEvent.category || 'EVENTO'}
                </p>

                {selectedDaysLabel && (
                  <div
                    style={{
                      display: 'inline-block',
                      background: selectedDaysLabel.bg,
                      color: selectedDaysLabel.color,
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 900,
                      marginBottom: 10
                    }}
                  >
                    {selectedDaysLabel.text}
                  </div>
                )}

                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 1000,
                    lineHeight: 1.1,
                    marginBottom: 18
                  }}
                >
                  {selectedEvent.title}
                </h1>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    textAlign: 'left',
                    fontWeight: 800,
                    fontSize: 14
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9
                    }}
                  >
                    <Calendar size={18} color="#6366f1" />
                    {formatDate(selectedEvent.date)}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9
                    }}
                  >
                    <Clock size={18} color="#6366f1" />
                    {selectedEvent.time || 'Hora no indicada'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9
                    }}
                  >
                    <MapPin size={18} color="#6366f1" />
                    <span>
                      {selectedEvent.address}
                      {selectedEvent.localidad ? ', ' + selectedEvent.localidad : ''}
                      {selectedEvent.city ? ', ' + selectedEvent.city : ''}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginTop: 20
                  }}
                >
                  <button
                    type="button"
                    onClick={function () {
                      setImageZoomMode(true);
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: 14,
                      background: '#4f46e5',
                      color: 'white',
                      padding: 12,
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    AMPLIAR FOTO
                  </button>

                  <button
                    type="button"
                    onClick={function () {
                      shareRealLink(selectedEvent);
                    }}
                    style={{
                      border: 'none',
                      borderRadius: 14,
                      background: isDark ? '#1e293b' : '#e2e8f0',
                      color: 'inherit',
                      padding: 12,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Compartir"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'detail' && !selectedEvent && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              padding: 20,
              textAlign: 'center'
            }}
          >
            <Loader2 className="animate-spin" size={28} />
            <p style={{ fontWeight: 900 }}>Cargando evento...</p>

            <button
              type="button"
              onClick={goHome}
              style={{
                border: 'none',
                borderRadius: 999,
                background: '#4f46e5',
                color: 'white',
                padding: '10px 15px',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              Volver
            </button>
          </div>
        )}

        {/* CREAR EVENTO */}
        {view === 'create' && (
          <div
            className="no-scrollbar"
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: 15,
              paddingBottom: 100,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 1000,
                marginBottom: 5
              }}
            >
              Crear evento
            </h1>

            <p
              style={{
                fontSize: 12,
                opacity: 0.7,
                fontWeight: 700,
                marginBottom: 15
              }}
            >
              El evento quedará pendiente hasta ser aprobado.
            </p>

            <form
              onSubmit={handleSubmitEvent}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <input
                name="title"
                placeholder="Título"
                value={form.title}
                onChange={handleInputChange}
                style={INPUT_STYLE}
              />

              <input
                name="city"
                placeholder="Ciudad"
                value={form.city}
                onChange={handleInputChange}
                style={INPUT_STYLE}
              />

              <input
                name="localidad"
                placeholder="Localidad / pueblo"
                value={form.localidad}
                onChange={handleInputChange}
                style={INPUT_STYLE}
              />

              <input
                name="address"
                placeholder="Dirección"
                value={form.address}
                onChange={handleInputChange}
                style={INPUT_STYLE}
              />

              <div
                style={{
                  display: 'flex',
                  gap: 10
                }}
              >
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleInputChange}
                  style={{
                    ...INPUT_STYLE,
                    flex: 1
                  }}
                />

                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleInputChange}
                  style={{
                    ...INPUT_STYLE,
                    flex: 1
                  }}
                />
              </div>

              <select
                name="category"
                value={form.category}
                onChange={handleInputChange}
                style={INPUT_STYLE}
              >
                <option value="MUSICA">MUSICA</option>
                <option value="GASTRONOMIA">GASTRONOMIA</option>
                <option value="TAURINO">TAURINO</option>
                <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                <option value="OTROS">OTROS</option>
              </select>

              <input
                name="image_url"
                placeholder="URL de la imagen"
                value={form.image_url}
                onChange={handleInputChange}
                style={INPUT_STYLE}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  border: 'none',
                  borderRadius: 16,
                  background: isSubmitting ? '#64748b' : '#4f46e5',
                  color: 'white',
                  padding: 14,
                  fontWeight: 1000,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={17} />
                    ENVIANDO...
                  </>
                ) : (
                  <>
                    <PlusCircle size={18} />
                    ENVIAR EVENTO
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* MAPA */}
        {view === 'map' && (
          <div
            style={{
              height: '100%',
              width: '100%'
            }}
          >
            <MapContainer
              center={mapCenter}
              zoom={mapEvents.length > 0 ? 11 : 6}
              style={{
                height: '100%',
                width: '100%'
              }}
            >
              <TileLayer
                url={isDark ? darkTileUrl : lightTileUrl}
                attribution="&copy; Google Maps"
              />

              {mapEvents.map(function (ev) {
                return (
                  <Marker
                    key={ev.id}
                    position={[Number(ev.lat), Number(ev.lng)]}
                    icon={redPinIcon}
                  >
                    <Popup>
                      <div
                        style={{
                          width: 180,
                          textAlign: 'center'
                        }}
                      >
                        <img
                          src={getEventImage(ev)}
                          alt={ev.title}
                          style={{
                            width: '100%',
                            height: 90,
                            objectFit: 'cover',
                            borderRadius: 10,
                            marginBottom: 8
                          }}
                        />

                        <strong>{ev.title}</strong>

                        <p
                          style={{
                            margin: '6px 0',
                            fontSize: 12
                          }}
                        >
                          <MapPin size={12} /> {ev.city}
                        </p>

                        <button
                          type="button"
                          onClick={function () {
                            selectEventById(ev.id);
                          }}
                          style={{
                            border: 'none',
                            borderRadius: 10,
                            background: '#4f46e5',
                            color: 'white',
                            padding: '8px 10px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          VER
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* ADMIN */}
        {view === 'admin' && (
          <div
            className="no-scrollbar"
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: 15,
              paddingBottom: 100,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {!hasAdmin ? (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 60,
                  fontWeight: 900
                }}
              >
                No tienes permisos de administrador.
              </div>
            ) : (
              <>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 1000,
                    marginBottom: 5
                  }}
                >
                  Panel Admin
                </h1>

                <p
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    fontWeight: 700,
                    marginBottom: 15
                  }}
                >
                  Pendientes: {pendingEvents.length}
                </p>

                <h2
                  style={{
                    fontSize: 16,
                    marginBottom: 10
                  }}
                >
                  Pendientes
                </h2>

                {pendingEvents.length === 0 && (
                  <p
                    style={{
                      opacity: 0.65,
                      fontWeight: 800,
                      marginBottom: 20
                    }}
                  >
                    No hay eventos pendientes.
                  </p>
                )}

                {pendingEvents.map(function (ev) {
                  return (
                    <div
                      key={ev.id}
                      className={isDark ? 'card-dark' : 'card-light'}
                      style={{
                        borderRadius: 18,
                        padding: 12,
                        marginBottom: 12
                      }}
                    >
                      <strong>{ev.title}</strong>

                      <p
                        style={{
                          fontSize: 12,
                          opacity: 0.75,
                          margin: '6px 0'
                        }}
                      >
                        {ev.city} | {formatDate(ev.date)}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8
                        }}
                      >
                        <button
                          type="button"
                          onClick={function () {
                            handleApproveEvent(ev.id);
                          }}
                          style={{
                            flex: 1,
                            border: 'none',
                            borderRadius: 12,
                            background: '#22c55e',
                            color: 'white',
                            padding: 10,
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <CheckCircle size={16} />
                          Aprobar
                        </button>

                        <button
                          type="button"
                          onClick={function () {
                            handleRejectEvent(ev.id);
                          }}
                          style={{
                            flex: 1,
                            border: 'none',
                            borderRadius: 12,
                            background: '#f59e0b',
                            color: 'white',
                            padding: 10,
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <X size={16} />
                          Rechazar
                        </button>

                        <button
                          type="button"
                          onClick={function () {
                            handleDeleteEvent(ev.id);
                          }}
                          style={{
                            border: 'none',
                            borderRadius: 12,
                            background: '#ef4444',
                            color: 'white',
                            padding: 10,
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          aria-label="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <h2
                  style={{
                    fontSize: 16,
                    marginTop: 25,
                    marginBottom: 10
                  }}
                >
                  Aprobados
                </h2>

                {approvedEvents.map(function (ev) {
                  return (
                    <div
                      key={ev.id}
                      className={isDark ? 'card-dark' : 'card-light'}
                      style={{
                        borderRadius: 18,
                        padding: 12,
                        marginBottom: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div>
                        <strong>{ev.title}</strong>
                        <p
                          style={{
                            fontSize: 12,
                            opacity: 0.75
                          }}
                        >
                          {ev.city} | {formatDate(ev.date)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={function () {
                          handleDeleteEvent(ev.id);
                        }}
                        style={{
                          border: 'none',
                          borderRadius: 12,
                          background: '#ef4444',
                          color: 'white',
                          padding: 10,
                          cursor: 'pointer',
                          display: 'flex'
                        }}
                        aria-label="Eliminar evento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM NAV. SE OCULTA EN DETALLE PARA QUE LA FOTO PUEDA VERSE BIEN */}
      {view !== 'detail' && (
        <nav
          style={{
            position: 'fixed',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '84%',
            maxWidth: 340,
            height: 54,
            borderRadius: 999,
            background: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.96)',
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            backdropFilter: 'blur(14px)'
          }}
        >
          <button
            type="button"
            onClick={goHome}
            style={{
              border: 'none',
              background: 'transparent',
              color: view === 'home' ? '#4f46e5' : 'inherit',
              cursor: 'pointer',
              display: 'flex'
            }}
            aria-label="Lista"
          >
            <LayoutList size={23} />
          </button>

          <button
            type="button"
            onClick={function () {
              setView('create');
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: view === 'create' ? '#4f46e5' : 'inherit',
              cursor: 'pointer',
              display: 'flex'
            }}
            aria-label="Crear"
          >
            <PlusCircle size={25} />
          </button>

          <button
            type="button"
            onClick={function () {
              setView('map');
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: view === 'map' ? '#4f46e5' : 'inherit',
              cursor: 'pointer',
              display: 'flex'
            }}
            aria-label="Mapa"
          >
            <MapIcon size={23} />
          </button>
        </nav>
      )}
    </div>
  );
}
