import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.3:3000/api";

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// Get all sales representatives
export const getAllSalesReps = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch sales representatives");
    }

    return data;
  } catch (error) {
    console.error("Error fetching sales representatives:", error);
    throw error;
  }
};

// Get sales rep dashboard stats
export const getSalesRepStats = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps/stats`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch sales rep dashboard stats"
      );
    }

    return data;
  } catch (error) {
    console.error("Error fetching sales rep dashboard stats:", error);
    throw error;
  }
};

// Get a specific sales representative by ID
export const getSalesRepById = async (salesRepId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps/${salesRepId}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch sales representative");
    }

    return data;
  } catch (error) {
    console.error("Error fetching sales representative:", error);
    throw error;
  }
};

// Add a new sales representative
export const addSalesRep = async (salesRepData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps`, {
      method: "POST",
      headers,
      body: JSON.stringify(salesRepData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add sales representative");
    }

    return data;
  } catch (error) {
    console.error("Error adding sales representative:", error);
    throw error;
  }
};

// Update a sales representative
export const updateSalesRep = async (salesRepId, salesRepData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps/${salesRepId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(salesRepData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update sales representative");
    }

    return data;
  } catch (error) {
    console.error("Error updating sales representative:", error);
    throw error;
  }
};

// Get sales statistics for a specific sales rep
export const getSalesRepDetailStats = async (salesRepId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps/${salesRepId}/stats`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch sales rep statistics");
    }

    return data;
  } catch (error) {
    console.error("Error fetching sales rep statistics:", error);
    throw error;
  }
};

// Get commissions for a specific sales rep
export const getSalesRepCommissions = async (salesRepId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/salesreps/${salesRepId}/commissions`,
      {
        method: "GET",
        headers,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch sales rep commissions");
    }

    return data;
  } catch (error) {
    console.error("Error fetching sales rep commissions:", error);
    throw error;
  }
};

// Calculate commission for a specific sales rep for a month/year
export const calculateCommission = async (salesRepId, month, year) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/salesreps/${salesRepId}/commissions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ month, year }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Check for specific business rule failures
      if (data.message && data.message.includes("sales amount is 0")) {
        const error = new Error(data.message);
        error.noSales = true; // Add a flag to easily identify this specific error
        throw error;
      } else if (
        data.message &&
        data.message.includes("after the month has ended")
      ) {
        const error = new Error(data.message);
        error.monthNotEnded = true; // Flag for month not ended error
        throw error;
      } else {
        throw new Error(data.message || "Failed to calculate commission");
      }
    }

    return data;
  } catch (error) {
    // Only log with console.error if it's not a "no sales" business logic error
    if (!error.noSales) {
      console.error("Error calculating commission:", error);
    }
    throw error;
  }
};

// Update commission status (approve/pay)
export const updateCommissionStatus = async (
  salesRepId,
  commissionId,
  status,
  payment_date
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/salesreps/${salesRepId}/commissions/${commissionId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ status, payment_date }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update commission status");
    }

    return data;
  } catch (error) {
    console.error("Error updating commission status:", error);
    throw error;
  }
};
// Get all orders for a specific sales rep
export const getSalesRepAllOrders = async (salesRepId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/salesreps/${salesRepId}/orders`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch sales rep orders");
    }

    return data;
  } catch (error) {
    console.error("Error fetching sales rep orders:", error);
    throw error;
  }
};
