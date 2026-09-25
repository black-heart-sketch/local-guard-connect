import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/crimex",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  nodeEnv: process.env.NODE_ENV || "development",
};

export const emergencyDirectory = [
  { key: "police", label: { en: "Police rescue", fr: "Police secours" }, mobile: "117", landline: "17", scope: "Yaounde, Douala and Garoua" },
  { key: "gendarmerie", label: { en: "Gendarmerie", fr: "Gendarmerie" }, mobile: "113", landline: "13", scope: "Centre, Littoral, West and North-West" },
  { key: "fire", label: { en: "Fire service", fr: "Sapeurs-pompiers" }, mobile: "118", landline: "18", scope: "Cameroon" },
  { key: "medical", label: { en: "Emergency medical service", fr: "SAMU" }, mobile: "119", landline: "19", scope: "Cameroon" },
];

export const cameroonRegions = [
  "Adamawa", "Centre", "East", "Far North", "Littoral", "North", "North-West", "South", "South-West", "West",
];
