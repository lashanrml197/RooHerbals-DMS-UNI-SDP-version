// Import all necessary icon libraries for the UI components
import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
// Expo router for navigation between screens
import { router } from "expo-router";
// React hooks for state management and lifecycle
import React, { useEffect, useState } from "react";
// React Native components for building the mobile interface
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Authentication context to check user permissions and get user data
import { useAuth } from "../context/AuthContext";
// API service functions for backend communication
import {
  getAllCustomers,
  getCustomerCredits,
  recordPayment,
  updateCustomerCredit,
} from "../services/api";
// Color theme constants for consistent styling
import { COLORS } from "../theme/colors";

// Define types for TypeScript type safety and better code documentation

// Customer interface - represents a customer with basic info and credit status
interface Customer {
  id: string;
  name: string;
  creditStatus: "good" | "pending" | "overdue";
}

// CreditOrder interface - represents an individual order that's on credit
interface CreditOrder {
  order_id: string;
  order_date: string;
  total_amount: number;
  payment_status: string;
  paid_amount: number;
  remaining_amount: number;
  days_outstanding: number;
}

// CreditSummary interface - represents the overall credit status for a customer
interface CreditSummary {
  credit_limit: number;
  credit_balance: number;
  available_credit: number;
}

export default function CustomerCreditsScreen() {
  // Get authentication context for permission checking and user info
  const { hasPermission, user } = useAuth();

  // Navigation state - controls which view is currently displayed
  const [view, setView] = useState<"customerList" | "creditDetails">(
    "customerList"
  );

  // Data state - stores all the fetched data from the backend
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [creditOrders, setCreditOrders] = useState<CreditOrder[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(
    null
  );
  const [searchText, setSearchText] = useState("");

  // UI state - controls loading indicators and modal visibility
  const [loading, setLoading] = useState(false);
  const [updateCreditModalVisible, setUpdateCreditModalVisible] =
    useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CreditOrder | null>(null);

  // Form state - stores user input for various forms
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "cheque" | "bank_transfer"
  >("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  // Permission check on mount - ensures user has access to this feature
  useEffect(() => {
    if (!hasPermission("view_customer_payments")) {
      Alert.alert(
        "Unauthorized Access",
        "You don't have permission to access customer credits",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Load customers on initial render - fetches all customers when screen loads
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch all customers from the backend API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await getAllCustomers();
      setCustomers(response.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      Alert.alert("Error", "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // Fetch credit details for a specific customer including orders and summary
  const fetchCustomerCredits = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await getCustomerCredits(customerId);
      setCreditOrders(response.creditOrders || []);
      setCreditSummary(response.creditSummary || null);
    } catch (error) {
      console.error("Error fetching credit details:", error);
      Alert.alert("Error", "Failed to load credit details");
    } finally {
      setLoading(false);
    }
  };

  // Handle customer selection from the list - navigates to credit details view
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerCredits(customer.id);
    setView("creditDetails");
  };

  // Handle updating customer credit limit with validation
  const handleUpdateCreditLimit = async () => {
    if (!selectedCustomer) return;

    if (!newCreditLimit || isNaN(parseFloat(newCreditLimit))) {
      Alert.alert("Error", "Please enter a valid credit limit");
      return;
    }

    try {
      setLoading(true);
      await updateCustomerCredit(selectedCustomer.id, {
        credit_limit: parseFloat(newCreditLimit),
      });

      // Refresh credit details after update
      fetchCustomerCredits(selectedCustomer.id);
      setUpdateCreditModalVisible(false);
      Alert.alert("Success", "Credit limit updated successfully");
    } catch (error) {
      console.error("Error updating credit limit:", error);
      Alert.alert("Error", "Failed to update credit limit");
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting an order for payment - opens payment modal with pre-filled data
  const handleSelectOrderForPayment = (order: CreditOrder) => {
    setSelectedOrder(order);
    setPaymentAmount(order.remaining_amount.toString());
    setPaymentModalVisible(true);
  };
  // Handle recording a payment with comprehensive validation
  const handleRecordPayment = async () => {
    if (!selectedCustomer || !selectedOrder) return;

    // Validate payment amount is a valid number
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      Alert.alert("Error", "Please enter a valid payment amount");
      return;
    }

    // Ensure payment amount is positive
    if (parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Payment amount must be greater than zero");
      return;
    }

    // Prevent overpayment
    if (parseFloat(paymentAmount) > selectedOrder.remaining_amount) {
      Alert.alert(
        "Error",
        "Payment amount cannot exceed the remaining balance"
      );
      return;
    }

    try {
      setSubmittingPayment(true);

      // Prepare payment data in the format expected by the API
      const paymentData = {
        order_id: selectedOrder.order_id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: paymentNotes || null,
        received_by: user?.id, // Track who recorded the payment
      };

      // Send payment data to the backend
      await recordPayment(paymentData);

      // Clean up and refresh data after successful payment
      setPaymentModalVisible(false);
      resetPaymentForm();

      // Refresh credit details to show updated balances
      fetchCustomerCredits(selectedCustomer.id);

      Alert.alert("Success", "Payment recorded successfully");
    } catch (error) {
      console.error("Error recording payment:", error);
      Alert.alert("Error", "Failed to record payment. Please try again.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Reset all payment form fields to their initial state
  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("cash");
    setReferenceNumber("");
    setPaymentNotes("");
    setSelectedOrder(null);
  };

  // Filter customers based on search text (case-insensitive)
  const filteredCustomers = searchText
    ? customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : customers;

  // Utility function to format dates in a user-friendly format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Utility function to format currency amounts with proper formatting
  const formatAmount = (amount: number) => {
    return `Rs. ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get appropriate color for payment status based on days outstanding
  const getStatusColor = (days: number) => {
    if (days <= 15) return "#4CAF50"; // Good (green)
    if (days <= 30) return "#FFC107"; // Warning (yellow)
    return "#F44336"; // Overdue (red)
  };

  // Get text label for payment status based on days outstanding
  const getStatusText = (days: number) => {
    if (days <= 15) return "Recent";
    if (days <= 30) return "Upcoming";
    return "Overdue";
  };

  // Render individual customer item in the customers list
  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => handleSelectCustomer(item)}
    >
      <View style={styles.customerIconContainer}>
        <FontAwesome5 name="store" size={16} color={COLORS.light} />
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#ADB5BD" />
    </TouchableOpacity>
  );

  // Render individual credit order item showing order details and payment status
  const renderCreditOrderItem = ({ item }: { item: CreditOrder }) => (
    <View style={styles.creditOrderItem}>
      {/* Order header with ID, date, and status badge */}
      <View style={styles.creditOrderHeader}>
        <View style={styles.creditOrderId}>
          <Text style={styles.orderIdText}>{item.order_id}</Text>
          <Text style={styles.orderDateText}>
            {formatDate(item.order_date)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(item.days_outstanding),
            },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {getStatusText(item.days_outstanding)}
          </Text>
        </View>
      </View>

      {/* Order financial details */}
      <View style={styles.creditOrderDetails}>
        <View style={styles.creditOrderDetailRow}>
          <Text style={styles.detailLabel}>Total Amount:</Text>
          <Text style={styles.detailValue}>
            {formatAmount(item.total_amount)}
          </Text>
        </View>

        <View style={styles.creditOrderDetailRow}>
          <Text style={styles.detailLabel}>Amount Paid:</Text>
          <Text style={styles.detailValue}>
            {formatAmount(item.paid_amount)}
          </Text>
        </View>

        <View style={styles.creditOrderDetailRow}>
          <Text style={styles.detailLabel}>Remaining:</Text>
          <Text
            style={[
              styles.detailValue,
              { fontWeight: "700", color: "#F44336" },
            ]}
          >
            {formatAmount(item.remaining_amount)}
          </Text>
        </View>

        <View style={styles.creditOrderDetailRow}>
          <Text style={styles.detailLabel}>Outstanding:</Text>
          <Text style={styles.detailValue}>
            {item.days_outstanding}{" "}
            {item.days_outstanding === 1 ? "day" : "days"}
          </Text>
        </View>
      </View>

      {/* Action buttons - only show if user has payment management permissions */}
      <View style={styles.creditOrderActions}>
        {hasPermission("manage_customer_payments") && (
          <TouchableOpacity
            style={styles.recordPaymentButton}
            onPress={() => handleSelectOrderForPayment(item)}
          >
            <MaterialIcons name="payments" size={16} color={COLORS.light} />
            <Text style={styles.recordPaymentButtonText}>Record Payment</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Payment Modal Component - handles recording new payments for credit orders
  const PaymentModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={paymentModalVisible}
      onRequestClose={() => setPaymentModalVisible(false)}
    >
      <View style={styles.centeredModalContainer}>
        <View style={styles.centeredModalContent}>
          {/* Modal header with title and close button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Display order information for context */}
            {selectedOrder && (
              <View style={styles.orderInfoSection}>
                <Text style={styles.orderInfoTitle}>Order Details</Text>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Order ID:</Text>
                  <Text style={styles.orderInfoValue}>
                    {selectedOrder.order_id}
                  </Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Total:</Text>
                  <Text style={styles.orderInfoValue}>
                    {formatAmount(selectedOrder.total_amount)}
                  </Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Remaining:</Text>
                  <Text style={[styles.orderInfoValue, { color: "#F44336" }]}>
                    {formatAmount(selectedOrder.remaining_amount)}
                  </Text>
                </View>
              </View>
            )}

            {/* Payment form section */}
            <View style={styles.formSection}>
              {/* Payment amount input with currency symbol */}
              <Text style={styles.inputLabel}>
                Payment Amount <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>Rs.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                />
              </View>

              {/* Payment method selection buttons */}
              <Text style={styles.inputLabel}>
                Payment Method <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.paymentMethodContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === "cash" &&
                      styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod("cash")}
                >
                  <MaterialIcons
                    name="attach-money"
                    size={18}
                    color={
                      paymentMethod === "cash" ? COLORS.light : COLORS.dark
                    }
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === "cash" &&
                        styles.paymentMethodTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === "cheque" &&
                      styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod("cheque")}
                >
                  <FontAwesome5
                    name="money-check-alt"
                    size={16}
                    color={
                      paymentMethod === "cheque" ? COLORS.light : COLORS.dark
                    }
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === "cheque" &&
                        styles.paymentMethodTextActive,
                    ]}
                  >
                    Cheque
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === "bank_transfer" &&
                      styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod("bank_transfer")}
                >
                  <MaterialCommunityIcons
                    name="bank"
                    size={18}
                    color={
                      paymentMethod === "bank_transfer"
                        ? COLORS.light
                        : COLORS.dark
                    }
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === "bank_transfer" &&
                        styles.paymentMethodTextActive,
                    ]}
                  >
                    Bank
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reference number input - required for cheques */}
              <Text style={styles.inputLabel}>
                Reference Number
                {paymentMethod === "cheque" && (
                  <Text style={styles.requiredAsterisk}>*</Text>
                )}
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Cheque/Transaction Number"
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                />
              </View>

              {/* Optional notes field */}
              <Text style={styles.inputLabel}>Notes</Text>
              <View style={[styles.inputContainer, { height: 80 }]}>
                <TextInput
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: "top" },
                  ]}
                  placeholder="Add notes about this payment"
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  multiline
                />
              </View>
            </View>
          </ScrollView>

          {/* Modal action buttons */}
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPaymentModalVisible(false)}
              disabled={submittingPayment}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRecordPayment}
              disabled={submittingPayment}
            >
              {submittingPayment ? (
                <ActivityIndicator size="small" color={COLORS.light} />
              ) : (
                <Text style={styles.submitButtonText}>Record Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Credit Limit Update Modal Component - allows updating customer credit limits
  const CreditLimitUpdateModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={updateCreditModalVisible}
      onRequestClose={() => setUpdateCreditModalVisible(false)}
    >
      <View style={styles.centeredModalContainer}>
        <View style={styles.centeredModalContent}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Credit Limit</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setUpdateCreditModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          {/* Credit limit input form */}
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>
              New Credit Limit <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter credit limit"
                value={newCreditLimit}
                onChangeText={setNewCreditLimit}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            {/* Modal action buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setUpdateCreditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleUpdateCreditLimit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.light} />
                ) : (
                  <Text style={styles.submitButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header Navigation - Dynamic title and back button behavior */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (view === "creditDetails") {
              // Go back to customer list from credit details
              setView("customerList");
              setSelectedCustomer(null);
            } else {
              // Exit the screen entirely
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {view === "customerList"
            ? "Customer Credits"
            : selectedCustomer?.name}
        </Text>
        {/* Show home button only in credit details view */}
        {view === "creditDetails" && (
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => router.push("/(tabs)/home")}
          >
            <MaterialIcons name="home" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        )}
        {view === "customerList" && <View style={{ width: 40 }} />}
      </View>

      {/* Main Content Area - Conditionally renders customer list or credit details */}
      {view === "customerList" ? (
        // Customer List View - Shows all customers with search functionality
        <View style={styles.container}>
          {/* Search bar for filtering customers */}
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={20}
              color="#ADB5BD"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer name"
              value={searchText}
              onChangeText={setSearchText}
            />
            {/* Clear search button */}
            {searchText !== "" && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Feather name="x" size={20} color="#ADB5BD" />
              </TouchableOpacity>
            )}
          </View>

          {/* Customer list or loading indicator */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading customers...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              renderItem={renderCustomerItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.customerListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <FontAwesome5 name="users-slash" size={50} color="#ADB5BD" />
                  <Text style={styles.emptyListText}>No customers found</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // Credit Details View - Shows selected customer's credit information
        <View style={styles.container}>
          {/* Credit Summary Card - Shows credit limits and balances */}
          {creditSummary && (
            <View style={styles.creditSummaryCard}>
              <View style={styles.creditSummaryRow}>
                <View style={styles.creditSummaryItem}>
                  <Text style={styles.creditSummaryLabel}>Credit Limit</Text>
                  <Text style={styles.creditSummaryValue}>
                    {formatAmount(creditSummary.credit_limit)}
                  </Text>
                </View>

                <View style={styles.creditSummaryItem}>
                  <Text style={styles.creditSummaryLabel}>Current Balance</Text>
                  <Text
                    style={[
                      styles.creditSummaryValue,
                      {
                        color:
                          creditSummary.credit_balance > 0
                            ? "#F44336"
                            : "#4CAF50",
                      },
                    ]}
                  >
                    {formatAmount(creditSummary.credit_balance)}
                  </Text>
                </View>

                <View style={styles.creditSummaryItem}>
                  <Text style={styles.creditSummaryLabel}>
                    Available Credit
                  </Text>
                  <Text style={styles.creditSummaryValue}>
                    {formatAmount(creditSummary.available_credit)}
                  </Text>
                </View>
              </View>
              {/* Update credit limit button - only shown if user has permissions */}
              {hasPermission("manage_customer_payments") && (
                <TouchableOpacity
                  style={styles.updateCreditButton}
                  onPress={() => {
                    setNewCreditLimit(creditSummary.credit_limit.toString());
                    setUpdateCreditModalVisible(true);
                  }}
                >
                  <MaterialIcons name="edit" size={16} color={COLORS.light} />
                  <Text style={styles.updateCreditButtonText}>
                    Update Credit Limit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Section header for credit orders list */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Outstanding Credit Orders</Text>
          </View>

          {/* Credit orders list or loading indicator */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading credit details...</Text>
            </View>
          ) : (
            <FlatList
              data={creditOrders}
              renderItem={renderCreditOrderItem}
              keyExtractor={(item) => item.order_id}
              contentContainerStyle={styles.creditOrdersListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <MaterialCommunityIcons
                    name="credit-card-check-outline"
                    size={50}
                    color="#ADB5BD"
                  />
                  <Text style={styles.emptyListText}>
                    No outstanding credit orders
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Modal Components - Rendered outside main content flow */}
      <CreditLimitUpdateModal />
      <PaymentModal />

      {/* Bottom Navigation - Fixed navigation bar at bottom of screen */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)")}
        >
          <AntDesign name="home" size={22} color={COLORS.dark} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(customers)")}
        >
          <FontAwesome5 name="users" size={20} color={COLORS.primary} />
          <Text style={[styles.navLabel, { color: COLORS.primary }]}>
            Customers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <FontAwesome5 name="user-alt" size={20} color={COLORS.dark} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// StyleSheet object containing all the styles for the component
// Organized by component/section for better maintainability
const styles = StyleSheet.create({
  // Main container styles
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background
  },

  // Header navigation styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 40 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Main content container
  container: {
    flex: 1,
    padding: 16,
  },

  // Section header styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary, // Accent line on the left
    paddingLeft: 8,
  },

  // Search functionality styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: COLORS.dark,
  },

  // List content styles
  customerListContent: {
    paddingBottom: 70, // Space for bottom navigation
  },
  creditOrdersListContent: {
    paddingBottom: 70, // Space for bottom navigation
  },

  // Customer list item styles
  customerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F3F5",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  customerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },

  // Credit status indicator styles (unused but kept for consistency)
  creditStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  creditStatusText: {
    fontSize: 12,
    color: "#6c757d",
  },

  // Credit summary card styles
  creditSummaryCard: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F3F5",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  creditSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  creditSummaryItem: {
    alignItems: "center",
    flex: 1,
  },
  creditSummaryLabel: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 4,
  },
  creditSummaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  updateCreditButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  updateCreditButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },

  // Credit order item styles
  creditOrderItem: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F3F5",
    overflow: "hidden",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  creditOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    backgroundColor: "#FAFAFA", // Slightly different background for header
  },
  creditOrderId: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  orderDateText: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "600",
  },
  creditOrderDetails: {
    padding: 12,
  },
  creditOrderDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  creditOrderActions: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    padding: 12,
    alignItems: "flex-end",
  },
  recordPaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  recordPaymentButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },

  // Loading and empty state styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6c757d",
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyListText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6c757d",
  },

  // Modal container styles
  centeredModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent overlay
    padding: 16,
  },
  centeredModalContent: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 16,
    maxHeight: 400, // Limit height to enable scrolling
  },

  // Form input styles
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: "#FF6B6B", // Red color for required field indicator
    fontWeight: "bold",
  },
  inputContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 16,
    color: "#6c757d",
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: COLORS.dark,
  },

  // Payment method selection styles
  paymentMethodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  paymentMethodButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    backgroundColor: "#FFFFFF",
    width: "30%",
  },
  paymentMethodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginLeft: 6,
  },
  paymentMethodTextActive: {
    color: COLORS.light,
  },

  // Modal button styles
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.light,
  },

  // Bottom navigation styles
  bottomNav: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingVertical: 10,
    justifyContent: "space-around",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    width: "33%",
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.dark,
    fontWeight: "500",
  },

  // Order info section styles (used in payment modal)
  orderInfoSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 8,
  },
  orderInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  orderInfoLabel: {
    fontSize: 13,
    color: "#6c757d",
  },
  orderInfoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dark,
  },

  // Form section grouping
  formSection: {
    marginBottom: 16,
  },
});
