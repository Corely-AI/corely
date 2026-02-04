import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
const credentialsRaw =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_STORAGE_SERVICE_ACCOUNT;
const bucketName = process.env.STORAGE_BUCKET || process.env.GCP_BUCKET_NAME;

if (!bucketName) {
  console.error("No bucket name found in .env (tried STORAGE_BUCKET and GCP_BUCKET_NAME)");
  process.exit(1);
}

const tryParseJson = (val) => {
  if (!val || !val.trim().startsWith("{")) return undefined;
  try {
    return JSON.parse(val);
  } catch {
    return undefined;
  }
};

const credentials = tryParseJson(credentialsRaw);

const storage = new Storage({
  ...(projectId ? { projectId } : {}),
  ...(credentials ? { credentials } : { keyFilename: credentialsRaw }),
});

async function fixCors() {
  console.log(`Setting CORS for bucket: ${bucketName}...`);
  try {
    const bucket = storage.bucket(bucketName);
    // Directly set CORS without checking existence to avoid permission issues
    await bucket.setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
        origin: ["http://localhost:8080", "http://localhost:3000", "http://localhost:8080"],
        responseHeader: [
          "Content-Type",
          "Authorization",
          "Content-Length",
          "User-Agent",
          "x-goog-resumable",
        ],
      },
    ]);
    console.log("✅ CORS configuration updated successfully!");
  } catch (err) {
    console.error("❌ Failed to update CORS:", err.message);
    process.exit(1);
  }
}

fixCors();
