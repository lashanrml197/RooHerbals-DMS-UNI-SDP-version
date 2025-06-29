import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "../context/AuthContext"; // Import auth context
import { getDeliveries } from "../services/driverApi";
import { COLORS } from "../theme/colors";

// Define the structure of a single delivery item
interface DeliveryItem {
  delivery_id: string;
  order_id: string;
  customer_name: string;
  driver_name: string;
  vehicle_name: string;
  status: string;
  scheduled_date: string;
  delivery_date: string | null;
  amount: number;
  location: string;
}

// Define the structure for filtering deliveries
interface DeliveryFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  driver_id?: string;
}

// Main component for the delivery list screen
export default function DeliveryListScreen() {
  const { hasPermission } = useAuth(); // Get permission check function from authentication context
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]); // State to hold the list of deliveries
  const [loading, setLoading] = useState(true); // State to manage loading indicator
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh indicator
  const [error, setError] = useState<string | null>(null); // State to hold any error messages
  const [searchQuery, setSearchQuery] = useState(""); // State for the search input

  // Check if the user has permission to view deliveries when the component mounts
  useEffect(() => {
    if (!hasPermission("view_deliveries")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access deliveries.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);
  const [filters] = useState<DeliveryFilters>({}); // State to hold delivery filters

  // Format a date string for display in a user-friendly format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Asynchronously load deliveries from the API
  const loadDeliveries = useCallback(
    async (showRefreshing = false) => {
      try {
        setError(null);
        if (showRefreshing) setRefreshing(true);

        console.log("Fetching deliveries with filters:", filters);
        const data = await getDeliveries(filters);
        setDeliveries(data || []);
      } catch (err: any) {
        console.error("Error fetching deliveries:", err);
        setError(err.message || "Could not load deliveries. Please try again.");
      } finally {
        setLoading(false);
        if (showRefreshing) setRefreshing(false);
      }
    },
    [filters]
  );

  // Load deliveries when the component initially mounts
  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  // Handler for pull-to-refresh action
  const onRefresh = () => {
    loadDeliveries(true);
  };

  // Filter the deliveries based on the search query
  const filteredDeliveries = deliveries.filter((delivery) => {
    const searchTerms = searchQuery.toLowerCase().trim().split(" ");

    // Check if item matches all search terms
    return searchTerms.every((term) => {
      return (
        (delivery.customer_name || "").toLowerCase().includes(term) ||
        (delivery.driver_name || "").toLowerCase().includes(term) ||
        (delivery.order_id || "").toLowerCase().includes(term) ||
        (delivery.location || "").toLowerCase().includes(term)
      );
    });
  });

  // Determine the badge style based on the delivery status
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "scheduled":
        return styles.scheduledBadge;
      case "in_progress":
        return styles.inProgressBadge;
      case "delivered":
        return styles.deliveredBadge;
      case "failed":
        return styles.failedBadge;
      default:
        return styles.scheduledBadge;
    }
  };

  // Determine the text style for the status badge based on delivery status
  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case "scheduled":
        return styles.scheduledText;
      case "in_progress":
        return styles.inProgressText;
      case "delivered":
        return styles.deliveredText;
      case "failed":
        return styles.failedText;
      default:
        return styles.scheduledText;
    }
  };

  // Get a formatted, human-readable status text
  const getStatusText = (status: string = "") => {
    switch (status) {
      case "scheduled":
        return "Scheduled";
      case "in_progress":
        return "In Progress";
      case "delivered":
        return "Delivered";
      case "failed":
        return "Failed";
      default:
        return (
          status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
        );
    }
  };

  // Display a loading indicator while data is being fetched
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deliveries</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render the main delivery list UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header section with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deliveries</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search bar for filtering deliveries */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deliveries..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6c757d"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of deliveries */}
      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.delivery_id || String(Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="calendar" size={60} color="#CED4DA" />
            <Text style={styles.emptyText}>
              {error ? error : "No deliveries found"}
            </Text>
            {error && (
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deliveryCard}
            onPress={() =>
              router.push(
                `../(drivers)/delivery-detail?id=${item.delivery_id || ""}`
              )
            }
          >
            {/* Delivery card header with customer name and status */}
            <View style={styles.deliveryHeader}>
              <Text style={styles.customerName}>
                {item.customer_name || "Unknown Customer"}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  getStatusBadgeStyle(item.status || ""),
                ]}
              >
                <Text style={getStatusTextStyle(item.status || "")}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>

            {/* Detailed information about the delivery */}
            <View style={styles.deliveryDetails}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons
                    name="truck-outline"
                    size={16}
                    color="#6c757d"
                  />
                  <Text style={styles.detailText}>
                    {item.vehicle_name || "N/A"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="person" size={16} color="#6c757d" />
                  <Text style={styles.detailText}>
                    {item.driver_name || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <MaterialIcons
                    name="calendar-today"
                    size={16}
                    color="#6c757d"
                  />
                  <Text style={styles.detailText}>
                    Scheduled: {formatDate(item.scheduled_date)}
                  </Text>
                </View>
                {item.delivery_date && (
                  <View style={styles.detailItem}>
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#6c757d"
                    />
                    <Text style={styles.detailText}>
                      Delivered: {formatDate(item.delivery_date)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Footer of the card with order ID */}
            <View style={styles.cardFooter}>
              <View style={styles.orderIdContainer}>
                <Text style={styles.orderIdLabel}>Order #</Text>
                <Text style={styles.orderId}>{item.order_id || "N/A"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button to add a new delivery */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("../(drivers)/delivery-add")}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Styles for the components
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
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
    paddingBottom: 80,
  },
  deliveryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
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
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  scheduledBadge: {
    backgroundColor: "rgba(155, 89, 182, 0.1)",
  },
  scheduledText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9B59B6",
  },
  inProgressBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  inProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3498DB",
  },
  deliveredBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  deliveredText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2ECC71",
  },
  failedBadge: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  failedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E74C3C",
  },
  deliveryDetails: {
    backgroundColor: "rgba(248, 249, 250, 0.5)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIdLabel: {
    fontSize: 13,
    color: "#6c757d",
  },
  orderId: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 4,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
});
