// Import necessary icons, navigation, and React hooks
import {
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import custom hooks and services
import { useAuth } from "../context/AuthContext"; // Import auth context
import { getDriverDashboardStats } from "../services/driverApi";
import { COLORS } from "../theme/colors";

// Define the structure for individual delivery data
interface DeliveryData {
  delivery_id: string;
  order_id: string;
  customer_name: string;
  driver_name: string;
  vehicle_name: string;
  status: string;
  scheduled_date: string;
  amount: number;
  location: string;
}

// Define the structure for individual vehicle data, including optional assignment details
interface VehicleData {
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

// Combine all dashboard data types into a single interface
interface DashboardData {
  todayDeliveriesCount: number;
  activeVehiclesCount: number;
  deliveries: DeliveryData[];
  vehicles: VehicleData[];
}

// The main component for the Lorry Drivers screen
export default function LorryDriversScreen() {
  const { hasPermission } = useAuth(); // Hook to check user permissions
  const [loading, setLoading] = useState(true); // State for initial loading indicator
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh indicator
  const [error, setError] = useState<string | null>(null); // State to hold any errors
  // State to store the fetched dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todayDeliveriesCount: 0,
    activeVehiclesCount: 0,
    deliveries: [],
    vehicles: [],
  });

  // Effect hook to check if the user has permission to view this screen
  useEffect(() => {
    if (!hasPermission("view_deliveries")) {
      // If not, show an alert and navigate back
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access delivery management.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Function to get a time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Async function to fetch dashboard data from the API
  const fetchDashboardData = async () => {
    try {
      setError(null); // Clear previous errors
      setRefreshing(true); // Show the refresh indicator

      console.log("Fetching lorry driver dashboard data...");
      const data = await getDriverDashboardStats(); // API call
      console.log("Dashboard data received:", data);

      setDashboardData(data); // Update state with fetched data
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      // Set an error message if fetching fails
      setError(
        err.message || "Could not load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handler for the pull-to-refresh action
  const onRefresh = () => {
    fetchDashboardData();
  };

  // Display a loading indicator while the initial data is being fetched
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        {/* Loading Spinner */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading lorry driver data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Display an error message if data fetching fails
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        {/* Error Message */}
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={60}
            color={COLORS.dark}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchDashboardData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main component render
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.companyName}>Roo Herbals</Text>
        </View>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RH</Text>
        </View>
      </View>
      {/* Scrollable content area */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick statistics cards */}
        <View style={styles.statsCardsContainer}>
          {/* Card for Today's Deliveries */}
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="truck-delivery"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>
                {dashboardData.todayDeliveriesCount}
              </Text>
              <Text style={styles.statsLabel}>Today&apos;s Deliveries</Text>
            </View>
          </View>

          {/* Card for Active Vehicles */}
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="truck"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>
                {dashboardData.activeVehiclesCount}
              </Text>
              <Text style={styles.statsLabel}>Active Vehicles</Text>
            </View>
          </View>
        </View>

        {/* Section title for driver management */}
        <Text style={styles.sectionTitle}>Lorry Driver Management</Text>

        {/* Grid of quick action cards */}
        <View style={styles.actionsContainer}>
          {/* Navigate to Drivers List */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(drivers)/driver-list")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#4ECDC4" },
              ]}
            >
              <FontAwesome5 name="id-card" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Drivers List</Text>
            <Text style={styles.actionDescription}>View all drivers</Text>
          </TouchableOpacity>

          {/* Navigate to Add New Driver screen */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(drivers)/driver-add")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FF7675" },
              ]}
            >
              <MaterialIcons
                name="person-add-alt-1"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Add Driver</Text>
            <Text style={styles.actionDescription}>Register new driver</Text>
          </TouchableOpacity>

          {/* Navigate to Add New Vehicle screen */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(drivers)/vehicle-add")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: COLORS.primary },
              ]}
            >
              <MaterialCommunityIcons
                name="truck-plus"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Add Vehicle</Text>
            <Text style={styles.actionDescription}>Register new vehicle</Text>
          </TouchableOpacity>

          {/* Navigate to Delivery Schedule screen */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(drivers)/delivery-list")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FDCB6E" },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-clock"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Schedule</Text>
            <Text style={styles.actionDescription}>View delivery schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Section for vehicle status with a "See More" button */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Vehicle List</Text>
          {/* Button to navigate to the full vehicle list */}
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => router.push("../(drivers)/vehicle-list")}
          >
            <Text style={styles.seeAllText}>See More</Text>
            <MaterialIcons
              name="arrow-forward-ios"
              size={12}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Container for the list of vehicles */}
        <View style={styles.vehiclesContainer}>
          {/* Check if there are any vehicles to display */}
          {dashboardData.vehicles.length > 0 ? (
            // Map through the vehicles and render each one
            dashboardData.vehicles.map((vehicle, index) => (
              <View key={index} style={styles.vehicleItem}>
                {/* Header section for the vehicle item */}
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleIconContainer}>
                    <MaterialCommunityIcons
                      name="truck"
                      size={20}
                      color={COLORS.light}
                    />
                  </View>
                  {/* Vehicle name and registration number */}
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleTitle}>{vehicle.name}</Text>
                    <Text style={styles.vehicleSubtitle}>
                      {vehicle.registration_number}
                    </Text>
                  </View>
                  {/* Status badge (e.g., "On Route" or "Available") */}
                  <View
                    style={[
                      styles.vehicleStatusBadge,
                      vehicle.status === "on_route"
                        ? styles.activeStatusBadge
                        : styles.idleStatusBadge,
                    ]}
                  >
                    {/* Status indicator dot */}
                    <View
                      style={[
                        styles.statusDot,
                        vehicle.status === "on_route" ? null : styles.idleDot,
                      ]}
                    />
                    {/* Status text */}
                    <Text
                      style={
                        vehicle.status === "on_route"
                          ? styles.vehicleStatusText
                          : styles.idleStatusText
                      }
                    >
                      {vehicle.status === "on_route" ? "On Route" : "Available"}
                    </Text>
                  </View>
                </View>

                {/* Display vehicle specifications if available */}
                {vehicle.vehicle_type && vehicle.capacity && (
                  <View style={styles.vehicleSpecs}>
                    <Text style={styles.vehicleSpecsText}>
                      {vehicle.vehicle_type} • {vehicle.capacity}
                    </Text>
                  </View>
                )}

                {/* Display current assignment if the vehicle is assigned */}
                {vehicle.current_assignment && (
                  <View style={styles.currentAssignment}>
                    <Text style={styles.assignmentText}>
                      Currently assigned to:
                      {vehicle.current_assignment.driver_name}
                    </Text>
                  </View>
                )}

                {/* Vehicle Details Button has been removed */}
              </View>
            ))
          ) : (
            // Display an empty state message if no vehicles are found
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="truck-outline"
                size={50}
                color="#CED4DA"
              />
              <Text style={styles.emptyStateText}>No vehicles found</Text>
            </View>
          )}
        </View>

        {/* Add bottom spacer to prevent navigation bar overlap */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Define the styles for the component
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  companyName: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.light,
    marginTop: 2,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logoText: {
    color: COLORS.light,
    fontSize: 18,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 180,
  },
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 0,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    width: "48%",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  statsIconContainer: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
  },
  statsLabel: {
    fontSize: 10,
    color: "#6c757d",
    marginTop: 2,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 25,
    marginBottom: 15,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
    marginRight: 3,
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: COLORS.light,
    borderRadius: 14,
    alignItems: "center",
    padding: 15,
    marginBottom: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 6,
  },
  actionDescription: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 3,
  },
  deliveriesContainer: {
    marginBottom: 20,
  },
  deliveryItem: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  inProgressBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3498DB",
  },
  scheduledBadge: {
    backgroundColor: "rgba(155, 89, 182, 0.1)",
  },
  scheduledText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9B59B6",
  },
  deliveryDetails: {
    backgroundColor: "rgba(248, 249, 250, 0.5)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
  },
  deliveryActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 10,
  },
  detailsButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  vehiclesContainer: {
    marginBottom: 20,
  },
  vehicleItem: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  vehicleSubtitle: {
    fontSize: 13,
    color: "#6c757d",
  },
  vehicleStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  activeStatusBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  idleStatusBadge: {
    backgroundColor: "rgba(243, 156, 18, 0.1)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2ECC71",
    marginRight: 6,
  },
  idleDot: {
    backgroundColor: "#F39C12",
  },
  vehicleStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2ECC71",
  },
  idleStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F39C12",
  },
  vehicleSpecs: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  vehicleSpecsText: {
    fontSize: 14,
    color: "#6c757d",
  },
  currentAssignment: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  assignmentText: {
    fontSize: 14,
    color: "#3498DB",
  },
  // Removed vehicleDetailsButton style
  // Removed vehicleDetailsButtonText style
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.dark,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 12,
    textAlign: "center",
  },
  bottomSpacer: {
    height: 10,
  },
});
