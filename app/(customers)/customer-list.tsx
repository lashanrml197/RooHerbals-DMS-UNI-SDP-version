// app/(customers)/customer-list.tsx
// Main customer list screen that displays all customers with search functionality

// Import all necessary icon libraries for UI elements
import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
// Router for navigation between screens
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
// Import React Native components for building the UI
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Custom component to handle user permissions
import PermissionGate from "../components/PermissionGate";
// API service to fetch customer data from backend
import { getAllCustomers } from "../services/api";
// Color theme constants for consistent styling
import { COLORS } from "../theme/colors";

// TypeScript interface defining the structure of a customer object
interface Customer {
  id: string; // Unique identifier for the customer
  name: string; // Customer business name
  address: string; // Customer address
  phone: string; // Contact phone number
  lastOrder?: string; // Date of last order (optional)
  totalSpent?: number; // Total amount spent by customer (optional)
  contactPerson?: string; // Name of contact person (optional)
  email?: string; // Email address (optional)
  area?: string; // Geographic area (optional)
}

// TypeScript interface for customer statistics displayed at the top
interface CustomerStats {
  total: number; // Total number of customers
  paid: number; // Number of customers with paid status
  credits: number; // Number of customers with credits
}

export default function CustomerListScreen() {
  // State management for customer data
  const [customers, setCustomers] = useState<Customer[]>([]);

  // State for customer statistics (total, paid, credits)
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    paid: 0,
    credits: 0,
  });

  // State for search functionality - stores user input
  const [searchQuery, setSearchQuery] = useState("");

  // Loading state to show spinner while fetching data
  const [loading, setLoading] = useState(true);

  // Error state to handle and display any API errors
  const [error, setError] = useState<string | null>(null);

  // Function to fetch customer data from the backend API
  const fetchCustomers = async () => {
    try {
      // Set loading state and clear any previous errors
      setLoading(true);
      setError(null);

      // Call API to get customer data and statistics
      const data = await getAllCustomers();

      // Update state with received data
      setCustomers(data.customers);
      setStats(data.stats);
    } catch (err: any) {
      // Log error for debugging purposes
      console.error("Error fetching customers:", err);
      // Set user-friendly error message
      setError(err.message || "Failed to load customers");

      // Set fallback empty data to prevent app crashes
      setCustomers([]);
      setStats({
        total: 0,
        paid: 0,
        credits: 0,
      });
    } finally {
      // Always set loading to false when done (success or error)
      setLoading(false);
    }
  };

  // React hook to fetch customers when component mounts
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search query - searches name, address, and contact person
  const filteredCustomers = searchQuery
    ? customers.filter(
        (customer) =>
          // Search in customer name (case insensitive)
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          // Search in customer address (case insensitive)
          customer.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          // Search in contact person name if it exists (case insensitive)
          (customer.contactPerson &&
            customer.contactPerson
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
    : customers; // If no search query, show all customers

  // Function to handle customer selection and navigate to detail screen
  const handleSelectCustomer = (customer: Customer) => {
    // Navigate to customer detail screen, passing customer ID and name as parameters
    router.push({
      pathname: "/(customers)/customer-detail",
      params: { customerId: customer.id, customerName: customer.name },
    });
  };

  // Component to render each customer item in the list
  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => handleSelectCustomer(item)}
    >
      {/* Customer header section with icon, name, and address */}
      <View style={styles.customerHeader}>
        {/* Store icon container */}
        <View style={styles.customerIconContainer}>
          <FontAwesome5 name="store" size={18} color={COLORS.secondary} />
        </View>

        {/* Customer basic information */}
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>

          {/* Address row with map pin icon */}
          <View style={styles.customerAddress}>
            <Feather
              name="map-pin"
              size={12}
              color="#6c757d"
              style={styles.smallIcon}
            />
            <Text style={styles.addressText}>{item.address}</Text>
          </View>
        </View>

        {/* Right arrow icon indicating the item is clickable */}
        <Ionicons name="chevron-forward" size={20} color="#CED4DA" />
      </View>

      {/* Customer details section with phone and last order */}
      <View style={styles.customerDetails}>
        {/* Phone number row */}
        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="phone"
            size={14}
            color="#6c757d"
            style={styles.smallIcon}
          />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>

        {/* Last order date row */}
        <View style={styles.detailItem}>
          <AntDesign
            name="clockcircleo"
            size={14}
            color="#6c757d"
            style={styles.smallIcon}
          />
          <Text style={styles.detailText}>Last order: {item.lastOrder}</Text>
        </View>
      </View>

      {/* Customer footer section showing total sales amount */}
      <View style={styles.customerFooter}>
        <View style={styles.salesInfo}>
          <Text style={styles.salesAmount}>
            Rs. {item.totalSpent?.toLocaleString()}
          </Text>
          <Text style={styles.salesLabel}>Total Sales</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show loading screen while data is being fetched
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

        {/* Header with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer List</Text>
        </View>

        {/* Loading indicator with spinner and text */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main component render - customer list with search and stats
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar configuration */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header section with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer List</Text>
      </View>

      <View style={styles.container}>
        {/* Search bar section */}
        <View style={styles.searchContainer}>
          {/* Search icon */}
          <Feather
            name="search"
            size={18}
            color="#ADB5BD"
            style={styles.searchIcon}
          />

          {/* Search input field */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#ADB5BD"
          />

          {/* Clear search button - only shown when there's text */}
          {searchQuery !== "" && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <AntDesign name="close" size={16} color="#ADB5BD" />
            </TouchableOpacity>
          )}
        </View>

        {/* Customer statistics section showing total, paid, and credits */}
        <View style={styles.statsContainer}>
          {/* Total customers stat */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Paid customers stat */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.paid}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Customers with credits stat */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.credits}</Text>
            <Text style={styles.statLabel}>Credits</Text>
          </View>
        </View>

        {/* Customer list using FlatList for performance with large datasets */}
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          // Empty state component shown when no customers found
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {error ? (
                // Error state with retry button
                <>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={50}
                    color="#E74C3C"
                  />
                  <Text style={styles.emptyText}>Error loading customers</Text>
                  <Text style={styles.emptySubtext}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => fetchCustomers()}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // No customers found state
                <>
                  <MaterialCommunityIcons
                    name="store-off"
                    size={50}
                    color="#CED4DA"
                  />
                  <Text style={styles.emptyText}>No customers found</Text>
                  <Text style={styles.emptySubtext}>
                    Try adjusting your search
                  </Text>
                </>
              )}
            </View>
          }
        />

        {/* Floating Action Button (FAB) to add new customer - only visible with permission */}
        <PermissionGate permission="add_customer">
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("/(customers)/customer-add")}
          >
            <AntDesign name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </PermissionGate>
      </View>
    </SafeAreaView>
  );
}

