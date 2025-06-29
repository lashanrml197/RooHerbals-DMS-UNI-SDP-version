import {
  FontAwesome,
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
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import auth context
import { COLORS } from "../theme/colors";

// Import our order API functions
import { getOrderStats } from "../services/orderApi";

// Define TypeScript interfaces for our data
interface OrderStats {
  total_orders: number;
  pending_deliveries: number;
  orders_by_status: { status: string; count: number }[];
  orders_by_payment_status: { payment_status: string; count: number }[];
  recent_orders: RecentOrder[];
  monthly_total: number;
  monthly_growth: string;
}

interface RecentOrder {
  order_id: string;
  order_date: string;
  total_amount: number;
  status: string;
  customer_name: string;
}

export default function OrdersManagementScreen() {
  const { hasPermission } = useAuth(); // Get permission check function
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats>({
    total_orders: 0,
    pending_deliveries: 0,
    orders_by_status: [],
    orders_by_payment_status: [],
    recent_orders: [],
    monthly_total: 0,
    monthly_growth: "0.00",
  });

  // Get current time of day to display greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();

    // Calculate the difference in days
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return (
        "Today, " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else if (diffDays === 1) {
      // Yesterday
      return (
        "Yesterday, " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else {
      // Format as "Day, Month Date"
      return date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Get status color based on order status
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "#ffc107"; // Amber
      case "processing":
        return "#007bff"; // Blue
      case "delivered":
        return "#28a745"; // Green
      case "cancelled":
        return "#dc3545"; // Red
      default:
        return "#6c757d"; // Gray
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return (
      "Rs. " +
      amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Extract badge text based on status
  const getBadgeText = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing";
      case "delivered":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Fetch order statistics data
  const fetchOrderStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching order stats...");
      const data = await getOrderStats();
      console.log("Order stats received:", data);

      setStats(data as OrderStats);
    } catch (err: any) {
      console.error("Error fetching order stats:", err);
      setError(err.message || "Failed to load order data. Please try again.");

      // Set fallback data if API fails
      setStats({
        total_orders: 32,
        pending_deliveries: 7,
        orders_by_status: [],
        orders_by_payment_status: [],
        recent_orders: [
          {
            order_id: "O1042",
            customer_name: "Beauty Shop Galle",
            order_date: new Date().toISOString(),
            total_amount: 2450,
            status: "processing",
          },
          {
            order_id: "O1041",
            customer_name: "Herbal Store Colombo",
            order_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
            total_amount: 3200,
            status: "delivered",
          },
          {
            order_id: "O1040",
            customer_name: "Natural Cosmetics Kandy",
            order_date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
            total_amount: 5750,
            status: "cancelled",
          },
        ],
        monthly_total: 45000,
        monthly_growth: "12.50",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to view orders
  useEffect(() => {
    if (!hasPermission("view_orders")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access orders management.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Load data when component mounts
  useEffect(() => {
    fetchOrderStats();
  }, []);

  // Handle order item click to show details
  const handleOrderClick = (orderId: string) => {
    // Corrected navigation to order details
    router.push({
      pathname: "/(orders)/order-details",
      params: { id: orderId },
    });
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading order data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchOrderStats}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.companyName}>Roo Herbals</Text>
        </View>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RH</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Cards */}
        <View style={styles.statsCardsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="clipboard-check"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>{stats.total_orders}</Text>
              <Text style={styles.statsLabel}>Total Orders</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialIcons
                name="pending-actions"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View style={{ flex: 4 }}>
              <Text style={styles.statsValue}>{stats.pending_deliveries}</Text>
              <Text style={styles.statsLabel}>Pending Delivery</Text>
            </View>
          </View>
        </View>

        {/* Order Management Heading */}
        <Text style={styles.sectionTitle}>Order Management</Text>

        {/* Quick Actions Grid */}
        <View style={styles.actionsContainer}>
          {/* View Orders Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(orders)/order-list")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#4ECDC4" },
              ]}
            >
              <MaterialIcons
                name="format-list-bulleted"
                size={30}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Order List</Text>
            <Text style={styles.actionDescription}>View all orders</Text>
          </TouchableOpacity>
          {/* Add New Order Option - Only for users with add_order permission */}
          {hasPermission("add_order") && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("../(orders)/order-add")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: "#FF7675" },
                ]}
              >
                <MaterialIcons name="post-add" size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.actionLabel}>New Order</Text>
              <Text style={styles.actionDescription}>Create new order</Text>
            </TouchableOpacity>
          )}
          {/* Delivery Management Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(orders)/delivery-management")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: COLORS.primary },
              ]}
            >
              <MaterialCommunityIcons
                name="truck-delivery"
                size={30}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Deliveries</Text>
            <Text style={styles.actionDescription}>Manage deliveries</Text>
          </TouchableOpacity>
          {/* Return Orders Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(orders)/return-orders")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FDCB6E" },
              ]}
            >
              <FontAwesome5 name="exchange-alt" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Returns</Text>
            <Text style={styles.actionDescription}>Process returns</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders Section */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>

        <View style={styles.ordersContainer}>
          {stats.recent_orders.length > 0 ? (
            stats.recent_orders.map((order, index) => (
              <TouchableOpacity
                key={index}
                style={styles.orderItem}
                onPress={() => handleOrderClick(order.order_id)}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdContainer}>
                    <Text style={styles.orderId}>
                      Order #{order.order_id.replace(/^O/, "")}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(order.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getBadgeText(order.status)}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color="#ADB5BD"
                  />
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderInfo}>
                    <MaterialCommunityIcons
                      name="store"
                      size={16}
                      color="#6c757d"
                    />
                    <Text style={styles.orderInfoText}>
                      {order.customer_name}
                    </Text>
                  </View>

                  <View style={styles.orderInfo}>
                    <MaterialIcons
                      name="date-range"
                      size={16}
                      color="#6c757d"
                    />
                    <Text style={styles.orderInfoText}>
                      {formatDate(order.order_date)}
                    </Text>
                  </View>

                  <View style={styles.orderInfo}>
                    <FontAwesome name="money" size={16} color="#6c757d" />
                    <Text style={styles.orderInfoText}>
                      {formatCurrency(order.total_amount)}
                    </Text>
                  </View>

                  <View style={styles.orderInfo}>
                    <MaterialCommunityIcons
                      name={
                        order.status === "delivered"
                          ? "truck-check"
                          : "truck-delivery-outline"
                      }
                      size={16}
                      color={
                        order.status === "delivered" ? "#28a745" : "#6c757d"
                      }
                    />
                    <Text
                      style={[
                        styles.orderInfoText,
                        order.status === "delivered" && { color: "#28a745" },
                      ]}
                    >
                      {order.status === "delivered"
                        ? "Delivered"
                        : order.status === "processing"
                        ? "In Progress"
                        : order.status === "pending"
                        ? "Pending"
                        : "Cancelled"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={50} color="#ADB5BD" />
              <Text style={styles.emptyText}>No recent orders to display.</Text>
            </View>
          )}
        </View>

        {/* Spacer for bottom navigation */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Removed duplicate bottom navigation - using root navigation */}
    </SafeAreaView>
  );
}

// Remove unused width import
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
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
  },
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    marginTop: 8,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    width: "48%",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0,
  },
  statsIconContainer: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 11,
    color: "#6c757d",
    marginTop: 2,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 24,
    marginBottom: 14,
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
    padding: 16,
    marginBottom: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0,
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
  ordersContainer: {
    marginBottom: 20,
  },
  orderItem: {
    backgroundColor: COLORS.light,
    borderRadius: 14,
    marginBottom: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: "#ffc107",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.light,
  },
  orderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 14,
    paddingBottom: 16,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    marginVertical: 6,
  },
  orderInfoText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
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
    marginTop: 15,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 10,
  },
});
