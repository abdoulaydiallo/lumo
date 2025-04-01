'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Loader2, ZoomIn, ZoomOut, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface Location {
  lat: number;
  lng: number;
  label?: string;
}

interface AddressMapProps {
  center?: Location;
  zoom?: number;
  className?: string;
  markerPosition?: Location;
  onLocationSelect: (location: Location) => void;
  onMapLoaded?: () => void;
}

export const AddressMap = ({
  center = { lat: 9.6412, lng: -13.5784 },
  zoom = 14,
  className,
  markerPosition,
  onLocationSelect,
  onMapLoaded,
}: AddressMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initializeMap = () => {
      try {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [center.lng, center.lat],
          zoom,
          interactive: true,
        });

        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

        mapInstance.on('load', () => {
          setLoading(false);
          onMapLoaded?.();
        });

        mapInstance.on('click', (e) => {
          onLocationSelect({
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
          });
        });

        mapInstance.on('zoom', () => {
          setCurrentZoom(mapInstance.getZoom());
        });

        mapRef.current = mapInstance;

        return () => {
          if (markerRef.current) markerRef.current.remove();
          mapInstance.remove();
        };
      } catch (err) {
        setError('Erreur de chargement de la carte');
        setLoading(false);
        console.error('Map initialization error:', err);
      }
    };

    initializeMap();
  }, []);

  // Mise à jour du marqueur
  useEffect(() => {
    if (!mapRef.current || loading) return;

    const updateMarker = () => {
      // Supprimer l'ancien marqueur
      if (markerRef.current) {
        markerRef.current.remove();
      }

      if (markerPosition) {
        // Créer un élément personnalisé pour le marqueur
        const el = document.createElement('div');
        el.className = 'address-marker';
        el.innerHTML = `
          <div class="relative">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            ${markerPosition.label ? `
              <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-md shadow-md text-xs font-medium whitespace-nowrap">
                ${markerPosition.label}
              </div>
            ` : ''}
          </div>
        `;

        markerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([markerPosition.lng, markerPosition.lat])
          .addTo(mapRef.current!);

        // Animation d'apparition
        el.style.opacity = '0';
        setTimeout(() => {
          el.style.transition = 'opacity 0.3s ease-out';
          el.style.opacity = '1';
        }, 100);
      }
    };

    updateMarker();
  }, [markerPosition, loading]);

  // Commandes de la carte
  const zoomIn = () => {
    mapRef.current?.zoomIn({ duration: 300 });
  };

  const zoomOut = () => {
    mapRef.current?.zoomOut({ duration: 300 });
  };

  const locateUser = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        mapRef.current?.flyTo({
          center: [newLocation.lng, newLocation.lat],
          zoom: 16,
          duration: 1000,
        });
        onLocationSelect(newLocation);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast('Impossible d\'accéder à votre position');
      }
    );
  };

  if (error) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted text-destructive p-4 rounded-lg',
        className
      )}>
        <MapPin className="mr-2 h-4 w-4" />
        {error}
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full rounded-lg overflow-hidden', className)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <Skeleton className="absolute inset-0" />
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      
      <div
        ref={mapContainer}
        className="h-full w-full"
        style={{ visibility: loading ? 'hidden' : 'visible' }}
      />

      {/* Commandes de navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute right-2 bottom-14 z-20 flex flex-col space-y-2"
      >
        
      </motion.div>

      <style jsx global>{`
        .address-marker {
          cursor: pointer;
          transform: translate(-50%, -100%);
          transition: all 0.2s ease-out;
        }
        .address-marker:hover {
          transform: translate(-50%, -100%) scale(1.1);
        }
        .mapboxgl-ctrl-group {
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
};