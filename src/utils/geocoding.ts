import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEO_APIFY_KEY || "";
const BASE_URL = "https://api.geoapify.com/v1/geocode/search";

interface Coordinates {
  lat: number;
  lon: number;
}

interface GeoapifyResponse {
  features: Array<{
    properties: {
      lat: number;
      lon: number;
    };
  }>;
}

/**
 * Geocode an address to get coordinates
 * @param address - The address to geocode
 * @returns Promise with latitude and longitude coordinates
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  try {
    const url = `${BASE_URL}?text=${encodeURIComponent(
      address
    )}&apiKey=${API_KEY}`;
    const response = await axios.get<GeoapifyResponse>(url);
    const data = response.data;

    if (data.features && data.features.length > 0) {
      const { lat, lon } = data.features[0].properties;
      return { lat, lon };
    }

    throw new Error("No location found for the given address");
  } catch (error) {
    console.error("Error geocoding address:", error);
    throw error;
  }
}
