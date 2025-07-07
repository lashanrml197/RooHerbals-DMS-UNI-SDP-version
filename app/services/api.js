import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.3:3000/api";

// Get authenticated fetch headers
export const getAuthHeaders = async () => {
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

// Login function
export const login = async (username, password, userType) => {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, userType }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Save token and user data to AsyncStorage
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Logout function
export const logout = async () => {
  try {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Check if user is logged in
export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    return !!token; // Convert to boolean
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
};

// Get current user from local storage
export const getCurrentUser = async () => {
  try {
    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
};

// Get user profile with updated information from the server
export const getUserProfile = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/profile`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch user profile");
    }

    const profileData = await response.json();

    // Update the stored user data with the latest from the server
    await AsyncStorage.setItem("user", JSON.stringify(profileData));

    return profileData;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

// Test password hashing functionality
export const testPasswordHash = async (password) => {
  try {
    const response = await fetch(`${API_URL}/test-password/${password}`);
    if (!response.ok) {
      throw new Error("Failed to test password hash");
    }
    return await response.json();
  } catch (error) {
    console.error("Password hash test error:", error);
    throw error;
  }
};

// Customer Management Functions

// Get customer dashboard stats
export const getCustomerStats = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Requesting: ${API_URL}/customers/stats`);

    const response = await fetch(`${API_URL}/customers/stats`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customer stats");
    }

    console.log("Successfully fetched customer stats:", data);
    return data;
  } catch (error) {
    console.error("Get customer stats error:", error);
    throw error;
  }
};

// Get all customers
export const getAllCustomers = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Requesting: ${API_URL}/customers`);

    const response = await fetch(`${API_URL}/customers`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customers");
    }

    console.log("Successfully fetched customers list");
    return data;
  } catch (error) {
    console.error("Get customers error:", error);
    throw error;
  }
};

// Add a new customer - used in the customer-add.tsx
export const createCustomer = async (customerData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Creating customer with data:`, customerData);
    console.log(`registered_by value:`, customerData.registered_by);

    const response = await fetch(`${API_URL}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify(customerData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to create customer");
    }

    console.log("Customer created successfully:", data);
    return data;
  } catch (error) {
    console.error("Create customer error:", error);
    throw error;
  }
};

// Alias for createCustomer to maintain backward compatibility
export const addCustomer = createCustomer;

// Get customer details by ID
export const getCustomerById = async (customerId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching details for customer: ${customerId}`);

    const response = await fetch(`${API_URL}/customers/${customerId}`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customer details");
    }

    console.log("Customer details received:", data);
    return data;
  } catch (error) {
    console.error("Get customer details error:", error);
    throw error;
  }
};

// Update customer
export const updateCustomer = async (customerId, customerData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Updating customer: ${customerId}`);
    console.log("Update data:", customerData);

    const response = await fetch(`${API_URL}/customers/${customerId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(customerData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to update customer");
    }

    console.log("Customer updated successfully");
    return data;
  } catch (error) {
    console.error("Update customer error:", error);
    throw error;
  }
};

// Delete customer
export const deleteCustomer = async (customerId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Deleting customer: ${customerId}`);

    const response = await fetch(`${API_URL}/customers/${customerId}`, {
      method: "DELETE",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to delete customer");
    }

    console.log("Customer deleted successfully");
    return data;
  } catch (error) {
    console.error("Delete customer error:", error);
    throw error;
  }
};

// Get customer orders
export const getCustomerOrders = async (customerId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching orders for customer: ${customerId}`);

    const response = await fetch(`${API_URL}/customers/${customerId}/orders`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customer orders");
    }

    console.log(
      `Retrieved ${data.orders?.length || 0} orders for customer ${customerId}`
    );
    return data;
  } catch (error) {
    console.error("Get customer orders error:", error);
    throw error;
  }
};

// Get customer payments
export const getCustomerPayments = async (customerId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching payments for customer: ${customerId}`);

    const response = await fetch(
      `${API_URL}/customers/${customerId}/payments`,
      {
        method: "GET",
        headers,
      }
    );

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customer payments");
    }

    console.log(
      `Retrieved ${
        data.payments?.length || 0
      } payments for customer ${customerId}`
    );
    return data;
  } catch (error) {
    console.error("Get customer payments error:", error);
    throw error;
  }
};

// Get customer credits
export const getCustomerCredits = async (customerId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching credits for customer: ${customerId}`);

    const response = await fetch(`${API_URL}/customers/${customerId}/credits`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customer credits");
    }

    console.log(`Retrieved credit information for customer ${customerId}`);
    return data;
  } catch (error) {
    console.error("Get customer credits error:", error);
    throw error;
  }
};

