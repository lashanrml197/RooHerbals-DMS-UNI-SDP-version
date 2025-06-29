import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.129.254:3000/api";

// Helper function to get auth headers
const getAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  } catch (error) {
    console.error("Error getting auth headers:", error);
    throw error;
  }
};

/**
 * Get dashboard statistics for lorry driver management
 */
export const getDriverDashboardStats = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/dashboard`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to fetch driver dashboard stats"
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching driver dashboard stats:", error);
    throw error;
  }
};

/**
 * Get all drivers (lorry drivers)
 */
export const getAllDrivers = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/drivers`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch drivers");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching all drivers:", error);
    throw error;
  }
};

/**
 * Get driver details by ID
 */
export const getDriverById = async (driverId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/drivers/${driverId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch driver details");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching driver details:", error);
    throw error;
  }
};

/**
 * Add a new driver
 */
export const addDriver = async (driverData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/drivers`, {
      method: "POST",
      headers,
      body: JSON.stringify(driverData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add driver");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error adding driver:", error);
    throw error;
  }
};

/**
 * Update driver details
 */
export const updateDriver = async (driverId, driverData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/drivers/${driverId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(driverData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update driver");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating driver:", error);
    throw error;
  }
};

/**
 * Toggle driver active status
 */
export const toggleDriverStatus = async (driverId, isActive) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/drivers/drivers/${driverId}/toggle-status`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ is_active: isActive }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to toggle driver status");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error toggling driver status:", error);
    throw error;
  }
};

/**
 * Get all vehicles
 */
export const getAllVehicles = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/vehicles`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch vehicles");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching all vehicles:", error);
    throw error;
  }
};

/**
 * Get vehicle details by ID
 */
export const getVehicleById = async (vehicleId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/vehicles/${vehicleId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch vehicle details");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching vehicle details:", error);
    throw error;
  }
};

/**
 * Add a new vehicle
 */
export const addVehicle = async (vehicleData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify(vehicleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add vehicle");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error adding vehicle:", error);
    throw error;
  }
};

/**
 * Update vehicle details
 */
export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/vehicles/${vehicleId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(vehicleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update vehicle");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

/**
 * Get all deliveries with optional filters
 */
export const getDeliveries = async (filters = {}) => {
  try {
    const headers = await getAuthHeaders();

    // Build query string from filters object
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const url = `${API_URL}/drivers/deliveries${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch deliveries");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    throw error;
  }
};

/**
 * Get delivery details by ID
 */
export const getDeliveryById = async (deliveryId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/drivers/deliveries/${deliveryId}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch delivery details");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching delivery details:", error);
    throw error;
  }
};

/**
 * Create a new delivery
 */
export const createDelivery = async (deliveryData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/deliveries`, {
      method: "POST",
      headers,
      body: JSON.stringify(deliveryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create delivery");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating delivery:", error);
    throw error;
  }
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (deliveryId, statusData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/drivers/deliveries/${deliveryId}/status`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(statusData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update delivery status");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating delivery status:", error);
    throw error;
  }
};

/**
 * Get driver's delivery schedule
 */
export const getDriverSchedule = async (driverId, date) => {
  try {
    const headers = await getAuthHeaders();

    const url = date
      ? `${API_URL}/drivers/drivers/${driverId}/schedule?date=${date}`
      : `${API_URL}/drivers/drivers/${driverId}/schedule`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch driver schedule");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching driver schedule:", error);
    throw error;
  }
};

/**
 * Get vehicle maintenance alerts
 */
export const getMaintenanceAlerts = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/drivers/maintenance-alerts`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch maintenance alerts");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching maintenance alerts:", error);
    throw error;
  }
};
