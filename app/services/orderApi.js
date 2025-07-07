import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.3:3000/api";

// Get authenticated fetch headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

/**
 * Get order statistics for dashboard
 * @returns {Promise<Object>} Order statistics data
 */
export const getOrderStats = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/stats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch order stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Get order stats error:", error);
    throw error;
  }
};

/**
 * Get all orders with filtering, pagination, and sorting
 * @param {Object} params - Query parameters for filtering and pagination
 * @returns {Promise<Object>} Paginated orders data
 */
export const getAllOrders = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string from params
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/orders${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch orders");
    }

    return await response.json();
  } catch (error) {
    console.error("Get orders error:", error);
    throw error;
  }
};

/**
 * Get order details by ID
 * @param {string} id - Order ID
 * @returns {Promise<Object>} Order details
 */
export const getOrderById = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch order details");
    }

    return await response.json();
  } catch (error) {
    console.error("Get order details error:", error);
    throw error;
  }
};

/**
 * Create a new order
 * @param {Object} orderData - Order data to create
 * @returns {Promise<Object>} Created order data
 */
export const createOrder = async (orderData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create order");
    }

    return await response.json();
  } catch (error) {
    console.error("Create order error:", error);
    throw error;
  }
};

/**
 * Update order status
 * @param {string} id - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order data
 */
export const updateOrderStatus = async (id, status) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update order status");
    }

    return await response.json();
  } catch (error) {
    console.error("Update order status error:", error);
    throw error;
  }
};

/**
 * Update order payment status and record payment
 * @param {string} id - Order ID
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Updated payment data
 */
export const updatePaymentStatus = async (id, paymentData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}/payment`, {
      method: "PUT",
      headers,
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update payment status");
    }

    return await response.json();
  } catch (error) {
    console.error("Update payment status error:", error);
    throw error;
  }
};

/**
 * Process return for an order
 * @param {string} id - Order ID
 * @param {Object} returnData - Return data
 * @returns {Promise<Object>} Processed return data
 */
export const processReturn = async (id, returnData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}/return`, {
      method: "POST",
      headers,
      body: JSON.stringify(returnData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to process return");
    }

    return await response.json();
  } catch (error) {
    console.error("Process return error:", error);
    throw error;
  }
};

/**
 * Get order history for a specific customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Customer order history
 */
export const getCustomerOrderHistory = async (customerId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/customer/${customerId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to fetch customer order history"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Get customer order history error:", error);
    throw error;
  }
};

/**
 * Assign delivery to an order
 * @param {string} id - Order ID
 * @param {Object} deliveryData - Delivery data
 * @returns {Promise<Object>} Assigned delivery data
 */
export const assignDelivery = async (id, deliveryData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}/delivery`, {
      method: "POST",
      headers,
      body: JSON.stringify(deliveryData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to assign delivery");
    }

    return await response.json();
  } catch (error) {
    console.error("Assign delivery error:", error);
    throw error;
  }
};

/**
 * Update delivery status
 * @param {string} id - Delivery ID
 * @param {Object} statusData - Status update data
 * @returns {Promise<Object>} Updated delivery data
 */
export const updateDeliveryStatus = async (id, statusData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/delivery/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(statusData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update delivery status");
    }

    return await response.json();
  } catch (error) {
    console.error("Update delivery status error:", error);
    throw error;
  }
};

/**
 * Add notes to an existing order
 * @param {string} id - Order ID
 * @param {Object} noteData - Note data with notes content
 * @returns {Promise<Object>} Updated order notes data
 */
export const addOrderNotes = async (id, noteData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify(noteData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add order notes");
    }

    return await response.json();
  } catch (error) {
    console.error("Add order notes error:", error);
    throw error;
  }
};

/**
 * Get deliveries for a specific driver
 * @param {string} driverId - Driver ID
 * @param {Object} params - Query parameters like status
 * @returns {Promise<Object>} Driver's deliveries data
 */
export const getDriverDeliveries = async (driverId, params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/orders/driver/${driverId}/deliveries${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch driver deliveries");
    }

    return await response.json();
  } catch (error) {
    console.error("Get driver deliveries error:", error);
    throw error;
  }
};

/**
 * Get orders by status for dashboard
 * @param {string} status - Order status to filter by
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Filtered orders data
 */
export const getOrdersByStatus = async (status, params = {}) => {
  try {
    const queryParams = {
      status,
      limit: params.limit || 10,
      page: params.page || 1,
      sort: params.sort || "order_date",
      order: params.order || "DESC",
      ...params,
    };

    return await getAllOrders(queryParams);
  } catch (error) {
    console.error(`Get ${status} orders error:`, error);
    throw error;
  }
};

/**
 * Get orders with pending payment for dashboard
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Filtered orders data
 */
export const getPendingPaymentOrders = async (params = {}) => {
  try {
    const queryParams = {
      payment_status: "pending",
      limit: params.limit || 10,
      page: params.page || 1,
      sort: params.sort || "order_date",
      order: params.order || "DESC",
      ...params,
    };

    return await getAllOrders(queryParams);
  } catch (error) {
    console.error("Get pending payment orders error:", error);
    throw error;
  }
};

/**
 * Get low stock products for inventory management
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Low stock products data
 */
export const getLowStockProducts = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/inventory/low-stock${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to fetch low stock products"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Get low stock products error:", error);
    throw error;
  }
};

/**
 * Generate invoices for orders
 * @param {string} id - Order ID
 * @returns {Promise<Object>} Invoice data
 */
export const generateInvoice = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/orders/${id}/invoice`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to generate invoice");
    }

    return await response.json();
  } catch (error) {
    console.error("Generate invoice error:", error);
    throw error;
  }
};

/**
 * Export orders data to CSV or Excel format
 * @param {Object} params - Export parameters (format, filters, etc.)
 * @returns {Promise<Blob>} Exported file data as blob
 */
export const exportOrders = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/orders/export${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to export orders");
    }

    return await response.blob();
  } catch (error) {
    console.error("Export orders error:", error);
    throw error;
  }
};

/**
 * Get order analytics for sales reports
 * @param {Object} params - Query parameters (time period, grouping, etc.)
 * @returns {Promise<Object>} Order analytics data
 */
export const getOrderAnalytics = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/orders/analytics${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to get order analytics");
    }

    return await response.json();
  } catch (error) {
    console.error("Get order analytics error:", error);
    throw error;
  }
};

/**
 * Get sales performance by representative
 * @param {Object} params - Query parameters (time period, etc.)
 * @returns {Promise<Object>} Sales rep performance data
 */
export const getSalesRepPerformance = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/orders/sales-rep-performance${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to get sales rep performance"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Get sales rep performance error:", error);
    throw error;
  }
};
