import { v2 as cloudinary } from "cloudinary";
import config from ".";

const { cloudinaryCloudName: cloudName, cloudinaryApiKey: apiKey, cloudinaryApiSecret: apiSecret } = config;

export const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export { cloudinary };
