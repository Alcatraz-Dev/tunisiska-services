export const routeCoordinates: Record<
  string,
  { from: { lat: number; lng: number }; to: { lat: number; lng: number } }
> = {
  stockholm_tunis: {
    from: { lat: 59.3293, lng: 18.0686 },
    to: { lat: 36.8065, lng: 10.1815 },
  },
  goteborg_tunis: {
    from: { lat: 57.7089, lng: 11.9746 },
    to: { lat: 36.8065, lng: 10.1815 },
  },
  malmo_tunis: {
    from: { lat: 55.605, lng: 13.0038 },
    to: { lat: 36.8065, lng: 10.1815 },
  },
  tunis_stockholm: {
    from: { lat: 36.8065, lng: 10.1815 },
    to: { lat: 59.3293, lng: 18.0686 },
  },
  tunis_goteborg: {
    from: { lat: 36.8065, lng: 10.1815 },
    to: { lat: 57.7089, lng: 11.9746 },
  },
  tunis_malmo: {
    from: { lat: 36.8065, lng: 10.1815 },
    to: { lat: 55.605, lng: 13.0038 },
  },
};
