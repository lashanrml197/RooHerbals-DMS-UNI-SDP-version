// Import necessary components and icons for the payment history screen
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import authentication context and API service
import { useAuth } from "../context/AuthContext";
import { getCustomerPayments } from "../services/api";
import { COLORS } from "../theme/colors";

// TypeScript interface definitions for type safety
// Payment structure - represents individual payment records
interface Payment {
  payment_id: string;
  order_id: string;
  payment_date: string;
  amount: number;
  payment_method: "cash" | "cheque" | "bank_transfer";
  reference_number: string | null;
  received_by_name: string | null;
  order_date: string;
}

// Customer details structure - basic customer information
interface CustomerDetails {
  customer_id: string;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
}

export default function CustomerPaymentHistoryScreen() {
  // Get URL parameters passed from the previous screen
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;
  const customerName = params.customerName as string;

  // Authentication hook to check user permissions
  const { hasPermission } = useAuth();

  // State management for the component
  const [loading, setLoading] = useState(true); // Loading state for API calls
  const [payments, setPayments] = useState<Payment[]>([]); // Array to store payment records
  const [customer, setCustomer] = useState<CustomerDetails | null>(null); // Customer information
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(
    null
  ); // Track which payment card is expanded for details view

  // Check user permissions on component mount
  // Redirect back if user doesn't have permission to view customer payments
  useEffect(() => {
    if (!hasPermission("view_customer_payments")) {
      Alert.alert(
        "Unauthorized Access",
        "You don't have permission to view payment history",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Fetch payment data when component mounts
  useEffect(() => {
    // Main function to fetch customer payment data from API
    const fetchPayments = async () => {
      if (!customerId) {
        router.back();
        return;
      }

      try {
        setLoading(true);
        const response = await getCustomerPayments(customerId);

        // Ensure numeric values are properly typed as numbers
        const processedPayments = (response.payments || []).map(
          (payment: any) => ({
            ...payment,
            amount:
              typeof payment.amount === "string"
                ? parseFloat(payment.amount)
                : Number(payment.amount),
          })
        );

        setPayments(processedPayments);
        setCustomer(response.customer || null);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [customerId]);

  // Function to toggle expanded state of payment cards
  // Shows/hides detailed payment information
  // Function to toggle expanded state of payment cards
  // Shows/hides detailed payment information
  const togglePaymentExpand = (paymentId: string) => {
    if (expandedPaymentId === paymentId) {
      setExpandedPaymentId(null); // Collapse if already expanded
    } else {
      setExpandedPaymentId(paymentId); // Expand the selected payment
    }
  };

  // Utility function to format dates in a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Utility function to format time from date string
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency amounts with proper Rs. symbol and decimal places
  // Format currency amounts with proper Rs. symbol and decimal places
  const formatAmount = (amount: number | string) => {
    // Ensure we're working with a number
    const numAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);

    // Handle NaN cases
    if (isNaN(numAmount)) return "Rs. 0.00";

    return `Rs. ${numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format amounts in a compact way for statistics cards (using K/M notation)
  const formatCompactAmount = (amount: number | string) => {
    const numAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numAmount)) return "Rs. 0";

    // For amounts greater than 1,000, use K notation
    if (numAmount >= 1000 && numAmount < 1000000) {
      return `Rs. ${(numAmount / 1000).toFixed(1)}K`;
    }
    // For amounts greater than 1,000,000, use M notation
    else if (numAmount >= 1000000) {
      return `Rs. ${(numAmount / 1000000).toFixed(1)}M`;
    }

    // For smaller amounts, just show whole numbers
    return `Rs. ${numAmount.toFixed(0)}`;
  };

  // Return appropriate icon based on payment method
  // Return appropriate icon based on payment method
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <MaterialIcons name="attach-money" size={20} color="#4CAF50" />;
      case "cheque":
        return <FontAwesome5 name="money-check" size={16} color="#2196F3" />;
      case "bank_transfer":
        return (
          <MaterialCommunityIcons
            name="bank-transfer"
            size={20}
            color="#9C27B0"
          />
        );
      default:
        return <MaterialIcons name="payment" size={20} color="#757575" />;
    }
  };

  // Calculate the total sum of all payments with proper number handling
  const calculateTotalPayments = () => {
    return payments.reduce((total, payment) => {
      const paymentAmount =
        typeof payment.amount === "string"
          ? parseFloat(payment.amount)
          : Number(payment.amount);
      return total + (isNaN(paymentAmount) ? 0 : paymentAmount);
    }, 0);
  };

  // Render individual payment item in the FlatList
  // Render individual payment item in the FlatList
  const renderPaymentItem = ({ item: payment }: { item: Payment }) => {
    const isExpanded = expandedPaymentId === payment.payment_id;

    return (
      <View style={styles.paymentCard}>
        {/* Payment card header - shows basic info and expand/collapse button */}
        <TouchableOpacity
          style={styles.paymentHeader}
          onPress={() => togglePaymentExpand(payment.payment_id)}
        >
          {/* Payment method icon container */}
          <View style={styles.paymentIconContainer}>
            {getPaymentMethodIcon(payment.payment_method)}
          </View>

          {/* Payment amount and date */}
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentAmount}>
              {formatAmount(payment.amount)}
            </Text>
            <Text style={styles.paymentDate}>
              {formatDate(payment.payment_date)}
            </Text>
          </View>

          {/* Order ID and expand/collapse arrow */}
          <View style={styles.paymentOrderInfo}>
            <Text style={styles.orderId}>Order: {payment.order_id}</Text>
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={24}
              color="#757575"
            />
          </View>
        </TouchableOpacity>

        {/* Expanded details section - only shown when payment is expanded */}
        {isExpanded && (
          <View style={styles.paymentDetails}>
            {/* First row of details: Payment method and Payment date */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <View style={styles.methodContainer}>
                  {getPaymentMethodIcon(payment.payment_method)}
                  <Text style={styles.detailValue}>
                    {payment.payment_method
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payment Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(payment.payment_date)} at{" "}
                  {formatTime(payment.payment_date)}
                </Text>
              </View>
            </View>

            {/* Second row of details: Order date and Received by */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Order Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(payment.order_date)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Received By</Text>
                <Text style={styles.detailValue}>
                  {payment.received_by_name || "System"}
                </Text>
              </View>
            </View>

            {/* Reference number section - only shown if reference exists */}
            {payment.reference_number && (
              <View style={styles.referenceContainer}>
                <Text style={styles.detailLabel}>Reference Number</Text>
                <Text style={styles.referenceValue}>
                  {payment.reference_number}
                </Text>
              </View>
            )}

            {/* Action buttons section */}
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  router.push({
                    pathname: "/(orders)/order-details",
                    params: { id: payment.order_id },
                  });
                }}
              >
                <MaterialIcons
                  name="visibility"
                  size={16}
                  color={COLORS.light}
                />
                <Text style={styles.actionButtonText}>View Order Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Main component render method
  // Main component render method
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* App header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {customerName || (customer ? customer.name : "Customer")} Payments
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading state - show spinner while fetching data */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      ) : (
        <>
          {/* Statistics cards section - shows quick payment summary */}
          <View style={styles.statsContainer}>
            {/* Total number of payments */}
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{payments.length}</Text>
              <Text style={styles.statLabel}>Total Payments</Text>
            </View>

            {/* Total amount paid in compact format */}
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatCompactAmount(calculateTotalPayments())}
              </Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>

            {/* Last payment date */}
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {payments.length > 0
                  ? formatDate(payments[0].payment_date)
                  : "N/A"}
              </Text>
              <Text style={styles.statLabel}>Last Payment</Text>
            </View>
          </View>

          {/* Main content container */}
          <View style={styles.container}>
            {/* FlatList to render payment history */}
            <FlatList
              data={payments}
              renderItem={renderPaymentItem}
              keyExtractor={(item) => item.payment_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.paymentsList}
              ListEmptyComponent={
                // Show empty state when no payments found
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="cash-remove"
                    size={60}
                    color="#ADB5BD"
                  />
                  <Text style={styles.emptyText}>
                    No payment records found for this customer
                  </Text>
                </View>
              }
            />
          </View>

          {/* Floating Action Button (FAB) - for adding new payments */}
          <View style={styles.fabContainer}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                router.push({
                  pathname: "/(customers)/customer-payments",
                  params: { customerId: customerId },
                });
              }}
            >
              <MaterialIcons name="add" size={24} color={COLORS.light} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// StyleSheet definitions for component styling
const styles = StyleSheet.create({
  // Main container with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header section styling with shadow and proper spacing
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12, // Reduced from 16
    paddingVertical: 8, // Reduced from 12
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 15 : 8, // Android status bar adjustment
  },

  // Back button styling - circular touch area
  backButton: {
    width: 36, // Reduced from 40
    height: 36, // Reduced from 40
    justifyContent: "center",
    alignItems: "center",
  },

  // Header title text styling
  headerTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Loading state container - centered spinner
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Loading text below spinner
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6c757d",
  },

  // Statistics cards container - horizontal layout
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12, // Reduced from 16
    paddingVertical: 10, // Reduced from 16
  },

  // Individual stat card styling with shadow
  statCard: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 6, // Reduced from 8
    padding: 8, // Reduced from 12
    marginHorizontal: 3, // Reduced from 4
    alignItems: "center",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1, // Reduced from 2
    elevation: 1,
  },

  // Large value text in stat cards
  statValue: {
    fontSize: 14, // Reduced from 16
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2, // Reduced from 4
  },

  // Small label text in stat cards
  statLabel: {
    fontSize: 10, // Reduced from 12
    color: "#6c757d",
  },

  // Main content container
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // FlatList content styling with bottom padding for FAB
  paymentsList: {
    paddingBottom: 80, // Space for FAB
  },

  // Individual payment card container with shadow
  paymentCard: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Payment card header - clickable area
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  // Container for payment method icon
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  // Payment basic info section
  paymentInfo: {
    flex: 1,
  },

  // Payment amount text styling
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Payment date text styling
  paymentDate: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
  },

  // Order ID and expand arrow container
  paymentOrderInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Order ID text styling
  orderId: {
    fontSize: 13,
    color: "#6c757d",
    marginRight: 8,
  },

  // Expanded payment details container
  paymentDetails: {
    padding: 16,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },

  // Row container for detail items
  detailRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  // Individual detail item container
  detailItem: {
    flex: 1,
  },

  // Detail label text styling
  detailLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },

  // Detail value text styling
  detailValue: {
    fontSize: 14,
    color: COLORS.dark,
  },

  // Payment method with icon container
  methodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Reference number section container
  referenceContainer: {
    marginBottom: 16,
  },

  // Reference number text with monospace font and background
  referenceValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontFamily: "monospace",
    backgroundColor: "#F1F3F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },

  // Payment actions button container
  paymentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },

  // Action button styling
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  // Action button text styling
  actionButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },

  // Empty state container - centered content
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },

  // Empty state text styling
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 16,
  },

  // Floating Action Button container - positioned absolute
  fabContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },

  // Floating Action Button styling with shadow
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});
