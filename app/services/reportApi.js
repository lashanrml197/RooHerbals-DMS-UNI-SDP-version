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

// Get dashboard stats for reports landing page
export const getDashboardStats = async () => {
  try {
    const headers = await getAuthHeaders();
    console.log("Making request to:", `${API_URL}/reports/dashboard-stats`);

    const response = await fetch(`${API_URL}/reports/dashboard-stats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Dashboard stats received:", data);
    return data;
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    throw error;
  }
};

// Get sales reports data
export const getSalesReports = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string from params
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/reports/sales${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    console.log("Making request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get sales reports error:", error);
    throw error;
  }
};

// Get inventory reports data
export const getInventoryReports = async () => {
  try {
    const headers = await getAuthHeaders();
    console.log("Making request to:", `${API_URL}/reports/inventory`);

    const response = await fetch(`${API_URL}/reports/inventory`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Ensure numeric values are correctly parsed
    if (data.lowStockProducts) {
      data.lowStockProducts.forEach((product) => {
        product.total_stock = parseFloat(product.total_stock);
        product.reorder_level = parseFloat(product.reorder_level);
      });
    }

    if (data.expiringBatches) {
      data.expiringBatches.forEach((batch) => {
        batch.current_quantity = parseInt(batch.current_quantity || 0);
      });
    }

    if (data.stockByCategory) {
      data.stockByCategory.forEach((category) => {
        category.stock_value = parseFloat(category.stock_value || 0);
        if (category.product_count) {
          category.product_count = parseInt(category.product_count);
        }
      });
    }

    if (data.topMovingProducts) {
      data.topMovingProducts.forEach((product) => {
        product.quantity_sold = parseInt(product.quantity_sold || 0);
      });
    }

    if (data.slowMovingProducts) {
      data.slowMovingProducts.forEach((product) => {
        product.quantity_sold = parseInt(product.quantity_sold || 0);
      });
    }

    return data;
  } catch (error) {
    console.error("Get inventory reports error:", error);
    throw error;
  }
};

// Get customer reports data
export const getCustomerReports = async () => {
  try {
    const headers = await getAuthHeaders();
    console.log("Making request to:", `${API_URL}/reports/customers`);

    const response = await fetch(`${API_URL}/reports/customers`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Ensure numeric values are correctly parsed
    if (data.topCustomers) {
      data.topCustomers.forEach((customer) => {
        customer.order_count = parseInt(customer.order_count || 0);
        customer.total_spent = parseFloat(customer.total_spent || 0);
      });
    }

    if (data.creditCustomers) {
      data.creditCustomers.forEach((customer) => {
        customer.credit_balance = parseFloat(customer.credit_balance || 0);
        customer.credit_limit = parseFloat(customer.credit_limit || 0);
        customer.credit_usage_percent = parseFloat(
          customer.credit_usage_percent || 0
        );
      });
    }

    if (data.customerAcquisition) {
      data.customerAcquisition.forEach((item) => {
        item.new_customers = parseInt(item.new_customers || 0);
      });
    }

    if (data.salesByArea) {
      data.salesByArea.forEach((area) => {
        area.customer_count = parseInt(area.customer_count || 0);
        area.order_count = parseInt(area.order_count || 0);
        area.total_sales = parseFloat(area.total_sales || 0);
      });
    }

    return data;
  } catch (error) {
    console.error("Get customer reports error:", error);
    throw error;
  }
};

// Get commission reports data
export const getCommissionReports = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string from params
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${API_URL}/reports/commissions${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    console.log("Making request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Process the data to ensure all numeric values are correctly parsed
    if (data && data.repCommissions) {
      data.repCommissions.forEach((rep) => {
        rep.total_sales = parseFloat(String(rep.total_sales || 0));
        rep.commission_amount = parseFloat(String(rep.commission_amount || 0));
        rep.commission_rate = parseFloat(String(rep.commission_rate || 0));
      });
    }

    if (data && data.commissionHistory) {
      data.commissionHistory.forEach((history) => {
        history.total_sales = parseFloat(String(history.total_sales || 0));
        history.total_commission = parseFloat(
          String(history.total_commission || 0)
        );
        history.avg_commission_rate = parseFloat(
          String(history.avg_commission_rate || 0)
        );
        history.rep_count = parseInt(String(history.rep_count || 0));
        history.month = parseInt(String(history.month || 0));
        history.year = parseInt(String(history.year || 0));
      });
    }

    return data;
  } catch (error) {
    console.error("Get commission reports error:", error);
    throw error;
  }
};

// Get daily sales report
export const getDailySalesReport = async (date) => {
  try {
    const headers = await getAuthHeaders();

    const queryParams = date ? `?date=${date}` : "";
    const url = `${API_URL}/reports/daily-sales${queryParams}`;
    console.log("Making request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Get daily sales report error:", error);
    throw error;
  }
};

// Export data
export const exportData = async (type, format = "json", startDate, endDate) => {
  try {
    const headers = await getAuthHeaders();

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("type", type);

    if (format) {
      queryParams.append("format", format);
    }

    if (startDate) {
      queryParams.append("startDate", startDate);
    }

    if (endDate) {
      queryParams.append("endDate", endDate);
    }

    const url = `${API_URL}/reports/export?${queryParams.toString()}`;
    console.log("Making export request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Export data error:", error);
    throw error;
  }
};

// Date utility functions
export const getFirstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .split("T")[0];
};

export const getLastDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
};

export const formatDate = (dateString) => {
  if (!dateString) return "";

  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return "Rs. 0";

  // Parse the amount as a number, handling string values if necessary
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  // Check if it's a valid number
  if (isNaN(numericAmount)) return "Rs. 0";

  // Format with no decimal places
  return `Rs. ${Math.round(numericAmount).toLocaleString("en-US")}`;
};

export const getMonthOptions = () => {
  return [
    { label: "January", value: 1 },
    { label: "February", value: 2 },
    { label: "March", value: 3 },
    { label: "April", value: 4 },
    { label: "May", value: 5 },
    { label: "June", value: 6 },
    { label: "July", value: 7 },
    { label: "August", value: 8 },
    { label: "September", value: 9 },
    { label: "October", value: 10 },
    { label: "November", value: 11 },
    { label: "December", value: 12 },
  ];
};

export const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};

export const getCurrentYear = () => {
  return new Date().getFullYear();
};

export const getYearOptions = () => {
  const currentYear = getCurrentYear();
  return [
    { label: `${currentYear - 1}`, value: currentYear - 1 },
    { label: `${currentYear}`, value: currentYear },
  ];
};
