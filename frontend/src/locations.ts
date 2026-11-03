export type CampusLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

// Load the campus locations students can pick from
export async function fetchLocations(): Promise<CampusLocation[]> {
  const response = await fetch("/api/locations");

  if (!response.ok) {
    throw new Error("Could not load campus locations");
  }

  return response.json();
}
