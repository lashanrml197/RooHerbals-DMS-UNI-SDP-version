import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
// Import custom context and services for authentication and API calls.
import { useAuth } from "../context/AuthContext";
import { getCustomerOrders, recordPayment } from "../services/api";
import { COLORS } from "../theme/colors";

// Define the TypeScript interface for a Payment object.
interface Payment {
  payment_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
}

// Define the TypeScript interface for an Order object.
interface Order {
  order_id: string;
  order_date: string;
  total_amount: number;
  payment_status: "pending" | "partial" | "paid";
  payment_type: string;
  remaining_amount?: number;
  payments?: Payment[];
}

// Define the TypeScript interface for Customer details.
interface CustomerDetails {
  customer_id: string;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
}

// This is the main component for the Record Payment screen.
export default function RecordPaymentScreen() {
  // Get navigation parameters using Expo Router's useLocalSearchParams hook.
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;
  const preSelectedOrderId = params.orderId as string;
  // Get user authentication status and details from the AuthContext.
  const { hasPermission, user } = useAuth();

  // State variables to manage loading, submission status, orders, and customer data.
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);

  // Helper function to correctly calculate the remaining amount for an order.
  const calculateRemainingAmount = useCallback((order: Order): number => {
    if (!order) return 0;

    // Calculate the total amount paid by summing up all payments for the order.
    const totalPaid =
      order.payments?.reduce(
        (sum: number, payment: Payment) => sum + payment.amount,
        0
      ) || 0;

    // Return the actual remaining amount by subtracting the total paid from the order's total amount.
    return order.total_amount - totalPaid;
  }, []);

  // Check for permission and redirect if not authorized
  useEffect(() => {
    if (!hasPermission("manage_customer_payments")) {
      Alert.alert(
        "Unauthorized Access",
        "You don't have permission to record payments",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // State variables for the payment form fields.
  const [selectedOrder, setSelectedOrder] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // State for managing the visibility of the order selection dropdown.
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  // Fetches the list of orders for the given customer.
  const fetchCustomerOrders = useCallback(async () => {
    if (!customerId) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      const response = await getCustomerOrders(customerId);

      // Filter out orders that are already fully paid.
      const pendingOrders = response.orders.filter(
        (order: Order) => order.payment_status !== "paid"
      );
      // Calculate the remaining amount for each pending order.
      const ordersWithRemaining = pendingOrders.map((order: any) => {
        // Calculate the correct remaining amount for all orders, regardless of
        // what the server returned. This ensures we always show accurate remaining amounts.
        const totalPaid =
          order.payments?.reduce(
            (sum: number, payment: any) =>
              sum + parseFloat(payment.amount.toString()),
            0
          ) || 0;

        return {
          ...order,
          remaining_amount: order.total_amount - totalPaid,
        };
      });

      setOrders(ordersWithRemaining || []);
      setCustomer(response.customer || null); // If there's only one order, select it automatically
      if (ordersWithRemaining.length === 1 && !preSelectedOrderId) {
        setSelectedOrder(ordersWithRemaining[0].order_id);
        // Use the calculated remaining amount instead of the property
        const actualRemainingAmount = calculateRemainingAmount(
          ordersWithRemaining[0]
        );
        setAmount(actualRemainingAmount.toString());
      }
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      Alert.alert("Error", "Failed to load customer orders");
    } finally {
      setLoading(false);
    }
  }, [customerId, preSelectedOrderId, calculateRemainingAmount]);

  // useEffect hook to fetch customer orders when the component mounts.
  useEffect(() => {
    fetchCustomerOrders();
  }, [fetchCustomerOrders]);
  // useEffect hook to pre-select an order if an orderId is passed as a parameter.
  useEffect(() => {
    // Pre-select order if provided in params
    if (preSelectedOrderId && orders.length > 0) {
      setSelectedOrder(preSelectedOrderId);
      const order = orders.find((o) => o.order_id === preSelectedOrderId);
      if (order) {
        const actualRemainingAmount = calculateRemainingAmount(order);
        setAmount(actualRemainingAmount.toString());
      }
    }
  }, [preSelectedOrderId, orders, calculateRemainingAmount]);
  // Handles the submission of the payment form.
  const handleRecordPayment = async () => {
    // Validate form fields before submitting.
    if (!selectedOrder) {
      Alert.alert("Error", "Please select an order");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const selectedOrderObj = orders.find((o) => o.order_id === selectedOrder);
    if (!selectedOrderObj) {
      Alert.alert("Error", "Invalid order selected");
      return;
    } // Calculate actual remaining amount to compare against
    const actualRemainingAmount = calculateRemainingAmount(selectedOrderObj);
    // Warn the user if the payment amount exceeds the remaining balance.
    if (parseFloat(amount) > actualRemainingAmount) {
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

    submitPayment();
  };

  // Submits the payment data to the server.
  const submitPayment = async () => {
    try {
      setSubmitting(true);

      const paymentData = {
        order_id: selectedOrder,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
        received_by: user?.id, // Explicitly include the user ID
      };

      console.log("Submitting payment data:", paymentData);

      try {
        const response = await recordPayment(paymentData);

        console.log("Payment response:", response);

        Alert.alert("Success", "Payment recorded successfully", [
          {
            text: "OK",
            onPress: () => {
              // Go back to the previous screen or to payment history.
              router.back();
            },
          },
        ]);
      } catch (error) {
        console.error("Error from recordPayment:", error);
        let errorMessage = "Failed to record payment. Please try again.";

        if (error instanceof Error) {
          errorMessage = `Error: ${error.message}`;
        }

        Alert.alert("Payment Error", errorMessage);
      }
    } catch (error) {
      console.error("Error in submitPayment function:", error);
      Alert.alert(
        "Error",
        "An unexpected error occurred while processing the payment"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Formats a date string into a more readable format.
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Formats a number into a currency string.
  const formatAmount = (amount: number) => {
    return `Rs. ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Returns a color based on the order's payment status.
  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#4CAF50";
      case "partial":
        return "#FFC107";
      case "pending":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  // Renders the text for the selected order in the dropdown.
  const renderSelectedOrder = () => {
    if (!selectedOrder) return "Select an order";

    const order: Order | undefined = orders.find(
      (o: Order) => o.order_id === selectedOrder
    );
    if (!order) return "Order not found";

    // Use the calculated remaining amount for display.
    const actualRemainingAmount =
      typeof calculateRemainingAmount === "function"
        ? calculateRemainingAmount(order)
        : 0;
    return `${order.order_id} - ${formatAmount(actualRemainingAmount)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header section with a back button and title. */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Shows a loading indicator while fetching data. */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading customer orders...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent} // Added for bottom padding
          >
            {/* Displays customer information card. */}
            <View style={styles.customerInfoCard}>
              <View style={styles.customerIcon}>
                <FontAwesome5 name="store" size={20} color={COLORS.light} />
              </View>

              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>
                  {customer?.name || "Customer"}
                </Text>
                <Text style={styles.customerAddress}>
                  {customer?.address || ""}
                </Text>
              </View>
            </View>

            {/* Displays who is recording the payment. */}
            <View style={styles.recorderInfoCard}>
              <View style={styles.recorderIcon}>
                <FontAwesome5
                  name="user-check"
                  size={16}
                  color={COLORS.light}
                />
              </View>
              <View style={styles.recorderDetails}>
                <Text style={styles.recorderLabel}>
                  Payment being recorded by:
                </Text>
                <Text style={styles.recorderName}>
                  {user?.fullName || "Unknown User"}
                </Text>
              </View>
            </View>

            {/* Displays the current user's information. */}
            <View style={styles.userInfoCard}>
              <View style={styles.userIcon}>
                <FontAwesome5 name="user" size={20} color={COLORS.light} />
              </View>

              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user?.fullName || "User"}</Text>
                <Text style={styles.userEmail}>{user?.email || ""}</Text>
              </View>
            </View>

            {/* Form container for payment details. */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Payment Details</Text>

              {/* Order selection dropdown. */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Select Order <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowOrderDropdown(!showOrderDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {renderSelectedOrder()}
                  </Text>
                  <MaterialIcons
                    name={
                      showOrderDropdown ? "arrow-drop-up" : "arrow-drop-down"
                    }
                    size={24}
                    color="#6c757d"
                  />
                </TouchableOpacity>

                {showOrderDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView
                      style={{ maxHeight: 200 }}
                      nestedScrollEnabled={true}
                    >
                      {orders.length > 0 ? (
                        orders.map((order) => (
                          <TouchableOpacity
                            key={order.order_id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedOrder(order.order_id);
                              // Calculate correct remaining amount instead of using potentially incorrect value.
                              const totalPaid =
                                order.payments?.reduce(
                                  (sum, payment) =>
                                    sum + parseFloat(payment.amount.toString()),
                                  0
                                ) || 0;
                              const actualRemainingAmount =
                                order.total_amount - totalPaid;
                              setAmount(actualRemainingAmount.toString());
                              setShowOrderDropdown(false);
                            }}
                          >
                            <View style={styles.orderInfo}>
                              <View style={styles.orderIdContainer}>
                                <Text style={styles.orderId}>
                                  {order.order_id}
                                </Text>
                                <View
                                  style={[
                                    styles.statusDot,
                                    {
                                      backgroundColor: getOrderStatusColor(
                                        order.payment_status
                                      ),
                                    },
                                  ]}
                                />
                              </View>

                              <Text style={styles.orderDate}>
                                {formatDate(order.order_date)}
                              </Text>
                            </View>

                            <View style={styles.orderAmount}>
                              <Text style={styles.totalAmount}>
                                {formatAmount(order.total_amount)}
                              </Text>
                              <Text style={styles.remainingAmount}>
                                Remaining:
                                {formatAmount(calculateRemainingAmount(order))}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.noOrdersContainer}>
                          <Text style={styles.noOrdersText}>
                            No pending orders found
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Amount input field. */}
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

              {/* Payment method selection. */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Payment Method <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.paymentMethodContainer}>
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

              {/* Reference number input, shown for cheque or bank transfer. */}
              {(paymentMethod === "cheque" ||
                paymentMethod === "bank_transfer") && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>
                    Reference Number
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
              )}

              {/* Notes input field. */}
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
            </View>

            {/* Submit button to record the payment. */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRecordPayment}
              disabled={submitting || orders.length === 0}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.light} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Record Payment</Text>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={COLORS.light}
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Bottom spacer to ensure content isn't hidden by the navigation bar. */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
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
  container: {
    flex: 1,
    padding: 16,
  },
  // New style for the ScrollView content
  scrollContent: {
    paddingBottom: 100, // Generous bottom padding to clear the navigation bar
  },
  // New style for bottom spacer
  bottomSpacer: {
    height: 120, // Make this taller than your navigation bar to ensure content isn't hidden
  },
  customerInfoCard: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 13,
    color: "#6c757d",
  },
  recorderInfoCard: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recorderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recorderDetails: {
    flex: 1,
  },
  recorderLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  recorderName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  userInfoCard: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: "#6c757d",
  },
  formContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 8,
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
    elevation: 3,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    backgroundColor: "#FFF",
  },
  orderInfo: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
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
    marginRight: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  remainingAmount: {
    fontSize: 12,
    color: "#6c757d",
  },
  noOrdersContainer: {
    padding: 16,
    alignItems: "center",
  },
  noOrdersText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
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
    fontSize: 15,
    color: COLORS.dark,
  },
  paymentMethodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentMethodOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    marginRight: 8,
    paddingHorizontal: 12,
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
  submitButton: {
    flexDirection: "row",
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.light,
  },
});