// StyleSheet containing all the styles for the customer list screen
const styles = StyleSheet.create({
  // Main container taking full screen height with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header section styling with shadow and proper spacing
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Dynamic padding for Android status bar
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 40 : 12,
  },

  // Circular back button with centered icon
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header title text styling
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Main content container with padding
  container: {
    flex: 1,
    padding: 16,
  },

  // Loading state container - centered content
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Loading text below spinner
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.dark,
  },

  // Search bar container with border and padding
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F3F5",
    height: 48,
  },

  // Search icon styling with right margin
  searchIcon: {
    marginRight: 8,
  },

  // Search input field taking remaining space
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    color: COLORS.dark,
  },

  // Clear search button with padding for touch area
  clearButton: {
    padding: 6,
  },

  // Statistics container with shadow and rounded corners
  statsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    marginBottom: 16,
    padding: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // Individual stat item - takes equal space
  statItem: {
    flex: 1,
    alignItems: "center",
  },

  // Stat number value styling
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Stat label text styling
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },

  // Vertical divider between stats
  statDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "#F1F3F5",
  },

  // FlatList content container with bottom padding for FAB
  listContent: {
    paddingBottom: 80, // Space for FAB and bottom nav
  },

  // Individual customer card styling with shadow
  customerCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },

  // Customer card header with icon and basic info
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  // Container for store icon with background
  customerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  // Customer name and address container
  customerInfo: {
    flex: 1,
  },

  // Customer business name styling
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },

  // Address row with icon
  customerAddress: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Small icons styling with right margin
  smallIcon: {
    marginRight: 4,
  },

  // Address text styling
  addressText: {
    fontSize: 13,
    color: "#6c757d",
  },

  // Customer details section with borders
  customerDetails: {
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    marginBottom: 12,
  },

  // Individual detail item (phone, last order)
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },

  // Detail text styling (phone number, dates)
  detailText: {
    fontSize: 13,
    color: "#6c757d",
  },

  // Customer card footer section
  customerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Sales information container
  salesInfo: {
    flexDirection: "column",
  },

  // Sales amount text styling
  salesAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  // Sales label text styling
  salesLabel: {
    fontSize: 12,
    color: "#6c757d",
  },

  // Empty state container - centered content
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },

  // Empty state main text
  emptyText: {
    fontSize: 18,
    color: "#6c757d",
    fontWeight: "600",
    marginTop: 10,
  },

  // Empty state subtitle text
  emptySubtext: {
    fontSize: 14,
    color: "#ADB5BD",
    marginTop: 6,
  },

  // Retry button for error state
  retryButton: {
    marginTop: 15,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  // Retry button text styling
  retryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },

  // Floating Action Button (FAB) for adding new customer
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});
