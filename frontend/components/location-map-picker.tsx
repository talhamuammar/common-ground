'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Home, Search, Navigation, Loader2, X } from 'lucide-react';
import type * as LeafletType from 'leaflet';

interface LocationMapPickerProps {
  location: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  placeholder?: string;
  icon?: 'pin' | 'home';
  themeColor?: 'emerald' | 'amber';
  label?: string;
  onChange: (location: string, lat: number | null, lng: number | null) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface NominatimResponse {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
}

export function LocationMapPicker({
  location,
  lat,
  lng,
  placeholder,
  icon = 'pin',
  themeColor = 'emerald',
  label,
  onChange,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markerRef = useRef<LeafletType.Marker | null>(null);

  const [currentLoc, setCurrentLoc] = useState(location || '');
  const [currentLat, setCurrentLat] = useState<number | null>(lat ?? null);
  const [currentLng, setCurrentLng] = useState<number | null>(lng ?? null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  // Synchronize internal state if props change from outside
  useEffect(() => {
    setCurrentLoc(location || '');
    setCurrentLat(lat ?? null);
    setCurrentLng(lng ?? null);
  }, [location, lat, lng]);

  // Format short readable location from nominatim response
  const formatLocationName = (data: NominatimResponse): string => {
    if (data.address) {
      const city = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || data.address.state_district;
      const state = data.address.state;
      const country = data.address.country;

      if (city && country) {
        return state && state !== city ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
      }
      if (state && country) return `${state}, ${country}`;
      if (country) return country;
    }
    if (data.display_name) {
      const parts = data.display_name.split(',').map((p: string) => p.trim());
      if (parts.length > 2) return `${parts[0]}, ${parts[parts.length - 1]}`;
      return data.display_name;
    }
    return '';
  };

  // Reverse geocode lat/lng to address string
  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const name = formatLocationName(data);
      if (name) {
        setCurrentLoc(name);
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        onChange(name, latitude, longitude);
      }
    } catch {
      // Fallback
    }
  }, [onChange]);

