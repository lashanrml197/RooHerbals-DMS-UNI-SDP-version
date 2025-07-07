import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.3:3000/api";

// Helper function to get authentication headers
const getAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return { "Content-Type": "application/json" };
  }
};

// ==================== INVENTORY STATISTICS ====================

/**
 * Get inventory dashboard statistics
 * Returns counts of total items, low stock items, out of stock items, and items expiring soon
 */
export const getInventoryStats = async () => {
  try {
    console.log("Fetching inventory stats from:", `${API_URL}/inventory/stats`);
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/stats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch inventory stats");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get inventory stats error:", error);
    throw error;
  }
};

// ==================== INVENTORY ITEMS ====================

/**
 * Get inventory items with filtering options
 */
export const getInventoryItems = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string for filters
    const queryParams = new URLSearchParams();

    if (filters.category) queryParams.append("category", filters.category);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    const response = await fetch(`${API_URL}/inventory/items${queryString}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch inventory items");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get inventory items error:", error);
    throw error;
  }
};

/**
 * Get product details by ID with batches
 */
export const getProductById = async (productId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/products/${productId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch product details");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get product details error:", error);
    throw error;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (productData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create product");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create product error:", error);
    throw error;
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (productId, productData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/products/${productId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update product");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update product error:", error);
    throw error;
  }
};

/**
 * Deactivate a product
 */
export const deactivateProduct = async (productId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/products/${productId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to deactivate product");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Deactivate product error:", error);
    throw error;
  }
};

// ==================== BATCH MANAGEMENT ====================

/**
 * Add a new product batch
 */
export const addProductBatch = async (batchData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/batches`, {
      method: "POST",
      headers,
      body: JSON.stringify(batchData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add product batch");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Add product batch error:", error);
    throw error;
  }
};

/**
 * Get batch details by ID
 */
export const getBatchById = async (batchId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/batches/${batchId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch batch details");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get batch details error:", error);
    throw error;
  }
};

/**
 * Adjust product batch quantity
 */
export const adjustBatchQuantity = async (batchId, adjustment, reason) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/inventory/batches/${batchId}/quantity`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ adjustment, reason }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to adjust batch quantity");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Adjust batch quantity error:", error);
    throw error;
  }
};

/**
 * Update batch expiry date
 */
export const updateBatchExpiry = async (batchId, expiry_date, reason) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/inventory/batches/${batchId}/expiry`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ expiry_date, reason }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to update batch expiry date"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update batch expiry error:", error);
    throw error;
  }
};

/**
 * Deactivate a batch
 */
export const deactivateBatch = async (batchId, reason) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/batches/${batchId}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to deactivate batch");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Deactivate batch error:", error);
    throw error;
  }
};

// ==================== CATEGORY MANAGEMENT ====================

/**
 * Get all categories
 */
export const getCategories = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/categories`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch categories");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get categories error:", error);
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (categoryData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/categories`, {
      method: "POST",
      headers,
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create category");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create category error:", error);
    throw error;
  }
};

// ==================== INVENTORY REPORTS ====================

/**
 * Get inventory report
 */
export const getInventoryReport = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/reports/overview`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch inventory report");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get inventory report error:", error);
    throw error;
  }
};

/**
 * Get low stock products
 */
export const getLowStockProducts = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/reports/low-stock`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to fetch low stock products"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get low stock products error:", error);
    throw error;
  }
};
