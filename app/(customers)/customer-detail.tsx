// app/(customers)/customer-detail.tsx
// This screen displays detailed information about a specific customer including
// their profile, contact info, order statistics, and quick action buttons

// Import necessary vector icons for the UI
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
// Import navigation and routing utilities
import { router, useLocalSearchParams } from "expo-router";
// Import React hooks for state management and lifecycle
import React, { useEffect, useState } from "react";
// Import React Native UI components
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import authentication context for permission checking
import { useAuth } from "../context/AuthContext";
// Import API service for fetching customer data
import { getCustomerById } from "../services/api";
// Import app color theme
import { COLORS } from "../theme/colors";

// Define the Customer interface to type-check customer data
// This ensures proper data structure and helps with IntelliSense
interface Customer {
  customer_id: string; // Unique identifier for the customer
  name: string; // Customer business name
  address: string; // Physical address
  city: string; // City location
  phone: string; // Contact phone number
  email: string; // Email address
  contact_person: string; // Name of contact person
  totalOrders: number; // Total number of orders placed
  totalSpent: number; // Total amount spent by customer
  lastOrder: string; // Date of last order
  creditStatus: "good" | "pending" | "overdue"; // Current credit standing
  paymentStatus: {
    // Payment status breakdown
    pending: number; // Amount of pending payments
    overdue: number; // Amount of overdue payments
  };
  joinedDate: string; // Date when customer joined
  // Add any other properties you need
}

