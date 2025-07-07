import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.3:3000/api";

// Get authenticated fetch headers
const getHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return {
      "Content-Type": "application/json",
    };
  }
};

// Get customers for selection
export const getCustomers = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/addorder/customers`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch customers");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Get customers error:", error);
    throw error;
  }
};

// Get products for order creation
export const getProducts = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/addorder/products`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch products");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Get products error:", error);
    throw error;
  }
};

// Get batches for a specific product
export const getProductBatches = async (productId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${API_URL}/addorder/products/${productId}/batches`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch product batches");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Get product batches error:", error);
    throw error;
  }
};

// Get customer's previous orders for return selection
export const getCustomerOrders = async (customerId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${API_URL}/addorder/customers/${customerId}/orders`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch customer orders");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Get customer orders error:", error);
    throw error;
  }
};

// Get order items for a specific order (for returns)
export const getOrderItems = async (orderId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${API_URL}/addorder/orders/${orderId}/items`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch order items");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Get order items error:", error);
    throw error;
  }
};

// Create new order with optional returns
export const createOrder = async (orderData) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/addorder/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle specific error types
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      } else if (response.status === 403) {
        throw new Error("You don't have permission to create orders.");
      } else {
        throw new Error(error.message || "Failed to create order");
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create order error:", error);
    throw error;
  }
};
