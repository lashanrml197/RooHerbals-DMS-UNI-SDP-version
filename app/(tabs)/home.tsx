import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useAuth } from "../context/AuthContext";
import { getDashboardStats } from "../services/api";
import { COLORS } from "../theme/colors";

// Get screen dimensions for responsive design
const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;

// Dashboard stats interface
interface DashboardStats {
  thisMonthOrders?: number;
  thisMonthSales?: number;
  recentActivities?: {
    id: string;
    time: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }[];
}

export default function HomeScreen() {
  const { user, loading: authLoading, hasPermission } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const dashboardData = await getDashboardStats();
      setDashboardStats(dashboardData.stats);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      Alert.alert("Error", "Failed to retrieve dashboard data");

      // Fallback data if API fails
      setDashboardStats({
        thisMonthOrders: 9,
        thisMonthSales: 113845,
        recentActivities: [
          {
            id: "1",
            time: "Yesterday",
            title: "New Order #O461BCAD9",
            description: "Rs. 41,950.00 - Lasidu",
            icon: "📝",
            color: "#FF7675",
          },
          {
            id: "2",
            time: "Yesterday",
            title: "New Order #OC4C2F739",
            description: "Rs. 1,250.00 - Ayurveda Pharmacy",
            icon: "📝",
            color: "#FF7675",
          },
          {
            id: "3",
            time: "Yesterday",
            title: "New Order #0684A8E1C",
            description: "Rs. 1,150.00 - Lasidu",
            icon: "📝",
            color: "#FF7675",
          },
        ],
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication using the auth context
    const checkAuth = async () => {
      try {
        if (authLoading) {
          return; // Wait for auth to load
        }

        if (!user) {
          // Redirect to login if not authenticated
          router.replace("../login");
          return;
        }

        // Fetch dashboard stats
        await fetchDashboardData();
      } catch (error) {
        console.error("Authentication check error:", error);
        Alert.alert("Error", "Failed to retrieve user data");
        router.replace("../login");
      }
    };

    checkAuth();
  }, [authLoading, user]);

  // Filter actions based on user role
  const getFilteredActions = () => {
    if (!user) return [];

    // Define base actions for all users
    const baseActions = [];

    // Customers section
    if (hasPermission("view_customers")) {
      baseActions.push({
        id: "1",
        icon: "👥",
        label: "Customers",
        onPress: () => router.push("../(customers)"),
        color: "#FF6B6B",
      });
    }

    // Orders section
    if (hasPermission("view_orders")) {
      baseActions.push({
        id: "2",
        icon: "📋",
        label: "Orders",
        onPress: () => router.push("../(orders)"),
        color: "#FF9A3C",
      });
    }

    // Lorry Drivers section
    if (hasPermission("view_drivers") && hasPermission("manage_drivers")) {
      baseActions.push({
        id: "3",
        icon: "🚚",
        label: "Lorry Drivers",
        onPress: () => router.push("../(drivers)/"),
        color: "#4ECDC4",
      });
    }

    // Suppliers section
    if (hasPermission("view_suppliers") && hasPermission("manage_suppliers")) {
      baseActions.push({
        id: "4",
        icon: "🏭",
        label: "Suppliers",
        onPress: () => router.push("../(suppliers)"),
        color: "#FFD166",
      });
    }

    // Sales Reps section
    if (
      hasPermission("view_sales_reps") &&
      hasPermission("manage_sales_reps")
    ) {
      baseActions.push({
        id: "5",
        icon: "👨‍💼",
        label: "Sales Reps",
        onPress: () => router.push("../(salesreps)"),
        color: "#6A0572",
      });
    }

    // Reports section
    if (hasPermission("view_reports")) {
      baseActions.push({
        id: "6",
        icon: "📊",
        label: "Reports",
        onPress: () => router.push("../(reports)"),
        color: "#118AB2",
      });
    }

    return baseActions;
  };

  // Get stats with actual data or fallback
  const getStats = () => {
    if (!dashboardStats) return [];

    return [
      {
        id: "1",
        number: dashboardStats.thisMonthOrders?.toString() || "0",
        label: "This Month's Orders",
        icon: "📅",
        bgColor: "#f5f9ff",
      },
      {
        id: "2",
        number: `Rs. ${dashboardStats.thisMonthSales?.toLocaleString() || "0"}`,
        label: "This Month's Sales",
        icon: "💵",
        bgColor: "#f5f9ff",
      },
    ];
  };

  // Render statistics section
  const renderStats = () => (
    <View style={styles.statsContainer}>
      {getStats().map((stat) => (
        <View
          key={stat.id}
          style={[styles.statCard, { backgroundColor: stat.bgColor }]}
        >
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{stat.number}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Render quick actions section
  const renderQuickActions = () => {
    const filteredActions = getFilteredActions();

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {filteredActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: action.color }]}
              >
                <Text style={styles.actionButtonIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render system overview section
  const renderSystemOverview = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>System Highlights</Text>
      <View style={styles.overviewContainer}>
        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>📦</Text>
          </View>
          <Text style={styles.featureTitle}>Inventory Control</Text>
          <Text style={styles.featureDescription}>
            Batch-level tracking with FEFO inventory rotation
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>🚚</Text>
          </View>
          <Text style={styles.featureTitle}>Field Sales</Text>
          <Text style={styles.featureDescription}>
            Mobile order creation with real-time inventory visibility
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>↩️</Text>
          </View>
          <Text style={styles.featureTitle}>Returns Processing</Text>
          <Text style={styles.featureDescription}>
            Manage product returns from delivered orders
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>📊</Text>
          </View>
          <Text style={styles.featureTitle}>Analytics</Text>
          <Text style={styles.featureDescription}>
            Real-time sales tracking and performance reports
          </Text>
        </View>
      </View>
    </View>
  );

  // Render loading indicator
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading dashboard...</Text>
    </View>
  );

  // Main render
  if (loading || authLoading) {
    return renderLoading();
  }

  // Check if user is a sales rep or lorry driver
  const isLimitedRole =
    user?.role === "sales_rep" || user?.role === "lorry_driver";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>Roo Herbals</Text>
            <Text style={styles.headerWelcome}>
              Welcome,{" "}
              {user?.role
                ? user.role.charAt(0).toUpperCase() +
                  user.role.slice(1).replace("_", " ")
                : "User"}{" "}
              {user?.username || user?.email?.split("@")[0] || ""}
            </Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>
              {user?.username?.charAt(0) || user?.email?.charAt(0) || "RH"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchDashboardData}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Only show stats for admin and manager roles */}
        {!isLimitedRole && renderStats()}
        {renderQuickActions()}
        {renderSystemOverview()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 95,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
    paddingBottom: 25,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  headerGreeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 4,
  },
  headerWelcome: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatar: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 20,
    marginTop: 20,
    justifyContent: "space-between",
  },
  statCard: {
    width: width / 2 - 25,
    marginHorizontal: 2,
    marginBottom: 10,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e7f5e8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    fontSize: 20,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "bold",
    color: "#333333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: width / 3 - 20,
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 28,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.dark,
    textAlign: "center",
    fontWeight: "500",
  },
  overviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 5,
  },
  featureCard: {
    width: width / 2 - 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  featureIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#f2f7ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e6eeff",
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
  },
});