// Update customer credit limit
export const updateCustomerCredit = async (customerId, creditData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Updating credit for customer: ${customerId}`);
    console.log("Credit update data:", creditData);

    const response = await fetch(`${API_URL}/customers/${customerId}/credit`, {
      method: "PUT",
      headers,
      body: JSON.stringify(creditData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to update customer credit limit");
    }

    console.log("Customer credit limit updated successfully");
    return data;
  } catch (error) {
    console.error("Update customer credit error:", error);
    throw error;
  }
};

// Record new payment - UPDATED FUNCTION
export const recordPayment = async (paymentData) => {
  try {
    const headers = await getAuthHeaders();

    // Get current user to set as received_by
    const currentUser = await getCurrentUser(); // Add the user_id of current user as received_by
    // Handle both possible user ID formats (id or user_id)
    const userId =
      currentUser?.user_id ||
      currentUser?.id ||
      paymentData?.received_by ||
      null;

    const paymentDataWithUser = {
      ...paymentData,
      received_by: userId,
    };

    // Log the source of user ID for debugging
    if (userId) {
      console.log(
        `Using user ID: ${userId} (from ${
          currentUser?.user_id
            ? "user_id"
            : currentUser?.id
            ? "id"
            : "provided in payment data"
        })`
      );
    } else {
      console.warn("No user ID available for payment");
    }
    console.log(`Recording new payment:`, paymentDataWithUser);
    console.log(`Current user for payment: ${JSON.stringify(currentUser)}`);

    // First, get the order to find the customer_id
    const orderResponse = await fetch(
      `${API_URL}/orders/${paymentDataWithUser.order_id}`,
      {
        method: "GET",
        headers,
      }
    );

    console.log("Order fetch response status:", orderResponse.status);

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("Error fetching order:", errorText);
      throw new Error(`Failed to fetch order: ${orderResponse.status}`);
    }

    const orderData = await orderResponse.json();
    const customerId = orderData.customer_id;

    console.log(
      `Found customer ID for order ${paymentData.order_id}: ${customerId}`
    ); // Then use the correct endpoint with the customer ID
    const response = await fetch(
      `${API_URL}/customers/${customerId}/payments`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(paymentDataWithUser),
      }
    );
    console.log("Payment response status:", response.status);

    // Handle non-JSON responses
    if (!response.ok) {
      const responseText = await response.text();
      console.error("Error response:", responseText);
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Payment recorded successfully:", data.payment?.payment_id);
    console.log("Payment received by:", paymentDataWithUser.received_by);
    console.log("Payment response data:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("Record payment error:", error);
    throw error;
  }
};

// Get recent activities
export const getRecentActivities = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching recent activities`);

    const response = await fetch(`${API_URL}/activities/recent`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch recent activities");
    }

    console.log(`Retrieved ${data.length || 0} recent activities`);
    return data;
  } catch (error) {
    console.error("Get recent activities error:", error);
    throw error;
  }
};

// Search customers
export const searchCustomers = async (query, filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query parameters
    let queryString = query ? `query=${encodeURIComponent(query)}` : "";

    // Add additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (queryString) queryString += "&";
      queryString += `${key}=${encodeURIComponent(value)}`;
    });

    const url = `${API_URL}/customers/search${
      queryString ? `?${queryString}` : ""
    }`;

    console.log(`Searching customers: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to search customers");
    }

    console.log(`Search returned ${data.customers?.length || 0} results`);
    return data;
  } catch (error) {
    console.error("Search customers error:", error);
    throw error;
  }
};

// Get customer areas (for filtering)
export const getCustomerAreas = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching customer areas`);

    const response = await fetch(`${API_URL}/customers/areas`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch customer areas");
    }

    console.log(`Retrieved ${data.length || 0} customer areas`);
    return data;
  } catch (error) {
    console.error("Get customer areas error:", error);
    throw error;
  }
};

// Product Management Functions

// Get all products
export const getAllProducts = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching all products`);

    const response = await fetch(`${API_URL}/products`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch products");
    }

    console.log(`Retrieved ${data.products?.length || 0} products`);
    return data;
  } catch (error) {
    console.error("Get products error:", error);
    throw error;
  }
};

// Get product by ID
export const getProductById = async (productId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching product: ${productId}`);

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch product details");
    }

    console.log(`Retrieved details for product ${productId}`);
    return data;
  } catch (error) {
    console.error("Get product details error:", error);
    throw error;
  }
};

// Order Management Functions

// Create new order
export const createOrder = async (orderData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Creating new order:`, orderData);

    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to create order");
    }

    console.log("Order created successfully:", data.order?.order_id);
    return data;
  } catch (error) {
    console.error("Create order error:", error);
    throw error;
  }
};

// Get order by ID
export const getOrderById = async (orderId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching order: ${orderId}`);

    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch order details");
    }

    console.log(`Retrieved details for order ${orderId}`);
    return data;
  } catch (error) {
    console.error("Get order details error:", error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (orderId, statusData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Updating status for order: ${orderId}`);
    console.log("Status update data:", statusData);

    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify(statusData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to update order status");
    }

    console.log(`Status updated for order ${orderId}`);
    return data;
  } catch (error) {
    console.error("Update order status error:", error);
    throw error;
  }
};

// Get all orders (with optional filters)
export const getAllOrders = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Convert filters object to query string
    const queryParams = Object.entries(filters)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const url = `${API_URL}/orders${queryParams ? `?${queryParams}` : ""}`;

    console.log(`Fetching orders: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch orders");
    }

    console.log(`Retrieved ${data.length || 0} orders`);
    return data;
  } catch (error) {
    console.error("Get orders error:", error);
    throw error;
  }
};

