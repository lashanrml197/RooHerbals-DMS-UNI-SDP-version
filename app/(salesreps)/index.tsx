// Import necessary icon libraries
import {
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
// Import navigation and React hooks
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
// Import React Native components
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import authentication context and API for sales rep stats
import { useAuth } from "../context/AuthContext"; // Import auth context
import { getSalesRepStats } from "../services/salesRepApi";
// Get color constants
import { COLORS } from "../theme/colors";

// Get device width for responsive design
const { width } = Dimensions.get("window");

// Define the structure for an activity item
interface Activity {
  activity_type: string;
  title: string;
  subtitle: string;
  timestamp: Date | string;
}

// Define the structure for sales rep statistics
interface SalesRepStats {
  totalSalesReps: number;
  activeSalesReps: number;
  pendingCommissions: number;
  recentActivities: Activity[];
}

export default function SalesRepManagementScreen() {
  // Get permission checking function from auth context
  const { hasPermission } = useAuth(); // Get permission check function
  // State for loading indicator
  const [loading, setLoading] = useState(true);
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  // State for sales rep statistics
  const [stats, setStats] = useState<SalesRepStats>({
    totalSalesReps: 0,
    activeSalesReps: 0,
    pendingCommissions: 0,
    recentActivities: [],
  });

  // Check if user has permission to view sales reps on mount
  useEffect(() => {
    if (!hasPermission("view_sales_reps")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access sales representatives management.",
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

  // Format date for display in activity list
  interface DateFormatOptions {
    hour: "2-digit";
    minute: "2-digit";
  }

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const now = new Date();

    // If it's today, show the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      } as DateFormatOptions);
    }

    // If it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Otherwise show the date
    return date.toLocaleDateString();
  };

  // Get activity icon based on activity type
  interface ActivityIconContainerProps {
    backgroundColor: string;
    children: React.ReactNode;
  }

  // Returns the appropriate icon for each activity type
  const getActivityIcon = (activityType: string): React.ReactElement => {
    const ActivityIconContainer: React.FC<ActivityIconContainerProps> = ({
      backgroundColor,
      children,
    }) => (
      <View style={[styles.activityIconContainer, { backgroundColor }]}>
        {children}
      </View>
    );

    switch (activityType) {
      case "Commission Paid":
        return (
          <ActivityIconContainer backgroundColor="#4ECDC4">
            <MaterialIcons name="payments" size={20} color="#FFFFFF" />
          </ActivityIconContainer>
        );
      case "New Order Collected":
        return (
          <ActivityIconContainer backgroundColor="#FF7675">
            <MaterialCommunityIcons
              name="cart-plus"
              size={20}
              color="#FFFFFF"
            />
          </ActivityIconContainer>
        );
      case "New Sales Rep Added":
        return (
          <ActivityIconContainer backgroundColor="#A29BFE">
            <FontAwesome5 name="user-plus" size={18} color="#FFFFFF" />
          </ActivityIconContainer>
        );
      default:
        return (
          <ActivityIconContainer backgroundColor="#FDCB6E">
            <FontAwesome5 name="exclamation" size={18} color="#FFFFFF" />
          </ActivityIconContainer>
        );
    }
  };

  // Fetch sales rep dashboard stats from API or fallback to sample data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        // Attempt to fetch data from API
        console.log("Fetching sales rep stats...");
        const data = await getSalesRepStats();
        console.log("Successfully fetched sales rep stats:", data);
        setStats(data);
      } catch (err) {
        console.error("API call failed, using sample data:", err);

        // If API call fails, use sample data after delay
        setTimeout(() => {
          setStats({
            totalSalesReps: 4,
            activeSalesReps: 3,
            pendingCommissions: 4,
            recentActivities: [
              {
                activity_type: "Commission Paid",
                title: "Rs. 3,750",
                subtitle: "Kasun Perera",
                timestamp: new Date(),
              },
              {
                activity_type: "New Order Collected",
                title: "Rs. 24,650",
                subtitle: "Nirmal Silva - Supiri Pharmacy",
                timestamp: new Date(Date.now() - 86400000), // yesterday
              },
              {
                activity_type: "New Sales Rep Added",
                title: "Charith Kumarasinghe",
                subtitle: "Wellawaya Area",
                timestamp: new Date(Date.now() - 172800000), // 2 days ago
              },
            ],
          });
        }, 1000);
      }
    } catch (err: any) {
      console.error("Error fetching sales rep stats:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Show loading indicator while fetching data
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
          <Text style={styles.loadingText}>Loading sales rep data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If there was an error and no fallback data, show error message
  if (error && stats.totalSalesReps === 0) {
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main UI rendering for sales rep management dashboard
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header with Roo Herbals branding */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.companyName}>Roo Herbals</Text>
        </View>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RH</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Quick Stats Cards */}
        <View style={styles.statsCardsContainer}>
          {/* Total Sales Reps Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>{stats.totalSalesReps}</Text>
              <Text style={styles.statsLabel}>Total Sales Reps</Text>
            </View>
          </View>

          {/* Active Sales Reps Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="account-check"
                size={22}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>{stats.activeSalesReps}</Text>
              <Text style={styles.statsLabel}>Active Reps</Text>
            </View>
          </View>
        </View>

        {/* Pending Commissions Card */}
        <View style={styles.pendingCommissionsContainer}>
          <View style={styles.pendingCommissionsCard}>
            <View style={styles.commissionIconContainer}>
              <MaterialIcons name="payments" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.pendingCommissionsLabel}>
                Pending Commissions
              </Text>
              <Text style={styles.pendingCommissionsValue}>
                {stats.pendingCommissions}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.payNowButton}
              onPress={() => router.push("../(salesreps)/sales-rep-commission")}
            >
              <Text style={styles.payNowButtonText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sales Rep Management Heading */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Sales Rep Management</Text>
        </View>

        {/* Sales Rep Management Cards - now with 3 cards centered */}
        <View style={styles.actionsContainer}>
          {/* View Sales Reps Option */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("../(salesreps)/sales-rep-list")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FF7675" },
              ]}
            >
              <FontAwesome5 name="users" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Sales Rep List</Text>
            <Text style={styles.actionDescription}>View all sales reps</Text>
          </TouchableOpacity>

          {/* Add New Sales Rep Option - Only for users with manage_sales_reps permission */}
          {hasPermission("manage_sales_reps") && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("../(salesreps)/sales-rep-add")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: "#4ECDC4" },
                ]}
              >
                <MaterialIcons
                  name="person-add-alt-1"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.actionLabel}>Add Sales Rep</Text>
              <Text style={styles.actionDescription}>Register new rep</Text>
            </TouchableOpacity>
          )}

          {/* Commission Management Option - Now centered when there are 3 cards */}
          <TouchableOpacity
            style={[styles.actionCard, styles.centeredCard]}
            onPress={() => router.push("../(salesreps)/sales-rep-commission")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FDCB6E" },
              ]}
            >
              <MaterialIcons name="attach-money" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Commissions</Text>
            <Text style={styles.actionDescription}>Manage payments</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activities Section */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
        </View>

        {/* List of recent activities for sales reps */}
        <View style={styles.activitiesContainer}>
          {stats.recentActivities.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              {getActivityIcon(activity.activity_type)}
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>
                  {activity.activity_type}
                </Text>
                <Text style={styles.activitySubtitle}>
                  {activity.title}{" "}
                  {activity.subtitle ? `- ${activity.subtitle}` : ""}
                </Text>
                <Text style={styles.activityTime}>
                  {formatDate(activity.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles for the sales rep management screen and its components
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80, // Add extra padding to prevent content from being hidden by bottom navigation
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
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 18,
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
  pendingCommissionsContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  pendingCommissionsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  commissionIconContainer: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pendingCommissionsLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  pendingCommissionsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  payNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: "auto",
  },
  payNowButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
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
    paddingHorizontal: 15,
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
  // New style for the third card when there are only 3 cards
  centeredCard: {
    marginHorizontal: "auto",
    marginLeft: "auto",
    marginRight: "auto",
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
    paddingHorizontal: 20,
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
  bottomSpacer: {
    height: 60,
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
});
