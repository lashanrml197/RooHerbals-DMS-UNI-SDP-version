// app/(customers)/index.tsx
// Main customer management dashboard screen
// This is the landing page for the customer section that shows stats and navigation options

// Icon imports for various UI elements throughout the screen
import {
  AntDesign,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router"; // For navigation between screens
import React, { useEffect, useState } from "react";
// React Native core components for building the UI
import {
  ActivityIndicator, // Loading spinner
  Platform, // For platform-specific adjustments (iOS vs Android)
  SafeAreaView, // Ensures content doesn't overlap with system UI
  ScrollView, // Makes content scrollable
  StatusBar, // Controls the status bar appearance
  StyleSheet, // For component styling
  Text, // Text display component
  TouchableOpacity, // Touchable button component
  View, // Container component
} from "react-native";
// Custom components and services
import PermissionGate from "../components/PermissionGate"; // Role-based access control
import { getCustomerStats } from "../services/api"; // API call for dashboard data
import { COLORS } from "../theme/colors"; // Centralized color constants

export default function CustomerManagementScreen() {
  // State management for loading and error states
  // Loading state helps show spinner while data is being fetched
  const [loading, setLoading] = useState(true);
  // Error state to handle and display any API failures gracefully
  const [error, setError] = useState<string | null>(null);

  // Type definition for activity items in the recent activities feed
  // This ensures type safety when displaying recent customer-related activities
  interface Activity {
    activity_type: string; // Type of activity (payment, new customer, etc.)
    title: string; // Main display text for the activity
    subtitle: string; // Additional context or details
    timestamp: Date; // When the activity occurred
  }

  // Dashboard statistics state - holds key metrics for the customer overview
  // This data comes from the backend API and shows business insights
  const [stats, setStats] = useState({
    totalCustomers: 0, // Total number of registered customers
    newCustomersThisMonth: 0, // New customers added in current month
    recentActivities: [] as Activity[], // Latest customer-related activities
  });

  // Dynamic greeting function based on current time
  // This makes the UI feel more personal and time-aware
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Date formatting utility for displaying activity timestamps
  // This makes dates more readable by showing relative time (today, yesterday) vs full dates
  interface DateFormatOptions {
    hour: "2-digit";
    minute: "2-digit";
  }

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const now = new Date();

    // For today's activities, show the time (e.g., "2:30 PM")
    // This is more useful than showing "today" since users want to know when
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      } as DateFormatOptions);
    }

    // For yesterday's activities, just show "Yesterday"
    // Users understand this better than showing the actual date
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // For older activities, show the full date
    // This provides the necessary context for historical activities
    return date.toLocaleDateString();
  };

  // Icon generation system for activity feed
  // Different activity types get different colored icons to make them easily distinguishable
  interface ActivityIconContainerProps {
    backgroundColor: string;
    children: React.ReactNode;
  }

  const getActivityIcon = (activityType: string): React.ReactElement => {
    // Reusable container component for consistent icon styling
    // This ensures all activity icons have the same size and rounded appearance
    const ActivityIconContainer: React.FC<ActivityIconContainerProps> = ({
      backgroundColor,
      children,
    }) => (
      <View style={[styles.activityIconContainer, { backgroundColor }]}>
        {children}
      </View>
    );

    // Switch statement to map activity types to appropriate icons and colors
    // This visual coding helps users quickly identify different types of activities
    switch (activityType) {
      case "New Customer Added":
        // Red icon for new customers - represents growth and new business
        return (
          <ActivityIconContainer backgroundColor="#FF7675">
            <MaterialCommunityIcons
              name="account-plus"
              size={20}
              color="#FFFFFF"
            />
          </ActivityIconContainer>
        );
      case "Payment Received":
        // Green icon for payments - universally associated with money/success
        return (
          <ActivityIconContainer backgroundColor="#4ECDC4">
            <MaterialIcons name="attach-money" size={20} color="#FFFFFF" />
          </ActivityIconContainer>
        );
      case "Credit Sale Updated":
        // Purple icon for credit updates - indicates financial transactions
        return (
          <ActivityIconContainer backgroundColor="#A29BFE">
            <MaterialCommunityIcons
              name="credit-card-edit"
              size={20}
              color="#FFFFFF"
            />
          </ActivityIconContainer>
        );
      default:
        // Yellow warning icon for unknown activity types
        // This provides a fallback while making it clear something unexpected happened
        return (
          <ActivityIconContainer backgroundColor="#FDCB6E">
            <FontAwesome5 name="exclamation" size={18} color="#FFFFFF" />
          </ActivityIconContainer>
        );
    }
  };

  // Main data fetching function for dashboard statistics
  // This handles both successful API calls and graceful fallback to sample data
  const fetchData = async () => {
    try {
      setLoading(true); // Show loading spinner while fetching
      setError(null); // Clear any previous errors

      console.log("Fetching customer stats...");
      const data = await getCustomerStats(); // API call to backend
      console.log("Successfully fetched customer stats:", data);

      setStats(data); // Update state with fresh data from server
    } catch (err: any) {
      console.error("Error fetching customer stats:", err);
      setError(err.message || "Failed to fetch data");

      // Fallback strategy: If API fails, show sample data instead of broken screen
      // This keeps the app functional even when backend is down
      setStats({
        totalCustomers: 42,
        newCustomersThisMonth: 12,
        recentActivities: [
          {
            activity_type: "New Customer Added",
            title: "Beauty Shop Galle",
            subtitle: "",
            timestamp: new Date(),
          },
          {
            activity_type: "Payment Received",
            title: "Rs. 15,450",
            subtitle: "Super Market Kandy",
            timestamp: new Date(Date.now() - 86400000), // yesterday
          },
          {
            activity_type: "Credit Sale Updated",
            title: "Rs. 8,750",
            subtitle: "Mini Market Jaffna",
            timestamp: new Date(Date.now() - 86400000), // yesterday
          },
        ],
      });
    } finally {
      setLoading(false); // Hide loading spinner regardless of success/failure
    }
  };

  // Hook to fetch data when component mounts
  // This ensures dashboard shows fresh data every time user visits this screen
  useEffect(() => {
    fetchData();
  }, []);

  // Loading state UI - shown while data is being fetched
  // This prevents showing empty or broken content while waiting for API response
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Header remains visible during loading for consistent branding */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        {/* Central loading indicator with informative message */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customer data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state UI - shown when API fails but we still have fallback data
  // This provides a way for users to retry failed API calls
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Keep header consistent even during error state */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        {/* Error display with retry option */}
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

  // Main UI render - the successful state with full dashboard content
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar configuration for consistent app appearance */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header section with company branding and personalized greeting */}
      {/* This creates a professional look and reinforces brand identity */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.companyName}>Roo Herbals</Text>
        </View>
        {/* Company logo placeholder - uses initials for now */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RH</Text>
        </View>
      </View>

      {/* Scrollable content area for all dashboard elements */}
      {/* ScrollView allows content to be viewed even on smaller screens */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false} // Cleaner look without scroll bars
      >
        {/* Quick stats section - key metrics at a glance */}
        {/* These cards give users immediate insight into customer numbers and growth */}
        <View style={styles.statsCardsContainer}>
          {/* Total customers card - shows overall customer base size */}
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statsValue}>{stats.totalCustomers}</Text>
              <Text style={styles.statsLabel}>Total Customers</Text>
            </View>
          </View>

          {/* New customers this month card - shows recent growth */}
          {/* This metric helps track business expansion and acquisition success */}
          <View style={styles.statsCard}>
            <View style={styles.statsIconContainer}>
              <AntDesign name="adduser" size={22} color={COLORS.secondary} />
            </View>
            <View>
              <Text style={styles.statsValue}>
                {stats.newCustomersThisMonth}
              </Text>
              <Text style={styles.statsLabel}>New This Month</Text>
            </View>
          </View>
        </View>

        {/* Section header for customer management options */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Customer Management</Text>
        </View>

        {/* Main navigation cards for customer-related actions */}
        {/* These provide quick access to the most common customer operations */}
        <View style={styles.actionsContainer}>
          {/* Customer list option - always visible to all users */}
          {/* This is the most common action, so it's always available */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(customers)/customer-list")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FF7675" }, // Red color for visibility
              ]}
            >
              <FontAwesome5 name="users" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Customer List</Text>
            <Text style={styles.actionDescription}>View all customers</Text>
          </TouchableOpacity>

          {/* Add customer option - protected by permission system */}
          {/* Only users with add_customer permission can see this */}
          <PermissionGate permission="add_customer">
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(customers)/customer-add")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: "#4ECDC4" }, // Green color indicates creation/addition
                ]}
              >
                <MaterialIcons
                  name="person-add-alt-1"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.actionLabel}>Add Customer</Text>
              <Text style={styles.actionDescription}>Register new shop</Text>
            </TouchableOpacity>
          </PermissionGate>

          {/* Payment management option */}
          {/* Critical for cash flow and financial tracking */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(customers)/customer-payments")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FDCB6E" }, // Yellow/orange for financial operations
              ]}
            >
              <MaterialIcons name="payments" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Payments</Text>
            <Text style={styles.actionDescription}>Manage payments</Text>
          </TouchableOpacity>

          {/* Credit management option */}
          {/* Important for businesses that offer credit terms to customers */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(customers)/customer-credits")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#A29BFE" }, // Purple for credit-related operations
              ]}
            >
              <FontAwesome5 name="credit-card" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Credits</Text>
            <Text style={styles.actionDescription}>Handle credit sales</Text>
          </TouchableOpacity>
        </View>

        {/* Recent activities section header */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
        </View>

        {/* Activity feed showing recent customer-related events */}
        {/* This helps users stay updated on what's happening in the customer base */}
        <View style={styles.activitiesContainer}>
          {stats.recentActivities.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              {/* Activity icon based on type - visual quick identification */}
              {getActivityIcon(activity.activity_type)}
              <View style={styles.activityDetails}>
                {/* Activity type as main heading */}
                <Text style={styles.activityTitle}>
                  {activity.activity_type}
                </Text>
                {/* Activity details with optional subtitle */}
                <Text style={styles.activitySubtitle}>
                  {activity.title}{" "}
                  {activity.subtitle ? `- ${activity.subtitle}` : ""}
                </Text>
                {/* When the activity happened */}
                <Text style={styles.activityTime}>
                  {formatDate(activity.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom spacing to account for tab navigation */}
        {/* This prevents content from being hidden behind the bottom navigation */}
        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// StyleSheet object containing all component styles
// Organized by component/section for easy maintenance and updates
const styles = StyleSheet.create({
  // Main container styles
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background for modern look
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20, // Bottom padding for comfortable scrolling
  },

  // Header section styles - company branding area
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary, // Brand color for strong identity
    paddingHorizontal: 20,
    // Dynamic padding based on platform to handle status bar properly
    paddingTop:
      Platform.OS === "ios"
        ? 50 // iOS requires more top padding for notch/status bar
        : StatusBar.currentHeight
        ? StatusBar.currentHeight + 20
        : 40, // Android uses status bar height + padding
    paddingBottom: 25,
    borderBottomLeftRadius: 20, // Rounded bottom corners for modern design
    borderBottomRightRadius: 20,
    elevation: 8, // Android shadow
    shadowColor: "#000", // iOS shadow properties
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 10, // Ensure header stays above other elements during scroll
  },

  // Header text styles
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)", // Semi-transparent white for subtle greeting
    fontWeight: "500",
  },
  companyName: {
    fontSize: 26,
    fontWeight: "700", // Bold for strong brand presence
    color: COLORS.light,
    marginTop: 2,
  },

  // Logo container in header
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22, // Perfect circle
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Semi-transparent for depth
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)", // Subtle border for definition
  },
  logoText: {
    color: COLORS.light,
    fontSize: 18,
    fontWeight: "700",
  },
  // Stats cards container and individual card styles
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between", // Equal spacing between cards
    paddingHorizontal: 20,
    marginTop: 15, // Space below header
    paddingBottom: 5,
    zIndex: 5, // Layer above background elements
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light, // White background for contrast
    borderRadius: 12, // Rounded corners for modern card look
    paddingHorizontal: 15,
    paddingVertical: 14,
    width: "48%", // Two cards per row with small gap
    // Shadow properties for card elevation effect
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)", // Very subtle border for definition
  },
  statsIconContainer: {
    backgroundColor: "rgba(52, 100, 145, 0.1)", // Tinted background for icon
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12, // Space between icon and text
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "700", // Bold for emphasis on numbers
    color: COLORS.dark,
  },
  statsLabel: {
    fontSize: 11,
    color: "#6c757d", // Muted color for secondary text
    marginTop: 2,
  },
  // Section title styling for consistent headers
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25, // Good spacing between sections
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700", // Bold for clear section identification
    color: COLORS.dark,
  },

  // Action cards grid layout and styling
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap", // Allow cards to wrap to next row
    paddingHorizontal: 15,
    justifyContent: "space-between", // Even distribution of cards
  },
  actionCard: {
    width: "48%", // Two cards per row
    backgroundColor: COLORS.light,
    borderRadius: 14, // Slightly more rounded than stats cards for variety
    alignItems: "center", // Center content in cards
    padding: 15,
    marginBottom: 15, // Vertical spacing between rows
    // Enhanced shadow for more prominent appearance
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
    borderRadius: 16, // Rounded square for icon background
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10, // Space between icon and text
    // Additional shadow for icon containers
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700", // Bold for primary action text
    color: COLORS.dark,
    marginTop: 6,
  },
  actionDescription: {
    fontSize: 12,
    color: "#6c757d", // Muted color for descriptive text
    marginTop: 3,
  },
  // Activity feed styling
  activitiesContainer: {
    paddingHorizontal: 20,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center", // Vertically center icon with text
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10, // Space between activity items
    // Subtle shadow for list items
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
    borderRadius: 12, // Rounded for friendly appearance
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12, // Space between icon and text content
  },
  activityDetails: {
    flex: 1, // Take remaining space after icon
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "700", // Bold for activity type
    color: COLORS.dark,
  },
  activitySubtitle: {
    fontSize: 13,
    color: "#6c757d", // Muted for secondary information
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#adb5bd", // Most muted for timestamp
    marginTop: 4,
  },

  // Loading state styling
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center", // Center loading indicator
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.dark,
  },

  // Error state styling
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center", // Center error message and retry button
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.dark,
    textAlign: "center", // Center text for better readability
    marginTop: 15,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary, // Brand color for action button
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light, // White text on primary background
    fontSize: 16,
    fontWeight: "600",
  },
});
