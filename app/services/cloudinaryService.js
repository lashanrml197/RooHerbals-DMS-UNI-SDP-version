const CLOUDINARY_CLOUD_NAME = "dpm0uiwip";
const CLOUDINARY_UPLOAD_PRESET = "roo_herbals";

/**
 * Upload an image to Cloudinary
 * @param {string} uri - The local URI of the image to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadImageToCloudinary = async (uri) => {
  try {
    console.log("Preparing to upload image to Cloudinary...");
    console.log("Using cloud name:", CLOUDINARY_CLOUD_NAME);
    console.log("Using upload preset:", CLOUDINARY_UPLOAD_PRESET);

    // Create a form data object
    const formData = new FormData();

    // Get the filename and type from the URI
    const uriParts = uri.split(".");
    const fileType = uriParts[uriParts.length - 1];

    // Prepare the file
    const file = {
      uri,
      type: `image/${fileType}`,
      name: `product_${Date.now()}.${fileType}`,
    };

    console.log("File prepared:", { name: file.name, type: file.type });

    // Add the file to form data
    formData.append("file", file);

    // Add upload preset
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    // Upload to Cloudinary
    console.log("Uploading to Cloudinary API...");
    console.log(
      "Upload URL:",
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
    );

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    console.log("Response status:", uploadResponse.status);

    const uploadResult = await uploadResponse.json();

    if (uploadResponse.ok) {
      console.log("Upload successful:", uploadResult.secure_url);
      return uploadResult.secure_url;
    } else {
      console.error("Upload failed with status:", uploadResponse.status);
      console.error("Error details:", uploadResult);
      throw new Error(
        uploadResult.error?.message ||
          `Failed to upload image. Status: ${uploadResponse.status}`
      );
    }
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

/**
 * Get an optimized image URL from Cloudinary
 * @param {string} originalUrl - The original Cloudinary URL
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {string} Transformed URL for optimized image
 */
export const getOptimizedImageUrl = (
  originalUrl,
  width = 500,
  height = 500
) => {
  if (!originalUrl) return null;

  // Check if it's a Cloudinary URL
  if (originalUrl.includes("cloudinary.com")) {
    // Insert transformation parameters after /upload/
    return originalUrl.replace(
      "/upload/",
      `/upload/c_fill,w_${width},h_${height},q_auto,f_auto/`
    );
  }

  // Return original URL if not from Cloudinary
  return originalUrl;
};