export default function CustomerDetailScreen() {
  // State management for customer data, loading state, and error handling
  const [customer, setCustomer] = useState<Customer | null>(null); // Stores customer information
  const [loading, setLoading] = useState(true); // Tracks loading state
  const [error, setError] = useState<string | null>(null); // Stores error messages

  // Extract customer ID from the route parameters (passed from previous screen)
  const { customerId } = useLocalSearchParams();

  // Access authentication context to check user permissions for various actions
  const { hasPermission } = useAuth();

  // Reusable function to fetch customer details from the API
  // This function handles loading states, error handling, and data updates
  const fetchCustomerDetails = async () => {
    try {
      setLoading(true); // Show loading indicator
      setError(null); // Clear any previous errors

      // Validate that customer ID is provided
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      console.log("Fetching details for customer:", customerId);
      // Make API call to get customer data
      const data = await getCustomerById(customerId as string);
      console.log("Customer details received:", data);

      // Update state with fetched customer data
      setCustomer(data);
    } catch (err: any) {
      // Handle and log any errors that occur during fetch
      console.error("Error fetching customer details:", err);
      setError(err.message || "Failed to load customer details");
    } finally {
      // Always hide loading indicator when done
      setLoading(false);
    }
  };

  // useEffect hook to fetch customer data when component mounts or customerId changes
  // This runs automatically when the screen loads
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Show loading indicator
        setError(null); // Clear any previous errors

        // Validate that customer ID is provided
        if (!customerId) {
          throw new Error("Customer ID is required");
        }

        console.log("Fetching details for customer:", customerId);
        // Make API call to get customer data
        const data = await getCustomerById(customerId as string);
        console.log("Customer details received:", data);

        // Update state with fetched customer data
        setCustomer(data);
      } catch (err: any) {
        // Handle and log any errors that occur during fetch
        console.error("Error fetching customer details:", err);
        setError(err.message || "Failed to load customer details");
      } finally {
        // Always hide loading indicator when done
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId]); // Re-run effect if customerId changes

  // Render loading state while data is being fetched
  // Shows a spinner and loading text to inform user that data is loading
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Configure status bar for consistent appearance */}
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

        {/* Header section with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()} // Navigate back to previous screen
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={{ width: 40 }} /> {/* Spacer for header balance */}
        </View>

        {/* Loading indicator section */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state when data fetch fails or customer not found
  // Shows error message with retry option to recover from failures
  if (error || !customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Configure status bar for consistent appearance */}
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

        {/* Header section with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()} // Navigate back to previous screen
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={{ width: 40 }} /> {/* Spacer for header balance */}
        </View>

        {/* Error display section */}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#E74C3C" />
          <Text style={styles.errorText}>
            {error || "Unable to load customer details"}
          </Text>
          {/* Retry button to attempt data fetch again */}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // Retry fetching data using the reusable function
              fetchCustomerDetails();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main render function - displays the complete customer detail screen
  // This is shown when data loads successfully
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Configure status bar for dark content on light background */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header Navigation Bar */}
      <View style={styles.header}>
        {/* Back navigation button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()} // Return to previous screen
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>

        {/* Screen title */}
        <Text style={styles.headerTitle}>Customer Details</Text>

        {/* Edit button - only shown if user has edit permissions */}
        {hasPermission("edit_customer") && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push(
                `/(customers)/edit-customer?customerId=${customer.customer_id}`
              )
            }
          >
            <MaterialIcons name="edit" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable content area */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Customer Profile Information Card */}
        {/* Displays customer's basic information including name, address, contact details */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {/* Customer icon container with store icon */}
            <View style={styles.customerIconContainer}>
              <FontAwesome5 name="store" size={28} color={COLORS.light} />
            </View>

            {/* Customer basic details section */}
            <View style={styles.customerDetails}>
              {/* Customer business name */}
              <Text style={styles.customerName}>{customer.name}</Text>

              {/* Address information with location icon */}
              <View style={styles.customerInfo}>
                <Feather
                  name="map-pin"
                  size={14}
                  color="#6c757d"
                  style={styles.infoIcon}
                />
                <Text style={styles.customerInfoText}>
                  {customer.address}
                  {customer.city ? `, ${customer.city}` : ""}
                </Text>
              </View>

              {/* Phone number with phone icon */}
              <View style={styles.customerInfo}>
                <Feather
                  name="phone"
                  size={14}
                  color="#6c757d"
                  style={styles.infoIcon}
                />
                <Text style={styles.customerInfoText}>{customer.phone}</Text>
              </View>
            </View>
          </View>

          {/* Visual separator between sections */}
          <View style={styles.divider} />

          {/* Additional contact information section */}
          <View style={styles.contactSection}>
            {/* Contact person details */}
            <View style={styles.contactPerson}>
              <FontAwesome5
                name="user"
                size={14}
                color="#6c757d"
                style={styles.infoIcon}
              />
              <Text style={styles.contactText}>
                <Text style={styles.contactLabel}>Contact Person: </Text>
                {customer.contact_person || "N/A"}
              </Text>
            </View>

            {/* Email address details */}
            <View style={styles.contactPerson}>
              <MaterialCommunityIcons
                name="email-outline"
                size={14}
                color="#6c757d"
                style={styles.infoIcon}
              />
              <Text style={styles.contactText}>
                <Text style={styles.contactLabel}>Email: </Text>
                {customer.email || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Statistics Cards Section */}
        {/* Three-column layout showing key customer metrics */}
        <View style={styles.statsContainer}>
          {/* Total Orders Stat Card */}
          {/* Shows the number of orders this customer has placed */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(52, 100, 145, 0.1)" }, // Light blue background
              ]}
            >
              <Feather name="shopping-bag" size={18} color={COLORS.secondary} />
            </View>
            <View>
              <Text style={styles.statValue}>{customer.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
          </View>

          {/* Total Sales Amount Stat Card */}
          {/* Shows the total monetary value of all customer purchases */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(125, 164, 83, 0.1)" }, // Light green background
              ]}
            >
              <MaterialIcons name="payments" size={18} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>
                Rs. {customer.totalSpent.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
          </View>

          {/* Credit Status Stat Card */}
          {/* Shows customer's current credit standing with color-coded status */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                {
                  // Dynamic background color based on credit status
                  backgroundColor:
                    customer.creditStatus === "good"
                      ? "rgba(46, 204, 113, 0.1)" // Green for good status
                      : "rgba(231, 76, 60, 0.1)", // Red for pending/overdue
                },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  // Dynamic icon based on credit status
                  customer.creditStatus === "good"
                    ? "check-circle-outline" // Check mark for good status
                    : "alert-circle-outline" // Alert icon for issues
                }
                size={18}
                color={customer.creditStatus === "good" ? "#2ECC71" : "#E74C3C"}
              />
            </View>
            <View>
              <Text
                style={[
                  styles.statusValue,
                  {
                    // Dynamic text color based on credit status
                    color:
                      customer.creditStatus === "good" ? "#2ECC71" : "#E74C3C",
                  },
                ]}
              >
                {/* Display human-readable credit status */}
                {customer.creditStatus === "good"
                  ? "Good Standing"
                  : customer.creditStatus === "pending"
                  ? "Credit Pending"
                  : "Credit Overdue"}
              </Text>
              <Text style={styles.statLabel}>Credit Status</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        {/* Section title for the action buttons */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {/* Container for all action buttons */}
        <View style={styles.actionsContainer}>
          {/* View Orders Action Button */}
          {/* Navigates to customer's order history screen */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push(
                `/(customers)/customer-orders?customerId=${customer.customer_id}`
              )
            }
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#FF7675" }, // Red background for orders icon
              ]}
            >
              <FontAwesome5 name="clipboard-list" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>View Orders</Text>
              <Text style={styles.actionSubtitle}>Check order history</Text>
            </View>
            {/* Arrow indicator showing it's a navigation action */}
            <Ionicons name="chevron-forward" size={22} color="#CED4DA" />
          </TouchableOpacity>

          {/* Payment History Action Button */}
          {/* Navigates to customer's payment history screen */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push(
                `/(customers)/customer-payment-history?customerId=${customer.customer_id}`
              )
            }
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#4ECDC4" }, // Teal background for payments icon
              ]}
            >
              <MaterialIcons name="payment" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Payment History</Text>
              <Text style={styles.actionSubtitle}>View payment records</Text>
            </View>
            {/* Arrow indicator showing it's a navigation action */}
            <Ionicons name="chevron-forward" size={22} color="#CED4DA" />
          </TouchableOpacity>

          {/* Create New Order Action Button */}
          {/* Navigates to order creation screen with pre-selected customer */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push(
                `/(orders)/order-add?customerId=${customer.customer_id}`
              )
            }
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: COLORS.primary }, // Primary app color for new order
              ]}
            >
              <Feather name="shopping-cart" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Take New Order</Text>
              <Text style={styles.actionSubtitle}>Create a sales order</Text>
            </View>
            {/* Arrow indicator showing it's a navigation action */}
            <Ionicons name="chevron-forward" size={22} color="#CED4DA" />
          </TouchableOpacity>

          {/* Record Payment Action Button */}
          {/* Only shown if user has permission to manage customer payments */}
          {hasPermission("manage_customer_payments") && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                router.push(
                  `/(customers)/record-payment?customerId=${customer.customer_id}`
                )
              }
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: "#FDCB6E" }, // Yellow background for payment recording
                ]}
              >
                <MaterialCommunityIcons
                  name="cash-plus"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Record Payment</Text>
                <Text style={styles.actionSubtitle}>Add new payment</Text>
              </View>
              {/* Arrow indicator showing it's a navigation action */}
              <Ionicons name="chevron-forward" size={22} color="#CED4DA" />
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Status Information Section */}
        {/* Section title for payment status details */}
        <Text style={styles.sectionTitle}>Payment Status</Text>

        {/* Payment Status Card */}
        {/* Shows detailed payment information and credit status */}
        <View style={styles.paymentStatusCard}>
          {/* Payment Status Header */}
          {/* Contains title and status badge */}
          <View style={styles.paymentStatusHeader}>
            <Text style={styles.paymentStatusTitle}>Credit Status</Text>

            {/* Dynamic status badge with color-coded background */}
            <View
              style={[
                styles.statusBadge,
                {
                  // Background color changes based on credit status
                  backgroundColor:
                    customer.creditStatus === "good"
                      ? "#2ECC7180" // Transparent green for good status
                      : customer.creditStatus === "pending"
                      ? "#F39C1280" // Transparent orange for pending
                      : "#E74C3C80", // Transparent red for overdue
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    // Text color matches the status
                    color:
                      customer.creditStatus === "good"
                        ? "#2ECC71" // Green text for good status
                        : customer.creditStatus === "pending"
                        ? "#F39C12" // Orange text for pending
                        : "#E74C3C", // Red text for overdue
                  },
                ]}
              >
                {/* Human-readable status text */}
                {customer.creditStatus === "good"
                  ? "Good Standing"
                  : customer.creditStatus === "pending"
                  ? "Credit Pending"
                  : "Credit Overdue"}
              </Text>
            </View>
          </View>

          {/* Payment Details Section */}
          {/* Shows specific payment amounts and customer information */}
          <View style={styles.paymentDetails}>
            {/* Pending Payment Amount Row */}
            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Pending Payment:</Text>
              <Text
                style={[
                  styles.paymentDetailValue,
                  {
                    // Color-coded based on whether there are pending payments
                    color:
                      customer.paymentStatus.pending > 0
                        ? "#F39C12" // Orange if there are pending payments
                        : "#2ECC71", // Green if no pending payments
                  },
                ]}
              >
                Rs. {customer.paymentStatus.pending.toLocaleString()}
              </Text>
            </View>

            {/* Overdue Payment Amount Row */}
            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Overdue Payment:</Text>
              <Text
                style={[
                  styles.paymentDetailValue,
                  {
                    // Color-coded based on whether there are overdue payments
                    color:
                      customer.paymentStatus.overdue > 0
                        ? "#E74C3C" // Red if there are overdue payments
                        : "#2ECC71", // Green if no overdue payments
                  },
                ]}
              >
                Rs. {customer.paymentStatus.overdue.toLocaleString()}
              </Text>
            </View>

            {/* Last Order Date Row */}
            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Last Order:</Text>
              <Text style={styles.paymentDetailValue}>
                {customer.lastOrder}
              </Text>
            </View>

            {/* Customer Join Date Row */}
            <View style={styles.paymentDetailRow}>
              <Text style={styles.paymentDetailLabel}>Customer Since:</Text>
              <Text style={styles.paymentDetailValue}>
                {customer.joinedDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing to account for root navigation */}
        {/* Provides extra space at bottom so content isn't hidden behind navigation */}
        <View style={{ height: 95 }} />
      </ScrollView>

      {/* Note: Bottom Navigation removed as it's handled by the root navigation */}
    </SafeAreaView>
  );
}

