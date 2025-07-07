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

// ==================== SUPPLIER MANAGEMENT ====================

/**
 * Get supplier dashboard stats
 * Returns total suppliers, pending orders, recent activities, and low stock alerts
 */
export const getSupplierStats = async () => {
  try {
    const headers = await getAuthHeaders();
    console.log(`Requesting: ${API_URL}/suppliers/stats`);

    const response = await fetch(`${API_URL}/suppliers/stats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch supplier stats");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get supplier stats error:", error);
    throw error;
  }
};

/**
 * Get all suppliers
 */
export const getAllSuppliers = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch suppliers");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get suppliers error:", error);
    throw error;
  }
};

/**
 * Get supplier by ID with products and purchase orders
 */
export const getSupplierById = async (supplierId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch supplier details");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get supplier details error:", error);
    throw error;
  }
};

/**
 * Create a new supplier
 */
export const createSupplier = async (supplierData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers`, {
      method: "POST",
      headers,
      body: JSON.stringify(supplierData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create supplier");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create supplier error:", error);
    throw error;
  }
};

/**
 * Update an existing supplier
 */
export const updateSupplier = async (supplierId, supplierData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(supplierData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update supplier");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update supplier error:", error);
    throw error;
  }
};

/**
 * Deactivate a supplier (soft delete)
 */
export const deactivateSupplier = async (supplierId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to deactivate supplier");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Deactivate supplier error:", error);
    throw error;
  }
};

// ==================== INVENTORY MANAGEMENT ====================

/**
 * Get inventory statistics
 * Returns counts of total items, low stock items, out of stock items, and items expiring soon
 */
export const getInventoryStats = async () => {
  try {
    const headers = await getAuthHeaders();
    console.log(`Requesting: ${API_URL}/suppliers/inventory/stats`);

    const response = await fetch(`${API_URL}/suppliers/inventory/stats`, {
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

    console.log(
      `Requesting: ${API_URL}/suppliers/inventory/items${queryString}`
    );

    const response = await fetch(
      `${API_URL}/suppliers/inventory/items${queryString}`,
      {
        method: "GET",
        headers,
      }
    );

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
    console.log(
      `Requesting: ${API_URL}/suppliers/inventory/products/${productId}`
    );

    const response = await fetch(
      `${API_URL}/suppliers/inventory/products/${productId}`,
      {
        method: "GET",
        headers,
      }
    );

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
 * Add a new product batch
 */
export const addProductBatch = async (batchData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/inventory/batches`, {
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
 * Adjust product batch quantity
 */
export const adjustBatchQuantity = async (batchId, adjustment, reason) => {
  try {
    const headers = await getAuthHeaders();
    console.log(
      `Adjusting batch ${batchId} by ${adjustment}. Reason: ${reason}`
    );

    const response = await fetch(
      `${API_URL}/suppliers/inventory/batches/${batchId}`,
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
 * Update product batch selling price
 */
export const updateBatchSellingPrice = async (
  batchId,
  sellingPrice,
  reason
) => {
  try {
    const headers = await getAuthHeaders();
    console.log(
      `Updating batch ${batchId} selling price to ${sellingPrice}. Reason: ${reason}`
    );

    const response = await fetch(
      `${API_URL}/suppliers/inventory/batches/${batchId}/price`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ sellingPrice, reason }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to update batch selling price"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update batch selling price error:", error);
    throw error;
  }
};

/**
 * Get all product categories
 */
export const getCategories = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/inventory/categories`, {
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
 * Get batch movement history
 */
export const getBatchMovements = async (batchId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/suppliers/inventory/batches/${batchId}/movements`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch batch movements");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get batch movements error:", error);
    throw error;
  }
};

/**
 * Get products that need reordering
 */
export const getProductsNeedingReorder = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/inventory/reorder`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to fetch products needing reorder"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get products needing reorder error:", error);
    throw error;
  }
};

// ==================== PURCHASE ORDERS MANAGEMENT ====================

/**
 * Get all purchase orders with filtering options
 */
export const getPurchaseOrders = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string for filters
    const queryParams = new URLSearchParams();

    if (filters.status) queryParams.append("status", filters.status);
    if (filters.supplier) queryParams.append("supplier", filters.supplier);
    if (filters.fromDate) queryParams.append("fromDate", filters.fromDate);
    if (filters.toDate) queryParams.append("toDate", filters.toDate);
    if (filters.search) queryParams.append("search", filters.search);

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";

    const response = await fetch(
      `${API_URL}/suppliers/purchase-orders${queryString}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch purchase orders");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get purchase orders error:", error);
    throw error;
  }
};

/**
 * Get purchase order by ID with items and supplier details
 */
export const getPurchaseOrderById = async (poId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/suppliers/purchase-orders/${poId}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to fetch purchase order details"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get purchase order details error:", error);
    throw error;
  }
};

/**
 * Get products by supplier for dropdown menu
 
 */
export const getProductsBySupplier = async (supplierId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/suppliers/purchase-orders/supplier/${supplierId}/products`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to fetch products by supplier"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get products by supplier error:", error);
    throw error;
  }
};

/**
 * Create a new purchase order
 */
export const createPurchaseOrder = async (poData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suppliers/purchase-orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(poData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create purchase order");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create purchase order error:", error);
    throw error;
  }
};

/**
 * Update purchase order details

 */
export const updatePurchaseOrder = async (poId, poData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/suppliers/purchase-orders/${poId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(poData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update purchase order");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update purchase order error:", error);
    throw error;
  }
};

/**
 * Update purchase order status (pending, ordered, received, cancelled)
 */
export const updatePurchaseOrderStatus = async (poId, status, notes) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/suppliers/purchase-orders/${poId}/status`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ status, notes }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to update purchase order status"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update purchase order status error:", error);
    throw error;
  }
};

// Export all functions to make them available to other modules
export default {
  // Supplier management
  getSupplierStats,
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deactivateSupplier,

  // Inventory management
  getInventoryStats,
  getInventoryItems,
  getProductById,
  addProductBatch,
  adjustBatchQuantity,
  updateBatchSellingPrice,
  getCategories,
  getBatchMovements,
  getProductsNeedingReorder,

  // Purchase orders management
  getPurchaseOrders,
  getPurchaseOrderById,
  getProductsBySupplier,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
};
