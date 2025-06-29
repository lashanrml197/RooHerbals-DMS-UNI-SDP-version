// Import necessary components and icons from React Native and Expo
import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
// Import custom hooks and services
import { useAuth } from "../context/AuthContext";
import {
  getAllCustomers,
  getCustomerOrders,
  getCustomerPayments,
  recordPayment,
} from "../services/api";
import { COLORS } from "../theme/colors";

// TypeScript interface definitions for data structures used in the component

// Interface for customer data structure
interface Customer {
  id: string;
  name: string;
}

// Interface for order data structure with payment status tracking
interface Order {
  order_id: string;
  order_date: string;
  total_amount: number;
  payment_status: "pending" | "partial" | "paid";
  payment_type: string;
  remaining_amount?: number; // Calculated field for unpaid amount
}

// Interface for payment record data structure
interface Payment {
  payment_id: string;
  order_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  received_by_name: string | null;
}

// Get device dimensions and determine if device is tablet for responsive layout
const { width, height } = Dimensions.get("window");
const isTablet = width > 768;

// Main functional component for managing customer payments
export default function CustomerPaymentsScreen() {
  // Authentication hook to check user permissions and get user data
  const { hasPermission, user } = useAuth();

  // State variables for managing component data and UI states
  const [customers, setCustomers] = useState<Customer[]>([]); // List of all customers
  const [payments, setPayments] = useState<Payment[]>([]); // Payment history for selected customer
  const [orders, setOrders] = useState<Order[]>([]); // Orders for selected customer (pending/partial payments only)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  ); // Currently selected customer
  const [searchText, setSearchText] = useState(""); // Search filter for customer list

  // Loading states for different API calls
  const [loading, setLoading] = useState(false); // General loading state
  const [loadingOrders, setLoadingOrders] = useState(false); // Loading state for order fetching
  const [recordingPayment, setRecordingPayment] = useState(false); // Loading state for payment submission

  // Permission check - redirect if user doesn't have view permission
  useEffect(() => {
    if (!hasPermission("view_customer_payments")) {
      Alert.alert(
        "Unauthorized Access",
        "You don't have permission to access customer payments",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Modal visibility states for different UI components
  const [paymentModalVisible, setPaymentModalVisible] = useState(false); // Mobile payment history modal
  const [paymentFormVisible, setPaymentFormVisible] = useState(false); // Payment recording form modal
  const [orderDropdownVisible, setOrderDropdownVisible] = useState(false); // Order selection dropdown

  // Form state variables for new payment recording
  const [amount, setAmount] = useState(""); // Payment amount input
  const [paymentMethod, setPaymentMethod] = useState("cash"); // Selected payment method (cash/cheque/bank_transfer)
  const [referenceNumber, setReferenceNumber] = useState(""); // Reference number for non-cash payments
  const [notes, setNotes] = useState(""); // Optional notes for the payment
  const [selectedOrder, setSelectedOrder] = useState(""); // Selected order ID for payment
  const [selectedOrderObj, setSelectedOrderObj] = useState<Order | null>(null); // Full order object for validation

  // Initialize component by loading all customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  // API function to fetch all customers from the backend
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

  // API function to fetch payment history for a specific customer
  const fetchCustomerPayments = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await getCustomerPayments(customerId);
      setPayments(response.payments || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      Alert.alert("Error", "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  // API function to fetch orders for a customer and filter out fully paid orders
  const fetchCustomerOrders = async (customerId: string) => {
    try {
      setLoadingOrders(true);
      const response = await getCustomerOrders(customerId);

      // Filter out orders that are already fully paid - only show pending/partial payments
      const pendingOrders = response.orders.filter(
        (order: Order) => order.payment_status !== "paid"
      );

      // Calculate remaining amount for each order by subtracting total payments from order total
      const ordersWithRemaining = pendingOrders.map((order: any) => {
        const totalPaid =
          order.payments?.reduce(
            (sum: number, payment: any) => sum + payment.amount,
            0
          ) || 0;

        return {
          ...order,
          remaining_amount: order.total_amount - totalPaid,
        };
      });

      setOrders(ordersWithRemaining || []);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      Alert.alert("Error", "Failed to load customer orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  // Handle customer selection from the list
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    // Load both payment history and pending orders for the selected customer
    fetchCustomerPayments(customer.id);
    fetchCustomerOrders(customer.id);
    // On mobile devices, open the payment modal after selection
    if (!isTablet) {
      setPaymentModalVisible(true);
    }
  };

  // Open the payment recording form and reset all form fields
  const openPaymentForm = () => {
    // Clear all form inputs to start fresh
    setAmount("");
    setReferenceNumber("");
    setNotes("");
    setSelectedOrder("");
    setSelectedOrderObj(null);
    setPaymentMethod("cash"); // Default to cash payment

    setPaymentFormVisible(true);
  };

  // Handle order selection in the payment form dropdown
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order.order_id);
    setSelectedOrderObj(order);
    // Pre-fill the amount with the remaining balance for convenience
    setAmount(order.remaining_amount?.toString() || "");
    setOrderDropdownVisible(false);
  };

  // Validate and process payment recording with amount checking
  const handleRecordPayment = async () => {
    // Validation: Ensure an order is selected
    if (!selectedOrder) {
      Alert.alert("Error", "Please select an order");
      return;
    }

    // Validation: Ensure amount is valid and greater than zero
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Warning: Check if payment amount exceeds the remaining balance
    if (
      selectedOrderObj &&
      parseFloat(amount) > (selectedOrderObj.remaining_amount || 0)
    ) {
      Alert.alert(
        "Payment Amount Exceeds Balance",
        "The payment amount is greater than the remaining balance. Do you want to continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: submitPayment },
        ]
      );
      return;
    }

    // If all validations pass, proceed with payment submission
    submitPayment();
  };
  // Submit the payment data to the backend API
  const submitPayment = async () => {
    try {
      setRecordingPayment(true);

      // Prepare payment data object for API submission
      const paymentData = {
        order_id: selectedOrder,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
        received_by: user?.id, // Track which user recorded the payment
      };

      // Submit payment to backend
      await recordPayment(paymentData);

      // Reset form after successful submission
      setAmount("");
      setReferenceNumber("");
      setNotes("");
      setSelectedOrder("");
      setSelectedOrderObj(null);
      setPaymentFormVisible(false);

      // Refresh data to show the new payment in the lists
      if (selectedCustomer) {
        fetchCustomerPayments(selectedCustomer.id);
        fetchCustomerOrders(selectedCustomer.id);
      }

      Alert.alert("Success", "Payment recorded successfully");
    } catch (error) {
      console.error("Error recording payment:", error);
      Alert.alert("Error", "Failed to record payment. Please try again.");
    } finally {
      setRecordingPayment(false);
    }
  };

  // Handle search input changes for customer filtering
  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  // Filter customers based on search text (case-insensitive name matching)
  const filteredCustomers = searchText
    ? customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : customers;

  // Utility function to format dates in a readable format
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

  // Function to return appropriate icon based on payment method
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

  // Render function for individual customer items in the FlatList
  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[
        styles.customerItem,
        // Highlight selected customer with different styling
        selectedCustomer?.id === item.id && styles.selectedCustomer,
      ]}
      onPress={() => handleSelectCustomer(item)}
    >
      {/* Customer icon container with store icon */}
      <View style={styles.customerIconContainer}>
        <FontAwesome5 name="store" size={16} color={COLORS.light} />
      </View>
      {/* Customer information display */}
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
      </View>
      {/* Chevron icon to indicate selectable item */}
      <MaterialIcons name="chevron-right" size={24} color="#ADB5BD" />
    </TouchableOpacity>
  );

  // Render function for individual order items in the dropdown (currently unused but may be needed for future features)
  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => handleSelectOrder(item)}
    >
      {/* Order information section */}
      <View style={styles.orderInfo}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>{item.order_id}</Text>
          {/* Status indicator dot with color based on payment status */}
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  item.payment_status === "paid"
                    ? "#4CAF50" // Green for paid
                    : item.payment_status === "partial"
                    ? "#FFC107" // Yellow for partial
                    : "#F44336", // Red for pending
              },
            ]}
          />
        </View>
        <Text style={styles.orderDate}>{formatDate(item.order_date)}</Text>
      </View>

      {/* Order amount information */}
      <View style={styles.orderAmount}>
        <Text style={styles.totalAmount}>
          {formatAmount(item.total_amount)}
        </Text>
        <Text style={styles.remainingAmount}>
          Remaining: {formatAmount(item.remaining_amount || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render function for individual payment history items in the FlatList
  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={styles.paymentItem}>
      {/* Payment header section with main payment info */}
      <View style={styles.paymentHeader}>
        {/* Payment method icon container */}
        <View style={styles.paymentIconContainer}>
          {getPaymentMethodIcon(item.payment_method)}
        </View>
        {/* Payment amount and order information */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentAmount}>{formatAmount(item.amount)}</Text>
          <Text style={styles.paymentOrderId}>Order: {item.order_id}</Text>
        </View>
        {/* Payment date display */}
        <View style={styles.paymentDate}>
          <Text style={styles.paymentDateText}>
            {formatDate(item.payment_date)}
          </Text>
        </View>
      </View>
      {/* Payment details section with additional information */}
      <View style={styles.paymentDetails}>
        {/* Payment method display */}
        <View style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Payment Method:</Text>
          <Text style={styles.paymentDetailValue}>
            {item.payment_method.charAt(0).toUpperCase() +
              item.payment_method.slice(1).replace("_", " ")}
          </Text>
        </View>
        {/* Reference number display (if available) */}
        {item.reference_number && (
          <View style={styles.paymentDetailRow}>
            <Text style={styles.paymentDetailLabel}>Reference:</Text>
            <Text style={styles.paymentDetailValue}>
              {item.reference_number}
            </Text>
          </View>
        )}
        {/* Staff member who received the payment (if available) */}
        {item.received_by_name && (
          <View style={styles.paymentDetailRow}>
            <Text style={styles.paymentDetailLabel}>Received By:</Text>
            <Text style={styles.paymentDetailValue}>
              {item.received_by_name}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // Main Customer Selection View
  const CustomerSelectionView = () => (
    <View style={styles.fullWidthContainer}>
      {/* Section title */}
      <Text style={styles.sectionTitle}>Select Customer</Text>

      {/* Search input container with search icon and clear button */}
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
          onChangeText={handleSearch}
        />
        {/* Clear search button - only shown when there's search text */}
        {searchText !== "" && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Feather name="x" size={20} color="#ADB5BD" />
          </TouchableOpacity>
        )}
      </View>

      {/* Customer list or loading indicator */}
      {loading ? (
        // Loading state with spinner and text
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      ) : (
        // Customer list with FlatList component
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item.id}
          style={styles.customerList}
          contentContainerStyle={styles.customerListContent}
          showsVerticalScrollIndicator={false}
          // Empty state component when no customers found
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <FontAwesome5 name="users-slash" size={50} color="#ADB5BD" />
              <Text style={styles.emptyListText}>No customers found</Text>
            </View>
          }
        />
      )}
    </View>
  );

  // Payment Form Modal
  const PaymentFormModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={paymentFormVisible}
      onRequestClose={() => setPaymentFormVisible(false)}
    >
      {/* Modal overlay container with dark background */}
      <View style={styles.centeredModalContainer}>
        {/* Modal content container */}
        <View style={styles.centeredModalContent}>
          {/* Modal header with title and close button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record New Payment</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPaymentFormVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          {/* Scrollable form content */}
          <ScrollView style={styles.formScrollView}>
            <View style={styles.paymentForm}>
              {/* Order Selection Dropdown */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Select Order <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                {/* Dropdown button to show/hide order list */}
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setOrderDropdownVisible(!orderDropdownVisible)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedOrder
                      ? `${selectedOrder} - ${formatAmount(
                          selectedOrderObj?.remaining_amount || 0
                        )}`
                      : "Select an order"}
                  </Text>
                  <MaterialIcons
                    name={
                      orderDropdownVisible ? "arrow-drop-up" : "arrow-drop-down"
                    }
                    size={24}
                    color="#6c757d"
                  />
                </TouchableOpacity>

                {/* Order dropdown menu - shown when orderDropdownVisible is true */}
                {orderDropdownVisible && (
                  <View style={styles.dropdownMenu}>
                    {loadingOrders ? (
                      // Loading state for orders
                      <View style={styles.dropdownLoadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                        />
                        <Text style={styles.dropdownLoadingText}>
                          Loading orders...
                        </Text>
                      </View>
                    ) : (
                      // Scrollable list of orders
                      <ScrollView
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                      >
                        {orders.length > 0 ? (
                          // Map through orders and create selectable items
                          orders.map((order) => (
                            <TouchableOpacity
                              key={order.order_id}
                              style={styles.orderItem}
                              onPress={() => handleSelectOrder(order)}
                            >
                              {/* Order information display */}
                              <View style={styles.orderInfo}>
                                <View style={styles.orderIdContainer}>
                                  <Text style={styles.orderId}>
                                    {order.order_id}
                                  </Text>
                                  {/* Payment status indicator */}
                                  <View
                                    style={[
                                      styles.statusDot,
                                      {
                                        backgroundColor:
                                          order.payment_status === "paid"
                                            ? "#4CAF50"
                                            : order.payment_status === "partial"
                                            ? "#FFC107"
                                            : "#F44336",
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.orderDate}>
                                  {formatDate(order.order_date)}
                                </Text>
                              </View>
                              {/* Order amount information */}
                              <View style={styles.orderAmount}>
                                <Text style={styles.totalAmount}>
                                  {formatAmount(order.total_amount)}
                                </Text>
                                <Text style={styles.remainingAmount}>
                                  Remaining:
                                  {formatAmount(order.remaining_amount || 0)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          // Empty state when no orders found
                          <View style={styles.noOrdersContainer}>
                            <Text style={styles.noOrdersText}>
                              No pending orders found
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>

              {/* Payment Amount Input */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Amount <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="attach-money"
                    size={20}
                    color="#ADB5BD"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Payment Method Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Payment Method <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.paymentMethodContainer}>
                  {/* Cash payment option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === "cash" && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod("cash")}
                  >
                    <MaterialIcons
                      name="attach-money"
                      size={20}
                      color={
                        paymentMethod === "cash" ? COLORS.light : COLORS.dark
                      }
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === "cash" &&
                          styles.paymentMethodTextSelected,
                      ]}
                    >
                      Cash
                    </Text>
                  </TouchableOpacity>

                  {/* Cheque payment option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === "cheque" &&
                        styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod("cheque")}
                  >
                    <FontAwesome5
                      name="money-check"
                      size={16}
                      color={
                        paymentMethod === "cheque" ? COLORS.light : COLORS.dark
                      }
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === "cheque" &&
                          styles.paymentMethodTextSelected,
                      ]}
                    >
                      Cheque
                    </Text>
                  </TouchableOpacity>

                  {/* Bank transfer payment option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === "bank_transfer" &&
                        styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod("bank_transfer")}
                  >
                    <MaterialCommunityIcons
                      name="bank-transfer"
                      size={20}
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
                          styles.paymentMethodTextSelected,
                      ]}
                    >
                      Bank
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reference Number Input */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Reference Number
                  {/* Make reference number required for cheque payments */}
                  {paymentMethod === "cheque" && (
                    <Text style={styles.requiredAsterisk}>*</Text>
                  )}
                </Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="hash"
                    size={20}
                    color="#ADB5BD"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={
                      paymentMethod === "cheque"
                        ? "Enter cheque number"
                        : "Enter reference number (optional)"
                    }
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                  />
                </View>
              </View>

              {/* Notes Input - Optional field */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <View
                  style={[
                    styles.inputContainer,
                    { height: 80, alignItems: "flex-start" },
                  ]}
                >
                  <Feather
                    name="file-text"
                    size={20}
                    color="#ADB5BD"
                    style={[styles.inputIcon, { marginTop: 12 }]}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        height: 80,
                        textAlignVertical: "top",
                        paddingTop: 12,
                      },
                    ]}
                    placeholder="Enter notes (optional)"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Form Action Buttons */}
              <View style={styles.formActions}>
                {/* Cancel button */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPaymentFormVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {/* Submit button with loading state */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleRecordPayment}
                  disabled={recordingPayment}
                >
                  {recordingPayment ? (
                    <ActivityIndicator size="small" color={COLORS.light} />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>
                        Record Payment
                      </Text>
                      <MaterialIcons
                        name="check"
                        size={18}
                        color={COLORS.light}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Payment History Modal Component - for mobile devices only
  const PaymentHistoryModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={paymentModalVisible && !isTablet}
      onRequestClose={() => setPaymentModalVisible(false)}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Modal header with back button and customer name */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setPaymentModalVisible(false)}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedCustomer?.name} - Payments
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Payment history content */}
        <View style={styles.fullWidthContainer}>
          {/* Section header with record payment button */}
          <View style={styles.paymentsSectionHeader}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {/* Show record payment button only if user has permission */}
            {hasPermission("manage_customer_payments") && (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={openPaymentForm}
              >
                <MaterialIcons name="add" size={18} color={COLORS.light} />
                <Text style={styles.recordButtonText}>Record Payment</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Payment list or loading state */}
          {loading ? (
            // Loading indicator
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading payment history...</Text>
            </View>
          ) : (
            // Payment history list
            <FlatList
              data={payments}
              renderItem={renderPaymentItem}
              keyExtractor={(item) => item.payment_id}
              style={styles.paymentsList}
              contentContainerStyle={styles.paymentsListContent}
              showsVerticalScrollIndicator={false}
              // Empty state when no payments found
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <MaterialCommunityIcons
                    name="cash-remove"
                    size={50}
                    color="#ADB5BD"
                  />
                  <Text style={styles.emptyListText}>
                    No payment history found
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Tablet Layout - FIXED by removing spaces between JSX elements
  const TabletLayout = () => {
    // Return null if not tablet to prevent rendering
    if (!isTablet) return null;

    return (
      <View style={styles.container}>
        {/* Left side: Customer Selection Section */}
        <View style={styles.selectionSection}>
          <CustomerSelectionView />
        </View>

        {/* Right side: Payment History Section - only shown when customer is selected */}
        {selectedCustomer && (
          <View style={styles.paymentsSection}>
            {/* Section header with customer name and record payment button */}
            <View style={styles.paymentsSectionHeader}>
              <Text style={styles.sectionTitle}>
                Payment History - {selectedCustomer.name}
              </Text>
              {/* Show record payment button only if user has permission */}
              {hasPermission("manage_customer_payments") && (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={openPaymentForm}
                >
                  <MaterialIcons name="add" size={18} color={COLORS.light} />
                  <Text style={styles.recordButtonText}>Record Payment</Text>
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  Loading payment history...
                </Text>
              </View>
            ) : (
              <FlatList
                data={payments}
                renderItem={renderPaymentItem}
                keyExtractor={(item) => item.payment_id}
                style={styles.paymentsList}
                contentContainerStyle={styles.paymentsListContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyListContainer}>
                    <MaterialCommunityIcons
                      name="cash-remove"
                      size={50}
                      color="#ADB5BD"
                    />
                    <Text style={styles.emptyListText}>
                      No payment history found
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </View>
    );
  };

  // Main component return - renders the entire customer payments screen
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar configuration */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Main Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Responsive Layout - different layout for tablet vs mobile */}
      {isTablet ? (
        // Tablet: Side-by-side layout with customer list and payment history
        <TabletLayout />
      ) : (
        // Mobile: Full-width customer selection only
        <View style={styles.fullWidthContainer}>
          <CustomerSelectionView />
        </View>
      )}

      {/* Mobile-only Payment History Modal */}
      <PaymentHistoryModal />

      {/* Payment Form Modal - shown on both tablet and mobile */}
      <PaymentFormModal />

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* Home navigation item */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)")}
        >
          <AntDesign name="home" size={22} color={COLORS.dark} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        {/* Customers navigation item - highlighted as current section */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(customers)")}
        >
          <FontAwesome5 name="users" size={20} color={COLORS.primary} />
          <Text style={[styles.navLabel, { color: COLORS.primary }]}>
            Customers
          </Text>
        </TouchableOpacity>

        {/* Profile navigation item */}
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

// StyleSheet object containing all styles for the customer payments screen
// Organized by component/section for better maintainability
const styles = StyleSheet.create({
  // Main container styles
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background
  },

  // Header styles - top navigation bar
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
    // Dynamic padding for Android status bar
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 40 : 12,
  },

  // Header button styles
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header title text
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Layout container styles
  container: {
    flex: 1,
    flexDirection: "row", // Side-by-side layout for tablet
  },

  fullWidthContainer: {
    flex: 1,
    padding: 16,
  },

  // Tablet layout section styles
  selectionSection: {
    width: "40%", // Left side for customer selection
    borderRightWidth: 1,
    borderRightColor: "#F1F3F5",
    padding: 16,
  },

  paymentsSection: {
    flex: 1, // Right side for payment history
    padding: 16,
  },

  // Section header styles
  paymentsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 12,
    borderLeftWidth: 3, // Accent border
    borderLeftColor: COLORS.primary,
    paddingLeft: 8,
  },

  // Search container styles  // Search container and input styles
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

  // Customer list styles  // Customer list styles
  customerList: {
    flex: 1,
  },
  customerListContent: {
    paddingBottom: 16,
  },
  // Individual customer item styles
  customerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  // Selected customer highlight
  selectedCustomer: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(125, 164, 83, 0.05)",
  },
  // Customer icon container
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
  },

  // Order item styles (for dropdown selection)  // Order item styles for dropdown
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  orderInfo: {
    flex: 1,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  // Status indicator dot
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  orderDate: {
    fontSize: 12,
    color: "#6c757d",
  },
  orderAmount: {
    alignItems: "flex-end",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  remainingAmount: {
    fontSize: 12,
    color: "#F44336", // Red color for unpaid amount
    fontWeight: "500",
  },
  // Empty states
  noOrdersContainer: {
    padding: 16,
    alignItems: "center",
  },
  noOrdersText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },

  // Payment history list styles
  paymentsList: {
    flex: 1,
  },

  paymentsListContent: {
    paddingBottom: 16,
  },

  paymentItem: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F3F5",
    overflow: "hidden",
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },

  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  paymentInfo: {
    flex: 1,
  },

  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },

  paymentOrderId: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
  },

  paymentDate: {
    alignItems: "flex-end",
  },

  paymentDateText: {
    fontSize: 12,
    color: "#6c757d",
  },

  paymentDetails: {
    padding: 12,
    backgroundColor: "#F8F9FA",
  },

  paymentDetailRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  paymentDetailLabel: {
    width: "40%",
    fontSize: 13,
    color: "#6c757d",
    fontWeight: "500",
  },

  paymentDetailValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.dark,
  },

  // Loading and empty state styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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

  // Record button styles (for adding new payments)
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  recordButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },

  // Modal styles
  centeredModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 16,
  },

  centeredModalContent: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    width: isTablet ? "60%" : "100%",
    maxHeight: "80%",
    maxWidth: 500,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: COLORS.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: "90%",
    minHeight: "50%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
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

  formScrollView: {
    maxHeight: 500,
  },

  paymentForm: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  formGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },

  requiredAsterisk: {
    color: "#FF6B6B",
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
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: COLORS.dark,
  },

  dropdownButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },

  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },

  dropdownMenu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxHeight: 250,
  },

  dropdownLoadingContainer: {
    padding: 16,
    alignItems: "center",
  },

  dropdownLoadingText: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 8,
  },

  paymentMethodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  paymentMethodOption: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },

  paymentMethodSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  paymentMethodText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginLeft: 6,
  },

  paymentMethodTextSelected: {
    color: COLORS.light,
  },

  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.light,
    marginRight: 6,
  },

  // Bottom navigation bar styles  // Bottom navigation bar styles
  bottomNav: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingVertical: 10,
    justifyContent: "space-around",
  },
  // Individual navigation item
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    width: "33%",
  },
  // Navigation label text
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.dark,
    fontWeight: "500",
  },
});