// Get order statistics
export const getOrderStats = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching order statistics`);

    const response = await fetch(`${API_URL}/orders/stats`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch order statistics");
    }

    console.log("Order statistics fetched successfully");
    return data;
  } catch (error) {
    console.error("Get order statistics error:", error);
    throw error;
  }
};

// Process payment for order
export const processOrderPayment = async (orderId, paymentData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Processing payment for order ${orderId}:`, paymentData);

    const response = await fetch(`${API_URL}/orders/${orderId}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to process payment");
    }

    console.log("Payment processed successfully");
    return data;
  } catch (error) {
    console.error("Process payment error:", error);
    throw error;
  }
};

// Process returns for order
export const processOrderReturn = async (orderId, returnData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Processing return for order ${orderId}:`, returnData);

    const response = await fetch(`${API_URL}/orders/${orderId}/returns`, {
      method: "POST",
      headers,
      body: JSON.stringify(returnData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to process return");
    }

    console.log("Return processed successfully");
    return data;
  } catch (error) {
    console.error("Process return error:", error);
    throw error;
  }
};

// Report Functions

// Get sales report
export const getSalesReport = async (startDate, endDate, filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query parameters
    let queryParams = `startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}`;

    // Add additional filters
    Object.entries(filters).forEach(([key, value]) => {
      queryParams += `&${key}=${encodeURIComponent(value)}`;
    });

    console.log(`Fetching sales report: ${queryParams}`);

    const response = await fetch(`${API_URL}/reports/sales?${queryParams}`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch sales report");
    }

    console.log("Sales report fetched successfully");
    return data;
  } catch (error) {
    console.error("Get sales report error:", error);
    throw error;
  }
};

// Get inventory report
export const getInventoryReport = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Convert filters object to query string
    const queryParams = Object.entries(filters)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const url = `${API_URL}/reports/inventory${
      queryParams ? `?${queryParams}` : ""
    }`;

    console.log(`Fetching inventory report: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch inventory report");
    }

    console.log("Inventory report fetched successfully");
    return data;
  } catch (error) {
    console.error("Get inventory report error:", error);
    throw error;
  }
};

// Supplier Functions

// Get all suppliers
export const getAllSuppliers = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching all suppliers`);

    const response = await fetch(`${API_URL}/suppliers`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch suppliers");
    }

    console.log(`Retrieved ${data.suppliers?.length || 0} suppliers`);
    return data;
  } catch (error) {
    console.error("Get suppliers error:", error);
    throw error;
  }
};

// Get supplier by ID
export const getSupplierById = async (supplierId) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching supplier: ${supplierId}`);

    const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch supplier details");
    }

    console.log(`Retrieved details for supplier ${supplierId}`);
    return data;
  } catch (error) {
    console.error("Get supplier details error:", error);
    throw error;
  }
};

// Create new supplier
export const createSupplier = async (supplierData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Creating supplier:`, supplierData);

    const response = await fetch(`${API_URL}/suppliers`, {
      method: "POST",
      headers,
      body: JSON.stringify(supplierData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to create supplier");
    }

    console.log("Supplier created successfully:", data.supplier?.supplier_id);
    return data;
  } catch (error) {
    console.error("Create supplier error:", error);
    throw error;
  }
};

// Purchase Order Functions

// Create purchase order
export const createPurchaseOrder = async (poData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Creating purchase order:`, poData);

    const response = await fetch(`${API_URL}/purchase-orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(poData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to create purchase order");
    }

    console.log("Purchase order created successfully:", data.po?.po_id);
    return data;
  } catch (error) {
    console.error("Create purchase order error:", error);
    throw error;
  }
};

// Get purchase orders
export const getPurchaseOrders = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Convert filters object to query string
    const queryParams = Object.entries(filters)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const url = `${API_URL}/purchase-orders${
      queryParams ? `?${queryParams}` : ""
    }`;

    console.log(`Fetching purchase orders: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch purchase orders");
    }

    console.log(
      `Retrieved ${data.purchaseOrders?.length || 0} purchase orders`
    );
    return data;
  } catch (error) {
    console.error("Get purchase orders error:", error);
    throw error;
  }
};

// Update purchase order status
export const updatePurchaseOrderStatus = async (poId, statusData) => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Updating status for purchase order: ${poId}`);
    console.log("Status update data:", statusData);

    const response = await fetch(`${API_URL}/purchase-orders/${poId}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify(statusData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to update purchase order status");
    }

    console.log(`Status updated for purchase order ${poId}`);
    return data;
  } catch (error) {
    console.error("Update purchase order status error:", error);
    throw error;
  }
};

export const getDashboardStats = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log(`Fetching dashboard statistics`);

    const response = await fetch(`${API_URL}/users/dashboard`, {
      method: "GET",
      headers,
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to fetch dashboard statistics");
    }

    console.log("Dashboard statistics fetched successfully");
    return data;
  } catch (error) {
    console.error("Get dashboard statistics error:", error);
    throw error;
  }
};