  // Marker icon builder
  const createMarkerIcon = useCallback((L: typeof LeafletType) => {
    const markerBg = themeColor === 'amber' ? '#f59e0b' : '#10b981';
    const glowRgba = themeColor === 'amber' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.25)';
    const svgPath = icon === 'home'
      ? '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
      : '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';

    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${glowRgba}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: ${markerBg}; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }, [themeColor, icon]);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      const initialLat = currentLat || (icon === 'home' ? 22.3569 : 23.8103);
      const initialLng = currentLng || (icon === 'home' ? 91.7832 : 90.4125);
      const initialZoom = currentLat && currentLng ? 11 : 4;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = createMarkerIcon(L);

      if (currentLat && currentLng) {
        const marker = L.marker([currentLat, currentLng], { icon: customIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          reverseGeocode(pos.lat, pos.lng);
        });
      }

      // Map Click event: drop/move pin
      map.on('click', (e: LeafletType.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          const newMarker = L.marker([clickLat, clickLng], { icon: customIcon, draggable: true }).addTo(map);
          newMarker.on('dragend', () => {
            const pos = newMarker.getLatLng();
            reverseGeocode(pos.lat, pos.lng);
          });
          markerRef.current = newMarker;
        }

        reverseGeocode(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [createMarkerIcon, currentLat, currentLng, icon, reverseGeocode]);

  // Update map marker when coordinates change
  const setMapPosition = useCallback(async (latitude: number, longitude: number, placeName: string) => {
    setCurrentLoc(placeName);
    setCurrentLat(latitude);
    setCurrentLng(longitude);
    onChange(placeName, latitude, longitude);

    if (mapInstanceRef.current) {
      const L = (await import('leaflet')).default;
      mapInstanceRef.current.flyTo([latitude, longitude], 12, { duration: 1.2 });

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const customIcon = createMarkerIcon(L);
        const marker = L.marker([latitude, longitude], { icon: customIcon, draggable: true }).addTo(mapInstanceRef.current);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          reverseGeocode(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
    }
  }, [createMarkerIcon, onChange, reverseGeocode]);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setSearchResults(data);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeolocating(false);
        const { latitude, longitude } = pos.coords;
        reverseGeocode(latitude, longitude);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 13);
        }
      },
      () => {
        setGeolocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    setCurrentLoc('');
    setCurrentLat(null);
    setCurrentLng(null);
    onChange('', null, null);
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  const activeIconColor = themeColor === 'amber' ? 'text-amber-500' : 'text-accent-fg';
  const activeFocusRing = themeColor === 'amber' ? 'focus:border-amber-500 focus:ring-amber-500/20' : 'focus:border-accent focus:ring-accent/20';

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            {icon === 'home' ? <Home size={14} className={activeIconColor} /> : <MapPin size={14} className={activeIconColor} />}
            <span>{label}</span>
          </label>
        </div>
      )}

      {/* Location Input & Action Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          {icon === 'home' ? (
            <Home size={16} className={`absolute left-3.5 ${activeIconColor} shrink-0 pointer-events-none`} />
          ) : (
            <MapPin size={16} className={`absolute left-3.5 ${activeIconColor} shrink-0 pointer-events-none`} />
          )}
          <input
            type="text"
            value={currentLoc}
            onChange={(e) => {
              setCurrentLoc(e.target.value);
              onChange(e.target.value, currentLat, currentLng);
            }}
            placeholder={placeholder || (icon === 'home' ? 'Search hometown or pin on map...' : 'Search place or click on the map below...')}
            className={`h-11 w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#151515] pl-10 pr-20 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ${activeFocusRing} focus:ring-2 transition-colors`}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {currentLoc && (
              <button
                type="button"
                onClick={handleClearLocation}
                title="Clear location"
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geolocating}
              title="Use current GPS location"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                themeColor === 'amber'
                  ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 dark:hover:bg-amber-500/30'
                  : 'bg-accent-subtle text-accent-fg hover:bg-accent-subtle-hover'
              }`}
            >
              {geolocating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
              <span className="hidden sm:inline">GPS</span>
            </button>
          </div>
        </div>

        {/* Map Search / Place Finder Overlay */}
        <div className="mt-2 relative">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search world map for ${icon === 'home' ? 'hometown' : 'place'}...`}
              className="h-9 w-full rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#111111] pl-9 pr-8 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:bg-white dark:focus:bg-[#151515] transition-colors"
            />
            {searching && (
              <Loader2 size={13} className={`absolute right-3 animate-spin ${activeIconColor}`} />
            )}
            {searchQuery && !searching && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0d0d0d] p-1.5 shadow-xl max-h-56 overflow-y-auto">
              {searchResults.map((item) => {
                const name = formatLocationName(item);
                return (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => {
                      setMapPosition(parseFloat(item.lat), parseFloat(item.lon), name);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-accent-subtle transition-colors"
                  >
                    {icon === 'home' ? (
                      <Home size={14} className={`mt-0.5 shrink-0 ${activeIconColor}`} />
                    ) : (
                      <MapPin size={14} className={`mt-0.5 shrink-0 ${activeIconColor}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{item.display_name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map Surface */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-sm bg-slate-100 dark:bg-[#080808]">
        <div
          ref={mapContainerRef}
          className="h-52 w-full cursor-crosshair"
          style={{ zIndex: 1 }}
        />

        {/* Map Overlay Badge */}
        <div className="absolute bottom-2.5 left-2.5 z-[10] flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md border border-white/10 pointer-events-none">
          {icon === 'home' ? (
            <Home size={12} className={themeColor === 'amber' ? 'text-amber-400' : 'text-accent-fg'} />
          ) : (
            <MapPin size={12} className="text-accent-fg" />
          )}
          <span>{currentLoc || (icon === 'home' ? 'Click on map to pin your hometown' : 'Click on map to pin your location')}</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        💡 Search any city, click on the map, or drag the pin to set your location.
      </p>
    </div>
  );
}
