import { cameroonRegions, emergencyDirectory } from "../config.js";

export const health = (_req, res) => res.json({ status: "ok", database: "mongodb", time: new Date().toISOString() });
export const cameroonConfig = (_req, res) => res.json({ regions: cameroonRegions, emergencyDirectory, locales: ["en", "fr"], currency: "XAF", countryCode: "+237", timezone: "Africa/Douala" });
export async function reverseGeocode(req, res, next) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: "Valid coordinates required" });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=fr,en`, { headers: { "User-Agent": "CrimeX-Cameroon/1.0" } });
    if (!response.ok) throw new Error("Reverse geocoding unavailable");
    const result = await response.json();
    res.json({ displayName: result.display_name, address: result.address });
  } catch (error) { next(error); }
}
