export function markerIcon(fillColor: string, strokeColor: string, scale: number): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor,
    fillOpacity: 1,
    strokeColor,
    strokeWeight: 2,
  };
}

export function pinIcon(fillColor: string, strokeColor: string, scale = 1): google.maps.Symbol {
  return {
    path: "M0-24C-6.7-24-12-18.7-12-12c0 8.2 12 24 12 24s12-15.8 12-24c0-6.7-5.3-12-12-12zm0 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    anchor: new google.maps.Point(0, 12),
    fillColor,
    fillOpacity: 1,
    labelOrigin: new google.maps.Point(0, -12),
    scale,
    strokeColor,
    strokeWeight: 2,
  };
}

export const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#15212d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a121b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d4c9ad" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#5a574d" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1a2935" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#263747" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#f3ead6" }] },
  { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#0a121b" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c151e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8b8473" }] },
];
