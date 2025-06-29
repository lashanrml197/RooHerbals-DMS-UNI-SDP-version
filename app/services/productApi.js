import AsyncStorage from "@react-native-async-storage/async-storage";

// Dynamically determine the API URL based on environment
const API_URL = "http://192.168.129.254:3000/api";

// Get auth headers with token
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

/**
 * Get all products with optional filtering
 * @param {Object} filters - Optional filters for products
 * @returns {Promise<Array>} List of products
 */
export const getProducts = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Construct query string from filters
    const queryParams = new URLSearchParams();

    if (filters.category) queryParams.append("category", filters.category);
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.sort) queryParams.append("sort", filters.sort);
    if (filters.active) queryParams.append("active", filters.active);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    console.log(`Requesting: ${API_URL}/products${queryString}`);

    const response = await fetch(`${API_URL}/products${queryString}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch products");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

/**
 * Get product batches for a specific product or all batches
 * @param {string} productId - Optional product ID to filter batches
 * @param {Object} options - Additional options like includeExpired
 * @returns {Promise<Array>} List of product batches
 */
export const getProductBatches = async (productId = null, options = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Construct query string
    const queryParams = new URLSearchParams();

    if (options.includeExpired) queryParams.append("includeExpired", "true");
    if (options.sortBy) queryParams.append("sortBy", options.sortBy);
    if (options.limit) queryParams.append("limit", options.limit.toString());

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    // Use product-specific endpoint if productId is provided
    const url = productId
      ? `${API_URL}/products/${productId}/batches${queryString}`
      : `${API_URL}/batches${queryString}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch product batches");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching product batches:", error);
    throw error;
  }
};

/**
 * Get a single product by ID
 * @param {string} productId - Product ID to fetch
 * @returns {Promise<Object>} Product details
 */
export const getProductById = async (productId) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch product details");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching product details:", error);
    throw error;
  }
};

/**
 * Add a new product
 * @param {Object} productData - Product data to add
 * @returns {Promise<Object>} Added product
 */
export const addProduct = async (productData) => {
  try {
    const headers = await getAuthHeaders();

    // Create a copy of the product data without the image_url if it's empty
    const productDataToSend = { ...productData };
    if (!productDataToSend.image_url) {
      delete productDataToSend.image_url;
    }

    console.log("API_URL being used:", API_URL);
    console.log(
      "Sending product data to server:",
      JSON.stringify(productDataToSend)
    );

    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(productDataToSend),
    });

    const data = await response.json();
    console.log("Server response:", JSON.stringify(data));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to add product");
    }

    return data.data;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

/**
 * Update an existing product
 * @param {string} productId - Product ID to update
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (productId, productData) => {
  try {
    const headers = await getAuthHeaders();

    // Create a copy of the product data without the image_url if it's empty
    const productDataToSend = { ...productData };
    if (!productDataToSend.image_url) {
      delete productDataToSend.image_url;
    }

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(productDataToSend),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update product");
    }

    return data.data;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

/**
 * Delete a product
 * @param {string} productId - Product ID to delete
 * @returns {Promise<Object>} Success message
 */
export const deleteProduct = async (productId) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete product");
    }

    return data;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

/**
 * Get all product categories
 * @returns {Promise<Array>} List of categories
 */
export const getCategories = async () => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/products/categories`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch categories");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

/**
 * Get all suppliers
 * @returns {Promise<Array>} List of suppliers
 */
export const getSuppliers = async () => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/products/suppliers`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch suppliers");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
};

/**
 * Add a new batch for an existing product
 * @param {string} productId - Product ID to add batch for
 * @param {Object} batchData - Batch data to add
 * @returns {Promise<Object>} Added batch
 */
export const addProductBatch = async (productId, batchData) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/products/${productId}/batches`, {
      method: "POST",
      headers,
      body: JSON.stringify(batchData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add product batch");
    }

    return data.data;
  } catch (error) {
    console.error("Error adding product batch:", error);
    throw error;
  }
};

/**
 * Update an existing batch
 * @param {string} batchId - Batch ID to update
 * @param {Object} batchData - Updated batch data
 * @returns {Promise<Object>} Updated batch
 */
export const updateBatch = async (batchId, batchData) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/batches/${batchId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(batchData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update batch");
    }

    return data.data;
  } catch (error) {
    console.error("Error updating batch:", error);
    throw error;
  }
};

/**
 * Get low stock products
 * @returns {Promise<Array>} List of low stock products
 */
export const getLowStockProducts = async () => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/products/low-stock`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch low stock products");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    throw error;
  }
};
