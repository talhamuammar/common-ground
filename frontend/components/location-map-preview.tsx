'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Home, ExternalLink } from 'lucide-react';
import type * as LeafletType from 'leaflet';

interface LocationMapPreviewProps {
  location: string;
  lat?: number | null;
  lng?: number | null;
  label?: string;
  icon?: 'pin' | 'home';
  color?: 'emerald' | 'amber';
  heightClass?: string;
  showDetails?: boolean;
}

export function LocationMapPreview({
  location,
  lat,
  lng,
  label,
  icon = 'pin',
  color = 'emerald',
  heightClass = 'h-48',
  showDetails = true,
}: LocationMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  // If coordinates are missing, attempt a quick geocode from the location string
  useEffect(() => {
    let active = true;

    async function resolveCoords() {
      if (lat && lng) {
        setCoords({ lat, lng });
        return;
      }
      if (!location || !location.trim()) {
        setCoords(null);
        return;
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active && data && data.length > 0) {
          setCoords({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        }
      } catch {
        // Fallback
      }
    }

    resolveCoords();

    return () => {
      active = false;
    };
  }, [location, lat, lng]);

  // Render Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainerRef.current || !coords) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const markerColor = color === 'amber' ? '#f59e0b' : 'var(--accent, #1e3a2b)';
      const glowRgba = color === 'amber' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.3)';

      const svgPath = icon === 'home'
        ? '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
        : '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${glowRgba}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: ${markerColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

      mapInstanceRef.current = map;
    }

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coords, color, icon]);

  if (!location && !coords) return null;

  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-[#080808] shadow-sm group/map">
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} style={{ zIndex: 1 }} />

      {/* Floating Info Pill */}
      {showDetails && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[10] flex items-center justify-between gap-2 rounded-xl bg-black/80 dark:bg-black/90 px-3 py-2 text-xs text-white backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            {icon === 'home' ? (
              <Home size={14} className={color === 'amber' ? 'text-amber-400 shrink-0' : 'text-accent-fg shrink-0'} />
            ) : (
              <MapPin size={14} className="text-accent-fg shrink-0" />
            )}
            <div className="min-w-0">
              {label && (
                <span className="block text-[10px] text-slate-400 font-normal leading-tight">{label}</span>
              )}
              <span className="font-semibold truncate text-[11px] sm:text-xs block">{location}</span>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-accent-fg hover:underline shrink-0"
          >
            <span>Open Map</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}
