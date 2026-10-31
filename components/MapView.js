'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { CATEGORIES, STATUSES, HYDERABAD_CENTER, complaintRef, timeAgo } from '@/lib/constants';

function markerIcon(complaint) {
  const cat = CATEGORIES[complaint.category] || CATEGORIES.WASTE;
  const status = STATUSES[complaint.status] || STATUSES.Pending;
  return L.divIcon({
    className: 'hs-marker-wrap',
    html: `<div class="hs-marker ${complaint.priority === 'High' ? 'high' : ''}" style="background:${status.color}">${cat.icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function FitBounds({ complaints }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !complaints.length) return;
    const points = complaints
      .map((c) => [Number(c.location?.lat), Number(c.location?.lng)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (!points.length) return;
    fitted.current = true;
    try {
      map.fitBounds(points, { padding: [44, 44], maxZoom: 14 });
    } catch {
      /* ignore */
    }
  }, [complaints, map]);

  return null;
}

export default function MapView({ complaints = [] }) {
  const valid = complaints.filter(
    (c) => Number.isFinite(Number(c.location?.lat)) && Number.isFinite(Number(c.location?.lng))
  );

  return (
    <MapContainer
      center={[HYDERABAD_CENTER.lat, HYDERABAD_CENTER.lng]}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds complaints={valid} />
      {valid.map((complaint) => {
        const cat = CATEGORIES[complaint.category] || CATEGORIES.WASTE;
        const status = STATUSES[complaint.status] || STATUSES.Pending;
        return (
          <Marker
            key={complaint.id}
            position={[Number(complaint.location.lat), Number(complaint.location.lng)]}
            icon={markerIcon(complaint)}
          >
            <Popup>
              <div className="min-w-[190px]">
                <div className="mb-1 flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: status.color }}
                  >
                    {status.en}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    {cat.icon} {cat.key}
                  </span>
                </div>
                <p className="mb-0.5 text-[13px] font-bold leading-snug text-emerald-950">
                  {complaint.title}
                </p>
                <p className="text-[11px] text-emerald-900/60">
                  {complaint.area || complaint.location?.address || 'Hyderabad'}
                </p>
                <p className="mt-1 text-[10px] text-emerald-900/40">
                  {complaintRef(complaint.id)} · {timeAgo(complaint.createdAt)}
                </p>
                <Link
                  href={`/dashboard?focus=${complaint.id}`}
                  className="mt-2 inline-block rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
