import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Import custom hooks and services
import { useAuth } from "../context/AuthContext"; // Import useAuth hook for permission checks
import { getAllVehicles } from "../services/driverApi"; // API service to fetch vehicle data
import { COLORS } from "../theme/colors"; // Color constants for styling

// Define the structure of a Vehicle object with TypeScript interface
interface Vehicle {
  vehicle_id: string;
  name: string;
  registration_number: string;
  vehicle_type: string;
  capacity: string;
  status: string;
  current_assignment?: {
    delivery_id: string;
    driver_name: string;
  };
}

// Main component for the Vehicle List screen
export default function VehicleListScreen() {
  // State management using React hooks
  const { hasPermission } = useAuth(); // Custom hook to check user permissions
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Holds the list of vehicles
  const [loading, setLoading] = useState(true); // Manages loading state for initial fetch
  const [refreshing, setRefreshing] = useState(false); // Manages loading state for pull-to-refresh
  const [error, setError] = useState<string | null>(null); // Stores any error messages
  const [searchQuery, setSearchQuery] = useState(""); // Stores the user's search input

  // Effect hook to check for user permissions when the component mounts
  useEffect(() => {
    // Check if the user has permission to view deliveries
    if (!hasPermission("view_deliveries")) {
      // If not, show an alert and navigate back
      Alert.alert(
        "Permission Denied",
        "You don't have permission to view vehicle information.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]); // Dependency array ensures this runs when hasPermission changes

  // Function to fetch vehicles from the API
  const loadVehicles = async (showRefreshing = false) => {
    try {
      setError(null); // Reset error state before fetching
      if (showRefreshing) setRefreshing(true); // Show pull-to-refresh indicator

      console.log("Fetching vehicles...");
      const data = await getAllVehicles(); // Call the API to get vehicle data
      console.log("Vehicles data received:", data);
      setVehicles(data || []); // Update state with fetched data, or an empty array if no data
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
      // Set an error message if fetching fails
      setError(err.message || "Could not load vehicles. Please try again.");
    } finally {
      // Stop loading indicators
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  // Effect hook to load vehicle data when the component first mounts
  useEffect(() => {
    loadVehicles();
  }, []); // Empty dependency array means this runs only once on mount

  // Handler for the pull-to-refresh action
  const onRefresh = () => {
    loadVehicles(true); // Reload vehicles and show the refresh indicator
  };

  // Filter the vehicles based on the search query
  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchTerms = searchQuery.toLowerCase().trim().split(" "); // Split query into terms for multi-word search

    // Check if the vehicle matches all search terms
    return searchTerms.every((term) => {
      return (
        vehicle.name.toLowerCase().includes(term) ||
        vehicle.registration_number.toLowerCase().includes(term) ||
        vehicle.vehicle_type.toLowerCase().includes(term)
      );
    });
  });

  // Display a loading indicator while fetching data for the first time
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicles</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Loading Animation */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main screen layout
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Custom Header Component */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicles</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar for filtering vehicles */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6c757d"
          />
          {/* Show a clear button if there is a search query */}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of vehicles */}
      <FlatList
        data={filteredVehicles} // Use the filtered list of vehicles
        keyExtractor={(item) => item.vehicle_id} // Unique key for each item
        contentContainerStyle={styles.listContent}
        // Enable pull-to-refresh
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        // Component to show when the list is empty
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={60}
              color="#CED4DA"
            />
            <Text style={styles.emptyText}>
              {error ? error : "No vehicles found"}{" "}
              {/* Show error or "no vehicles" message */}
            </Text>
            {/* Show a retry button if there was an error */}
            {error && (
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        // How to render each item in the list
        renderItem={({ item }) => (
          <View style={styles.vehicleCard}>
            {/* Vehicle Header Section */}
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleIconContainer}>
                <MaterialCommunityIcons
                  name="truck"
                  size={20}
                  color={COLORS.light}
                />
              </View>
              <View style={styles.vehicleInfoContainer}>
                <Text style={styles.vehicleName}>{item.name}</Text>
                <Text style={styles.vehicleRegistration}>
                  {item.registration_number}
                </Text>
              </View>
              {/* Status Badge (e.g., "On Route" or "Available") */}
              <View
                style={[
                  styles.statusBadge,
                  item.status === "on_route"
                    ? styles.activeStatusBadge
                    : styles.idleStatusBadge,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    item.status === "on_route" ? null : styles.idleDot,
                  ]}
                />
                <Text
                  style={
                    item.status === "on_route"
                      ? styles.activeStatusText
                      : styles.idleStatusText
                  }
                >
                  {item.status === "on_route" ? "On Route" : "Available"}
                </Text>
              </View>
            </View>

            {/* Vehicle Details Section */}
            <View style={styles.vehicleDetails}>
              <View style={styles.detailItem}>
                <MaterialIcons name="category" size={16} color="#6c757d" />
                <Text style={styles.detailText}>
                  Type: {item.vehicle_type || "Not specified"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Feather name="package" size={16} color="#6c757d" />
                <Text style={styles.detailText}>
                  Capacity: {item.capacity || "Not specified"}
                </Text>
              </View>

              {/* Show current assignment if the vehicle is assigned */}
              {item.current_assignment && (
                <View style={styles.assignmentContainer}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="person" size={16} color="#3498DB" />
                    <Text style={[styles.detailText, { color: "#3498DB" }]}>
                      Assigned to: {item.current_assignment.driver_name}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {/* Floating Action Button (FAB) to add a new vehicle */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("../(drivers)/vehicle-add")} // Navigate to the add vehicle screen
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// StyleSheet for all the component's styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background for the screen
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary, // Use primary color for the header background
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight! + 16 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#495057",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Add padding to the bottom to avoid FAB overlap
  },
  vehicleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2, // Android shadow
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleInfoContainer: {
    flex: 1, // Take up remaining space
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  vehicleRegistration: {
    fontSize: 14,
    color: "#6c757d",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeStatusBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)", // Light green for active status
  },
  idleStatusBadge: {
    backgroundColor: "rgba(243, 156, 18, 0.1)", // Light orange for idle status
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2ECC71", // Green dot for active
    marginRight: 6,
  },
  idleDot: {
    backgroundColor: "#F39C12", // Orange dot for idle
  },
  activeStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2ECC71",
  },
  idleStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F39C12",
  },
  vehicleDetails: {
    backgroundColor: "rgba(248, 249, 250, 0.5)", // Very light gray background for details section
    padding: 12,
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
  },
  assignmentContainer: {
    backgroundColor: "rgba(52, 152, 219, 0.05)", // Light blue for assignment info
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  fab: {
    position: "absolute", // Position it over the content
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
