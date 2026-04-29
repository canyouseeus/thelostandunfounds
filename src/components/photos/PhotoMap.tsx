import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  TagIcon,
  MapPinIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';

interface MapPhoto {
  id: string;
  title: string;
  google_drive_file_id: string | null;
  thumbnail_url: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  library_id: string;
  metadata?: { camera_model?: string; date_taken?: string };
}

interface Tag { id: string; name: string; type: string; }

interface PopupState { photo: MapPhoto; x: number; y: number; }

const TILE_URL = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const TYPE_COLORS: Record<string, string> = {
  location: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  venue: 'bg-purple-400/10 text-purple-400 border border-purple-400/20',
  collection: 'bg-green-400/10 text-green-400 border border-green-400/20',
  people: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
  event: 'bg-orange-400/10 text-orange-400 border border-orange-400/20',
  custom: 'bg-white/5 text-white/60 border border-white/10',
};

function thumbUrl(p: MapPhoto) {
  if (p.google_drive_file_id)
    return `https://lh3.googleusercontent.com/d/${p.google_drive_file_id}=s400`;
  return p.thumbnail_url || '';
}

interface PhotoMapProps {
  onPhotoClick?: (photo: MapPhoto) => void;
  className?: string;
}

export function PhotoMap({ onPhotoClick, className = '' }: PhotoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const photosRef = useRef<MapPhoto[]>([]);
  const onPhotoClickRef = useRef(onPhotoClick);

  const [photos, setPhotos] = useState<MapPhoto[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  photosRef.current = photos;
  onPhotoClickRef.current = onPhotoClick;

  useEffect(() => {
    supabase
      .from('tags').select('id, name, type').order('type').order('name')
      .then(({ data }) => setAllTags(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('photos')
      .select('id, title, google_drive_file_id, thumbnail_url, latitude, longitude, location_name, library_id, metadata')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .then(({ data }) => { setPhotos((data || []) as MapPhoto[]); setLoading(false); });
  }, []);

  const buildGeoJSON = (pts: MapPhoto[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: pts.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: { id: p.id, title: p.title || 'Untitled', camera: p.metadata?.camera_model || '' },
    })),
  });

  const updateSource = useCallback(async (pts: MapPhoto[]) => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let filtered = pts;
    if (selectedTagIds.size > 0) {
      const { data } = await supabase
        .from('photo_tags').select('photo_id').in('tag_id', [...selectedTagIds]);
      const ids = new Set((data || []).map((r: any) => r.photo_id));
      filtered = pts.filter(p => ids.has(p.id));
    }
    const src = map.getSource('photos') as maplibregl.GeoJSONSource | undefined;
    src?.setData(buildGeoJSON(filtered));
  }, [mapReady, selectedTagIds]);

  useEffect(() => { if (photos.length > 0) updateSource(photos); }, [photos, updateSource]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { 'carto': { type: 'raster', tiles: [TILE_URL], tileSize: 256, attribution: ATTRIBUTION, maxzoom: 19 } },
        layers: [{ id: 'carto-layer', type: 'raster', source: 'carto' }],
      },
      center: [-98, 39],
      zoom: 3,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      map.addSource('photos', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'photos',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ffffff',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
          'circle-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'photos',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
        },
        paint: { 'text-color': '#000000' },
      });

      map.addLayer({
        id: 'markers',
        type: 'circle',
        source: 'photos',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#ffffff',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
          'circle-opacity': 0.9,
        },
      });

      map.on('click', 'clusters', async e => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!f) return;
        const src = map.getSource('photos') as maplibregl.GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id);
        if (zoom != null) {
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        }
      });

      map.on('click', 'markers', e => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const pt = map.project(coords);
        const photo = photosRef.current.find(p => p.id === f.properties?.id);
        if (photo) setPopup({ photo, x: pt.x, y: pt.y });
        e.originalEvent.stopPropagation();
      });

      map.on('click', e => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['markers', 'clusters'] });
        if (!hits.length) setPopup(null);
      });

      map.on('move', () => {
        setPopup(prev => {
          if (!prev) return null;
          const pt = map.project([prev.photo.longitude, prev.photo.latitude]);
          return { ...prev, x: pt.x, y: pt.y };
        });
      });

      ['clusters', 'markers'].forEach(layer => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // Fit bounds once photos load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || photos.length === 0) return;
    const lngs = photos.map(p => p.longitude);
    const lats = photos.map(p => p.latitude);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, maxZoom: 12, duration: 800 }
    );
  }, [photos, mapReady]);

  const tagsByType = allTags.reduce((acc, t) => {
    if (!acc[t.type]) acc[t.type] = [];
    acc[t.type].push(t);
    return acc;
  }, {} as Record<string, Tag[]>);

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setPopup(null);
  };

  return (
    <div className={`relative w-full bg-black overflow-hidden ${className}`}>
      {/* Active tag chips + filter button */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start gap-2 p-3">
        <div className="flex-1 min-w-0 flex flex-wrap gap-1">
          {[...selectedTagIds].map(id => {
            const tag = allTags.find(t => t.id === id);
            if (!tag) return null;
            return (
              <button
                key={id}
                onClick={() => toggleTag(id)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider backdrop-blur-sm ${TYPE_COLORS[tag.type] || TYPE_COLORS.custom}`}
              >
                {tag.name}<XMarkIcon className="w-2.5 h-2.5" />
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowTagFilter(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] uppercase font-bold tracking-wider backdrop-blur-sm transition-colors flex-shrink-0 ${
            showTagFilter || selectedTagIds.size > 0
              ? 'bg-white text-black'
              : 'bg-black/70 text-white/60 hover:bg-black/90 hover:text-white border border-white/20'
          }`}
        >
          <TagIcon className="w-3 h-3" />
          Filter
          {selectedTagIds.size > 0 && (
            <span className={`text-[8px] font-black px-1 ${showTagFilter || selectedTagIds.size > 0 ? 'bg-black text-white' : 'bg-white text-black'}`}>
              {selectedTagIds.size}
            </span>
          )}
        </button>
      </div>

      {/* Tag filter dropdown */}
      <AnimatePresence>
        {showTagFilter && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-12 right-3 z-20 bg-black/95 border border-white/15 backdrop-blur-sm p-3 w-72 max-h-80 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] uppercase font-black tracking-widest text-white/30">Filter by Tag</p>
              {selectedTagIds.size > 0 && (
                <button
                  onClick={() => setSelectedTagIds(new Set())}
                  className="text-[9px] uppercase font-bold text-white/20 hover:text-white transition-colors"
                >Clear</button>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(tagsByType).map(([type, tags]) => (
                <div key={type}>
                  <p className="text-[8px] uppercase font-black tracking-widest text-white/20 mb-1">{type}</p>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-colors ${
                          selectedTagIds.has(tag.id) ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                        }`}
                      >{tag.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count badge */}
      <div className="absolute bottom-8 left-3 z-10">
        <div className="flex items-center gap-1.5 bg-black/80 border border-white/10 px-2.5 py-1.5 backdrop-blur-sm">
          <MapPinIcon className="w-3 h-3 text-white/40" />
          <span className="text-[9px] uppercase font-bold tracking-widest text-white/40">
            {loading ? '…' : `${photos.length} photos mapped`}
            {selectedTagIds.size > 0 && ' (filtered)'}
          </span>
        </div>
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Marker popup */}
      <AnimatePresence>
        {popup && (
          <motion.div
            key={popup.photo.id}
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              left: popup.x,
              top: popup.y,
              transform: 'translate(-50%, calc(-100% - 16px))',
              zIndex: 30,
            }}
            className="w-56 bg-black border border-white/20 shadow-2xl overflow-hidden"
          >
            <div className="aspect-video bg-white/5 overflow-hidden relative">
              <img
                src={thumbUrl(popup.photo)}
                alt={popup.photo.title}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                onClick={() => setPopup(null)}
                className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 flex items-center justify-center text-white/60 hover:text-white"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2.5 space-y-1">
              {popup.photo.location_name && (
                <p className="text-white text-[10px] font-bold uppercase tracking-wide truncate">
                  {popup.photo.location_name}
                </p>
              )}
              {popup.photo.metadata?.date_taken && (
                <p className="text-white/40 text-[9px] font-mono">
                  {new Date(popup.photo.metadata.date_taken).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}
              {popup.photo.metadata?.camera_model && (
                <p className="text-white/30 text-[9px] font-mono">{popup.photo.metadata.camera_model}</p>
              )}
            </div>
            <div className="flex border-t border-white/10">
              <button
                onClick={() => { onPhotoClickRef.current?.(popup.photo); setPopup(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] uppercase font-bold tracking-wider text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Squares2X2Icon className="w-3 h-3" />View in Gallery
              </button>
            </div>
            {/* Arrow */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0"
              style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(255,255,255,0.2)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .maplibregl-ctrl-attrib{background:rgba(0,0,0,.6)!important}
        .maplibregl-ctrl-attrib a,.maplibregl-ctrl-attrib-inner{color:rgba(255,255,255,.3)!important;font-size:9px}
        .maplibregl-ctrl-group{background:rgba(0,0,0,.8)!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:0!important}
        .maplibregl-ctrl-group button{background:transparent!important;border-bottom:1px solid rgba(255,255,255,.1)!important}
        .maplibregl-ctrl-group button:last-child{border-bottom:none!important}
        .maplibregl-ctrl-icon{filter:invert(1) opacity(.4)}
        .maplibregl-ctrl-icon:hover{filter:invert(1) opacity(.8)}
      `}</style>
    </div>
  );
}

export default PhotoMap;
