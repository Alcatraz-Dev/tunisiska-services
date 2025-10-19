export const routeCoordinates: Record<
  string,
  { from: { lat: number; lng: number }; to: { lat: number; lng: number } }
> = {
  stockholm_tunis: {
    from: { lat: 59.3293, lng: 18.0686 }, // Stockholm
    to: { lat: 36.8065, lng: 10.1815 },   // Tunis
  },
  tunis_stockholm: {
    from: { lat: 36.8065, lng: 10.1815 }, // Tunis
    to: { lat: 59.3293, lng: 18.0686 },   // Stockholm
  },
  tunis_sousse: {
    from: { lat: 36.8065, lng: 10.1815 }, // Tunis
    to: { lat: 35.8256, lng: 10.6411 },   // Sousse
  },
  tunis_sfax: {
    from: { lat: 36.8065, lng: 10.1815 }, // Tunis
    to: { lat: 34.7406, lng: 10.7603 },   // Sfax
  },
};