// StyleSheet Definition
// Contains all the styling rules for the customer detail screen components
const styles = StyleSheet.create({
  // Main container style - provides full screen coverage with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header navigation bar styling
  header: {
    flexDirection: "row", // Horizontal layout for back button, title, and action button
    alignItems: "center", // Vertically center all header elements
    justifyContent: "space-between", // Distribute space evenly between elements
    paddingHorizontal: 16, // Horizontal padding for header content
    paddingVertical: 12, // Vertical padding for header content
    paddingTop:
      // Dynamic top padding to account for device status bar height
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 12,
    backgroundColor: COLORS.light, // Light background color for header
    borderBottomWidth: 1, // Thin bottom border
    borderBottomColor: "#F1F3F5", // Light gray border color
    elevation: 2, // Android shadow elevation
    shadowColor: "#000", // iOS shadow color
    shadowOffset: { width: 0, height: 1 }, // iOS shadow offset
    shadowOpacity: 0.05, // iOS shadow opacity (very subtle)
    shadowRadius: 2, // iOS shadow blur radius
  },

  // Back button container styling
  backButton: {
    width: 40, // Fixed width for consistent touch target
    height: 40, // Fixed height for consistent touch target
    justifyContent: "center", // Center icon vertically
    alignItems: "center", // Center icon horizontally
  },

  // Header title text styling
  headerTitle: {
    fontSize: 18, // Large text size for emphasis
    fontWeight: "700", // Bold font weight
    color: COLORS.dark, // Dark text color for contrast
  },

  // Action button (edit) styling
  actionButton: {
    width: 40, // Fixed width for consistent touch target
    height: 40, // Fixed height for consistent touch target
    justifyContent: "center", // Center icon vertically
    alignItems: "center", // Center icon horizontally
  },

  // Main content container styling
  container: {
    flex: 1, // Takes remaining space after header
    padding: 16, // Uniform padding around content
    paddingBottom: 80, // Extra bottom padding to prevent content from being hidden behind navigation
  },

  // Loading state container styling
  loadingContainer: {
    flex: 1, // Takes full available space
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
  },

  // Loading text styling
  loadingText: {
    marginTop: 10, // Space above the loading text
    fontSize: 16, // Medium text size
    color: COLORS.dark, // Dark text color
  },

  // Error state container styling
  errorContainer: {
    flex: 1, // Takes full available space
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    padding: 20, // Padding around error content
  },

  // Error message text styling
  errorText: {
    fontSize: 16, // Medium text size
    color: COLORS.dark, // Dark text color
    textAlign: "center", // Center-aligned text
    marginTop: 15, // Space above error text
    marginBottom: 20, // Space below error text
  },

  // Retry button styling
  retryButton: {
    backgroundColor: COLORS.primary, // Primary app color background
    paddingHorizontal: 20, // Horizontal padding for button content
    paddingVertical: 10, // Vertical padding for button content
    borderRadius: 8, // Rounded corners
  },

  // Retry button text styling
  retryButtonText: {
    color: COLORS.light, // Light text color for contrast
    fontSize: 16, // Medium text size
    fontWeight: "600", // Semi-bold font weight
  },
  // Customer profile card styling - main customer information display
  profileCard: {
    backgroundColor: COLORS.light, // Light background for card
    borderRadius: 12, // Rounded corners for modern look
    padding: 16, // Internal padding for content
    marginBottom: 16, // Space below the card
    shadowColor: COLORS.dark, // Shadow color for depth
    shadowOffset: { width: 0, height: 2 }, // Shadow position
    shadowOpacity: 0.1, // Subtle shadow opacity
    shadowRadius: 4, // Shadow blur radius
    elevation: 2, // Android elevation for shadow
  },

  // Profile header layout - contains icon and customer details
  profileHeader: {
    flexDirection: "row", // Horizontal layout
    alignItems: "center", // Vertically center items
  },

  // Customer icon container styling
  customerIconContainer: {
    width: 60, // Fixed width for icon container
    height: 60, // Fixed height for icon container
    borderRadius: 15, // Rounded corners
    backgroundColor: COLORS.primary, // Primary color background
    justifyContent: "center", // Center icon vertically
    alignItems: "center", // Center icon horizontally
    marginRight: 16, // Space to the right of icon
  },

  // Customer details section styling
  customerDetails: {
    flex: 1, // Takes remaining space in row
  },

  // Customer name text styling
  customerName: {
    fontSize: 18, // Large text size for prominence
    fontWeight: "700", // Bold font weight
    color: COLORS.dark, // Dark text color
    marginBottom: 6, // Space below customer name
  },

  // Customer info row styling (address, phone)
  customerInfo: {
    flexDirection: "row", // Horizontal layout for icon and text
    alignItems: "center", // Vertically center items
    marginBottom: 4, // Space below each info row
  },

  // Icon styling within customer info rows
  infoIcon: {
    marginRight: 6, // Space between icon and text
  },

  // Customer info text styling
  customerInfoText: {
    fontSize: 14, // Medium text size
    color: "#6c757d", // Gray text color for secondary info
  },

  // Divider line styling
  divider: {
    height: 1, // Thin line
    backgroundColor: "#F1F3F5", // Light gray color
    marginVertical: 12, // Vertical margin around divider
  },

  // Contact section styling
  contactSection: {
    marginTop: 4, // Small margin above section
  },

  // Contact person row styling
  contactPerson: {
    flexDirection: "row", // Horizontal layout for icon and text
    alignItems: "center", // Vertically center items
    marginBottom: 6, // Space below each contact row
  },

  // Contact label styling (bold part of contact text)
  contactLabel: {
    fontWeight: "600", // Semi-bold font weight
    color: COLORS.dark, // Dark text color
  },

  // Contact text styling
  contactText: {
    fontSize: 14, // Medium text size
    color: "#6c757d", // Gray text color
  },
  // Statistics container styling - holds the three stat cards
  statsContainer: {
    flexDirection: "row", // Horizontal layout for three cards
    justifyContent: "space-between", // Even spacing between cards
    marginBottom: 20, // Space below stats section
  },

  // Individual stat card styling
  statCard: {
    backgroundColor: COLORS.light, // Light background for card
    borderRadius: 12, // Rounded corners
    width: "31%", // Each card takes roughly 1/3 of width
    padding: 12, // Internal padding
    alignItems: "center", // Center content horizontally
    shadowColor: COLORS.dark, // Shadow color for depth
    shadowOffset: { width: 0, height: 1 }, // Shadow position
    shadowOpacity: 0.08, // Very subtle shadow
    shadowRadius: 2, // Small shadow blur
    elevation: 1, // Android elevation for shadow
  },

  // Stat icon container styling
  statIconContainer: {
    width: 38, // Fixed width for icon container
    height: 38, // Fixed height for icon container
    borderRadius: 10, // Rounded corners
    justifyContent: "center", // Center icon vertically
    alignItems: "center", // Center icon horizontally
    marginBottom: 8, // Space below icon
  },

  // Stat value text styling (numbers)
  statValue: {
    fontSize: 16, // Medium-large text size
    fontWeight: "700", // Bold font weight for emphasis
    color: COLORS.dark, // Dark text color
    textAlign: "center", // Center-aligned text
  },

  // Status value styling (for credit status)
  statusValue: {
    fontSize: 14, // Medium text size
    fontWeight: "700", // Bold font weight
    textAlign: "center", // Center-aligned text
  },

  // Stat label styling (descriptive text below values)
  statLabel: {
    fontSize: 12, // Small text size
    color: "#6c757d", // Gray text color
    textAlign: "center", // Center-aligned text
    marginTop: 2, // Small space above label
  },

  // Section title styling (for "Quick Actions", "Payment Status")
  sectionTitle: {
    fontSize: 18, // Large text size for section headers
    fontWeight: "700", // Bold font weight
    color: COLORS.dark, // Dark text color
    marginBottom: 12, // Space below section title
  },
  // Actions container styling - holds all action buttons
  actionsContainer: {
    marginBottom: 20, // Space below actions section
  },

  // Individual action card styling (for each action button)
  actionCard: {
    flexDirection: "row", // Horizontal layout for icon, text, and arrow
    alignItems: "center", // Vertically center all items
    backgroundColor: COLORS.light, // Light background
    borderRadius: 12, // Rounded corners for modern look
    padding: 14, // Internal padding for comfort
    marginBottom: 10, // Space between action cards
    shadowColor: COLORS.dark, // Shadow color for depth
    shadowOffset: { width: 0, height: 1 }, // Shadow position
    shadowOpacity: 0.08, // Subtle shadow opacity
    shadowRadius: 2, // Shadow blur radius
    elevation: 1, // Android elevation for shadow
  },

  // Action icon container styling
  actionIconContainer: {
    width: 42, // Fixed width for icon container
    height: 42, // Fixed height for icon container
    borderRadius: 10, // Rounded corners
    justifyContent: "center", // Center icon vertically
    alignItems: "center", // Center icon horizontally
    marginRight: 14, // Space between icon and text
  },

  // Action info section styling (contains title and subtitle)
  actionInfo: {
    flex: 1, // Takes remaining space between icon and arrow
  },

  // Action title styling (main action text)
  actionTitle: {
    fontSize: 16, // Medium-large text size
    fontWeight: "600", // Semi-bold font weight
    color: COLORS.dark, // Dark text color
    marginBottom: 2, // Small space below title
  },

  // Action subtitle styling (descriptive text)
  actionSubtitle: {
    fontSize: 13, // Small text size
    color: "#6c757d", // Gray text color for secondary info
  },
  // Payment status card styling - main container for payment information
  paymentStatusCard: {
    backgroundColor: COLORS.light, // Light background for card
    borderRadius: 12, // Rounded corners for modern look
    padding: 16, // Internal padding for content
    marginBottom: 16, // Space below payment card
    shadowColor: COLORS.dark, // Shadow color for depth
    shadowOffset: { width: 0, height: 2 }, // Shadow position
    shadowOpacity: 0.1, // Subtle shadow opacity
    shadowRadius: 4, // Shadow blur radius
    elevation: 2, // Android elevation for shadow
  },

  // Payment status header styling - contains title and status badge
  paymentStatusHeader: {
    flexDirection: "row", // Horizontal layout for title and badge
    justifyContent: "space-between", // Spread title and badge apart
    alignItems: "center", // Vertically center items
    marginBottom: 12, // Space below header
  },

  // Payment status title styling
  paymentStatusTitle: {
    fontSize: 16, // Medium-large text size
    fontWeight: "700", // Bold font weight
    color: COLORS.dark, // Dark text color
  },

  // Status badge styling (colored indicator for credit status)
  statusBadge: {
    paddingHorizontal: 12, // Horizontal padding inside badge
    paddingVertical: 6, // Vertical padding inside badge
    borderRadius: 20, // Fully rounded corners for pill shape
  },

  // Status badge text styling
  statusBadgeText: {
    fontSize: 12, // Small text size
    fontWeight: "600", // Semi-bold font weight
  },

  // Payment details container styling - shows specific payment amounts
  paymentDetails: {
    backgroundColor: "#F8F9FA", // Very light gray background
    borderRadius: 8, // Rounded corners
    padding: 12, // Internal padding
  },

  // Payment detail row styling - individual rows of payment information
  paymentDetailRow: {
    flexDirection: "row", // Horizontal layout for label and value
    justifyContent: "space-between", // Spread label and value apart
    marginBottom: 8, // Space below each row
  },

  // Payment detail label styling (left side text)
  paymentDetailLabel: {
    fontSize: 14, // Medium text size
    color: "#6c757d", // Gray text color for labels
  },

  // Payment detail value styling (right side text/amounts)
  paymentDetailValue: {
    fontSize: 14, // Medium text size
    fontWeight: "600", // Semi-bold font weight for emphasis
    color: COLORS.dark, // Dark text color
  },

  // Note: Bottom navigation styles removed as they're handled by root navigation
});
