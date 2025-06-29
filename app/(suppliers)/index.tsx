import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "../context/AuthContext"; // Import auth context
import { getSupplierStats } from "../services/supplierApi";
import { COLORS } from "../theme/colors";

// Define interfaces for type checking
interface SupplierStats {
  totalSuppliers: number;
  pendingOrders: number;
  recentActivities: Activity[];
  lowStockAlerts: LowStockItem[];
}

interface Activity {
  activity_type: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

interface LowStockItem {
  name: string;
  product_id: string;
  supplier_name: string;
  supplier_id: string;
  reorder_level: number;
  current_stock: number;
}

export default function SuppliersManagementScreen() {
  const { hasPermission } = useAuth(); // Get permission check function

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    pendingOrders: 0,
    recentActivities: [],
    lowStockAlerts: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  // Check if user has permission to view suppliers
  useEffect(() => {
    if (!hasPermission("view_suppliers")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access supplier management.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

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

    // If it's today, show the time
    if (date.toDateString() === now.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // If it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Calculate days difference
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return `${diffDays} days ago`;
    }

    // Otherwise show the date
    return date.toLocaleDateString();
  };

  // Calculate stock percentage for progress bar
  const calculateStockPercentage = (
    current: number,
    reorderLevel: number
  ): number => {
    const percentage = Math.round((current / reorderLevel) * 100);
    return Math.min(percentage, 100);
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching supplier stats...");
      const data = await getSupplierStats();
      console.log("Successfully fetched supplier stats:", data);

      setStats(data);
    } catch (err: any) {
      console.error("Error fetching supplier stats:", err);
      setError(err.message || "Failed to fetch data");

      // Use sample data if API fails
      setStats({
        totalSuppliers: 14,
        pendingOrders: 3,
        recentActivities: [
          {
            activity_type: "Order Received",
            title: "Herbal Extracts Inc.",
            subtitle: "45 items",
            timestamp: new Date().toISOString(),
          },
          {
            activity_type: "New Supplier Added",
            title: "Natural Beauty Products Ltd.",
            subtitle: "",
            timestamp: new Date(Date.now() - 86400000).toISOString(), // yesterday
          },
          {
            activity_type: "Purchase Order Sent",
            title: "Herb Garden Co.",
            subtitle: "PO #2352",
            timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          },
        ],
        lowStockAlerts: [
          {
            name: "Herbal Shampoo Base",
            product_id: "P001",
            supplier_name: "Herbal Extracts Inc.",
            supplier_id: "S001",
            reorder_level: 20,
            current_stock: 5,
          },
          {
            name: "Aloe Vera Extract",
            product_id: "P005",
            supplier_name: "Natural Beauty Products",
            supplier_id: "S002",
            reorder_level: 30,
            current_stock: 8,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Show loading indicator while data is loading
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.companyName}>Roo Herbals</Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>RH</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading supplier data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Curved Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }} // Padding for bottom nav
      >
        {/* Quick Stats Cards */}
        <View style={styles.statsCardsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="truck-delivery"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>{stats.totalSuppliers}</Text>
              <Text style={styles.statsLabel}>Total Suppliers</Text>
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
            <View>
              <Text style={styles.statsValue}>{stats.pendingOrders}</Text>
              <Text style={styles.statsLabel}>Pending Orders</Text>
            </View>
          </View>
        </View>

        {/* Supplier Management Heading */}
        <Text style={styles.sectionTitle}>Supplier Management</Text>

        {/* Quick Actions Grid */}
        <View style={styles.actionsContainer}>
          {/* View Suppliers Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(suppliers)/supplier-list")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#4ECDC4" },
              ]}
            >
              <MaterialCommunityIcons
                name="factory"
                size={30}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Supplier List</Text>
            <Text style={styles.actionDescription}>View all suppliers</Text>
          </TouchableOpacity>

          {/* Add New Supplier Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(suppliers)/supplier-add")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FF7675" },
              ]}
            >
              <MaterialIcons name="add-business" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Add Supplier</Text>
            <Text style={styles.actionDescription}>Register new supplier</Text>
          </TouchableOpacity>

          {/* Purchase Orders Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(suppliers)/purchase-orders")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: COLORS.primary },
              ]}
            >
              <MaterialCommunityIcons
                name="clipboard-list"
                size={30}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Purchase Orders</Text>
            <Text style={styles.actionDescription}>Manage orders</Text>
          </TouchableOpacity>

          {/* Inventory Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(suppliers)/inventory")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FDCB6E" },
              ]}
            >
              <MaterialCommunityIcons
                name="package-variant"
                size={30}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.actionLabel}>Inventory</Text>
            <Text style={styles.actionDescription}>View product batches</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activities Section */}
        <Text style={styles.sectionTitle}>Recent Activities</Text>

        <View style={styles.activitiesContainer}>
          {stats.recentActivities && stats.recentActivities.length > 0 ? (
            stats.recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIconContainer,
                    {
                      backgroundColor:
                        activity.activity_type === "Order Received"
                          ? "#4ECDC4"
                          : activity.activity_type === "New Supplier Added"
                          ? COLORS.primary
                          : "#FF7675",
                    },
                  ]}
                >
                  {activity.activity_type === "Order Received" ? (
                    <MaterialIcons name="inventory" size={20} color="#FFFFFF" />
                  ) : activity.activity_type === "New Supplier Added" ? (
                    <MaterialIcons
                      name="add-business"
                      size={20}
                      color="#FFFFFF"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="truck-delivery"
                      size={20}
                      color="#FFFFFF"
                    />
                  )}
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityTitle}>
                    {activity.activity_type}
                  </Text>
                  <Text style={styles.activitySubtitle}>
                    {activity.title}
                    {activity.subtitle ? ` - ${activity.subtitle}` : ""}
                  </Text>
                  <Text style={styles.activityTime}>
                    {formatDate(activity.timestamp)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivities}>
              <Text style={styles.emptyText}>No recent activities found</Text>
            </View>
          )}
        </View>

        {/* Low Stock Alert Section - Modified to remove View All and Order Button */}
        {stats.lowStockAlerts && stats.lowStockAlerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>

            <View style={styles.alertsContainer}>
              {stats.lowStockAlerts.map((item, index) => (
                <View key={index} style={styles.alertItem}>
                  <View style={styles.alertIconContainer}>
                    <MaterialIcons name="warning" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.alertDetails}>
                    <Text style={styles.alertTitle}>{item.name}</Text>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertSupplier} numberOfLines={1}>
                        Supplier: {item.supplier_name}
                      </Text>
                    </View>
                    <Text style={styles.alertQuantity}>
                      Remaining: {item.current_stock} units
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Spacer for bottom navigation */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
    paddingBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 10,
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
    fontSize: 12,
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
  activitiesContainer: {
    marginBottom: 20,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dark,
  },
  activitySubtitle: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#adb5bd",
    marginTop: 4,
  },
  alertsContainer: {
    marginBottom: 20,
  },
  alertItem: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F39C12",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertDetails: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 6,
  },
  alertInfo: {
    marginBottom: 4,
  },
  alertSupplier: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  alertQuantity: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F39C12",
    marginBottom: 6,
  },
  alertProgressBar: {
    height: 4,
    backgroundColor: "#F1F3F5",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 2,
  },
  alertProgress: {
    height: 4,
    backgroundColor: "#F39C12",
    borderRadius: 2,
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
  emptyActivities: {
    padding: 20,
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
  },
});
