// Import required components and libraries at the top
import {
  AntDesign,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import PermissionGate from "../components/PermissionGate"; // Import PermissionGate component
import { useAuth } from "../context/AuthContext"; // Import useAuth hook
import { getAllDrivers, getAllVehicles } from "../services/driverApi";
import {
  assignDelivery,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
} from "../services/orderApi";
import { COLORS } from "../theme/colors";

// Define TypeScript interfaces
interface OrderItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  image_url: string | null;
  expiry_date: string | null;
  manufacturing_date: string | null;
}

interface DeliveryInfo {
  delivery_id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_name: string;
  registration_number: string;
  scheduled_date: string;
  delivery_date: string | null;
  status: string;
  notes: string | null;
}

interface Payment {
  payment_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  received_by: string | null;
  received_by_name: string | null;
  notes: string | null;
}

interface ReturnItem {
  return_item_id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason: string;
}

interface ReturnInfo {
  return_id: string;
  return_date: string;
  processed_by: string;
  processed_by_name: string;
  reason: string;
  total_amount: number;
  status: string;
  items: ReturnItem[];
}

interface Driver {
  user_id: string;
  full_name: string;
}

interface Vehicle {
  vehicle_id: string;
  name: string;
  registration_number: string;
  status: "available" | "on_route" | "maintenance";
}

interface OrderDetails {
  order_id: string;
  customer_id: string;
  customer_name: string;
  contact_person: string;
  phone: string;
  address: string;
  sales_rep_id: string;
  sales_rep_name: string;
  order_date: string;
  delivery_date: string | null;
  payment_type: string;
  payment_status: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number | null;
  notes: string | null;
  status: string;
  items: OrderItem[];
  delivery: DeliveryInfo | null;
  payments: Payment[];
  return: ReturnInfo | null;
}

// Debug function to check authentication token
const checkAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    console.log("Auth token:", token ? "Token exists" : "No token found");
    return token;
  } catch (err) {
    console.error("Error checking auth token:", err);
    return null;
  }
};

export default function OrderDetailsScreen() {
  // Log component render
  console.log("OrderDetailsScreen rendering");

  // Get auth context for permissions
  const { user, hasPermission } = useAuth();

  // Get the order ID from the route params
  const { id } = useLocalSearchParams();
  const orderId = Array.isArray(id) ? id[0] : id;
  console.log("Order ID from params:", orderId);

  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [activeTab, setActiveTab] = useState<string>("items");
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Delivery scheduling modal state variables
  const [isScheduleDeliveryModalVisible, setIsScheduleDeliveryModalVisible] =
    useState<boolean>(false);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");

  // Drivers and vehicles state variables
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);

  // Scroll position for modal
  const [modalScrollViewHeight, setModalScrollViewHeight] = useState<number>(0);

  // Check auth token when component mounts
  useEffect(() => {
    checkAuthToken();
  }, []);

  // Simple test alert to verify Alert is working
  useEffect(() => {
    // Uncomment to test if Alert is working
    // Alert.alert("Test Alert", "This is a test alert. Click OK to continue.");
    console.log("Component mounted");
  }, []);

  const fetchDriversAndVehicles = async () => {
    try {
      setLoadingDrivers(true);
      setLoadingVehicles(true);

      // Fetch drivers
      const driversData = await getAllDrivers();
      console.log("Drivers fetched:", driversData?.length || 0);
      setDrivers(Array.isArray(driversData) ? driversData : []);

      // Fetch vehicles
      const vehiclesData = await getAllVehicles();
      console.log("Vehicles fetched:", vehiclesData?.length || 0);

      // Filter only available vehicles
      const availableVehicles = Array.isArray(vehiclesData)
        ? vehiclesData.filter(
            (vehicle: Vehicle) => vehicle.status === "available"
          )
        : [];

      console.log("Available vehicles:", availableVehicles.length);
      setVehicles(availableVehicles);
    } catch (err) {
      console.error("Failed to fetch drivers and vehicles:", err);
      Alert.alert(
        "Error",
        "Failed to load drivers and vehicles. Please try again."
      );
      // Set empty arrays to prevent undefined errors
      setDrivers([]);
      setVehicles([]);
    } finally {
      setLoadingDrivers(false);
      setLoadingVehicles(false);
    }
  };

  // Handle delivery assignment
  const handleAssignDelivery = async () => {
    try {
      if (!selectedDriver) {
        Alert.alert("Error", "Please select a driver");
        return;
      }

      if (!selectedVehicle) {
        Alert.alert("Error", "Please select a vehicle");
        return;
      }

      if (!scheduledDate) {
        Alert.alert("Error", "Please select a delivery date");
        return;
      }

      setProcessingAction(true);

      // Get driver and vehicle details from selected IDs
      const selectedDriverObj = drivers.find(
        (d) => d.user_id === selectedDriver
      );
      const selectedVehicleObj = vehicles.find(
        (v) => v.vehicle_id === selectedVehicle
      );

      if (!selectedDriverObj || !selectedVehicleObj) {
        Alert.alert("Error", "Invalid driver or vehicle selection");
        setProcessingAction(false);
        return;
      }

      // Prepare delivery data
      const deliveryData = {
        driver_id: selectedDriver,
        vehicle_id: selectedVehicle,
        scheduled_date: scheduledDate,
        notes: deliveryNotes || "",
      };

      if (!order) {
        Alert.alert("Error", "Order not found");
        setProcessingAction(false);
        return;
      }

      // Call API to assign delivery
      const result = await assignDelivery(order.order_id, deliveryData);
      console.log("Delivery assignment successful:", result);

      // If order was pending, update it to processing status
      let newStatus = order.status;
      if (order.status === "pending") {
        // Update order status to processing via API
        try {
          await updateOrderStatus(order.order_id, "processing");
          newStatus = "processing";
        } catch (statusErr) {
          console.error("Failed to update order status:", statusErr);
          // Continue with delivery assignment even if status update fails
        }
      }

      // Update local order state with new delivery info
      setOrder({
        ...order,
        delivery: {
          delivery_id: (result as any).id || (result as any).delivery_id, // Type assertion to avoid TypeScript error
          driver_id: selectedDriver,
          driver_name: selectedDriverObj.full_name,
          vehicle_id: selectedVehicle,
          vehicle_name: selectedVehicleObj.name,
          registration_number: selectedVehicleObj.registration_number,
          scheduled_date: scheduledDate,
          delivery_date: null,
          status: "scheduled",
          notes: deliveryNotes || null,
        },
        status: newStatus, // Set to the updated status (processing or keep current)
      });

      // Close modal and reset form
      setIsScheduleDeliveryModalVisible(false);
      setSelectedDriver("");
      setSelectedVehicle("");
      setScheduledDate("");
      setDeliveryNotes("");

      // Show appropriate success message based on whether the order status was also updated
      if (order.status === "pending") {
        Alert.alert(
          "Success",
          "Order processed and delivery scheduled successfully"
        );
      } else {
        Alert.alert("Success", "Delivery scheduled successfully");
      }
    } catch (err) {
      console.error("Failed to assign delivery:", err);
      Alert.alert("Error", "Failed to schedule delivery. Please try again.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Fetch order details
  const fetchOrderDetails = useCallback(async (): Promise<void> => {
    try {
      console.log("Fetching order details...");
      setLoading(true);
      setError(null);

      console.log(`Fetching order details for ID: ${orderId}`);
      const data = await getOrderById(orderId);
      console.log("Order details received:", data);

      // Cast the API response to OrderDetails type
      setOrder(data as OrderDetails);
    } catch (err: any) {
      console.error("Failed to fetch order details:", err);
      setError(
        err.message || "Failed to load order details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Load data when component mounts
  useEffect(() => {
    fetchOrderDetails();
  }, [orderId, fetchOrderDetails]);

  // Log when order data changes
  useEffect(() => {
    console.log("Order state updated:", order ? order.status : "no order");
    if (order) {
      console.log("Will show Process button:", order.status === "pending");
      console.log(
        "Will show Cancel button:",
        order.status === "pending" || order.status === "processing"
      );
    }
  }, [order]);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not set";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format simple date (without time)
  const formatSimpleDate = (dateString: string | null): string => {
    if (!dateString) return "Not set";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return "Rs. 0.00";

    // Fix to prevent string concatenation when displaying currency
    // Use proper number formatting with commas for thousands
    return (
      "Rs. " +
      Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Get status color based on order status
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "#ffc107"; // Amber
      case "processing":
        return "#007bff"; // Blue
      case "delivered":
        return "#28a745"; // Green
      case "cancelled":
        return "#dc3545"; // Red
      default:
        return "#6c757d"; // Gray
    }
  };

  // Test function to verify button onPress is working
  const testButtonPress = () => {
    console.log("Test button pressed!");
    Alert.alert("Button Test", "Button press detected");
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string): Promise<void> => {
    console.log("handleStatusUpdate called with status:", newStatus);

    if (!order) {
      console.log("Error: order is null, returning early");
      return;
    }

    try {
      console.log("Setting processingAction to true");
      setProcessingAction(true);

      // Prepare confirmation message based on status
      let confirmMessage = `Are you sure you want to change the status to ${newStatus}?`;
      let additionalInfo = "";

      if (newStatus === "processing") {
        additionalInfo =
          "This will mark the order as being prepared for delivery.";
      } else if (newStatus === "delivered") {
        additionalInfo =
          "This will mark the order as delivered to the customer.";
      } else if (newStatus === "cancelled") {
        additionalInfo =
          "This will cancel the order and return inventory to stock.";
      }

      if (additionalInfo) {
        confirmMessage += `\n\n${additionalInfo}`;
      }

      console.log("Showing confirmation dialog");
      // Confirm status change
      Alert.alert("Update Order Status", confirmMessage, [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            console.log("User cancelled the status update");
            setProcessingAction(false); // Hides loading indicator if user cancels
          },
        },
        {
          text: "Update",
          onPress: async () => {
            console.log("User confirmed the status update");
            try {
              console.log(`Calling API to update status to ${newStatus}...`);

              // Check auth token before API call
              const token = await checkAuthToken();
              if (!token) {
                console.log("No auth token found for API call");
              }

              // Make the API call
              const result = await updateOrderStatus(order.order_id, newStatus);
              console.log(`API call successful, response:`, result);

              // Update local state
              console.log("Updating local state with new status");
              setOrder({
                ...order,
                status: newStatus,
              });

              Alert.alert(
                "Success",
                `Order status updated to ${newStatus} successfully`
              );
            } catch (err: any) {
              console.error("Failed to update order status:", err);
              console.error("Error details:", JSON.stringify(err));
              Alert.alert(
                "Error",
                err.message ||
                  "Failed to update order status. Please try again."
              );
            } finally {
              console.log("Setting processingAction to false");
              setProcessingAction(false);
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error("Error in handleStatusUpdate:", err);
      console.error("Error details:", JSON.stringify(err));
      Alert.alert(
        "Error",
        err.message || "Failed to update order status. Please try again."
      );
      setProcessingAction(false);
    }
  };

  // Handle payment status update
  const handlePaymentUpdate = () => {
    console.log("handlePaymentUpdate called");

    if (!order) {
      console.log("Error: order is null, returning early");
      return;
    }

    // Only show payment options if not already paid
    if (order.payment_status !== "paid") {
      Alert.alert("Update Payment", "Select new payment status:", [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("Payment update cancelled"),
        },
        {
          text: "Mark as Pending",
          onPress: () => updatePaymentStatusHandler("pending"),
        },
        {
          text: "Record Partial Payment",
          onPress: () => {
            console.log("Navigating to payment record screen");
            // Navigate to payment record screen with order info
            router.push({
              pathname: "/(customers)/record-payment",
              params: {
                orderId: order.order_id,
                customerId: order.customer_id,
                customerName: order.customer_name,
                totalAmount: order.total_amount,
                currentStatus: order.payment_status,
              },
            });
          },
        },
        {
          text: "Mark as Paid",
          onPress: () => updatePaymentStatusHandler("paid"),
        },
      ]);
    }
  };

  // Handle actual payment status update
  const updatePaymentStatusHandler = async (status: string) => {
    console.log("updatePaymentStatusHandler called with status:", status);

    if (!order) {
      console.log("Error: order is null, returning early");
      return;
    }

    try {
      console.log("Setting processingAction to true");
      setProcessingAction(true);

      // Prepare payment data
      const paymentData = {
        payment_status: status,
        amount: status === "paid" ? order.total_amount : 0,
        payment_method: "cash",
        notes: `Marked as ${status}`,
      };

      console.log("Payment data for API call:", paymentData);

      // Call API to update payment status
      console.log("Calling updatePaymentStatus API");
      const result = await updatePaymentStatus(order.order_id, paymentData);
      console.log("API call successful, response:", result);

      // Update local state
      console.log("Updating local state with new payment status");
      setOrder({
        ...order,
        payment_status: status,
      });

      Alert.alert(
        "Success",
        `Payment status updated to ${status} successfully`
      );
    } catch (err: any) {
      console.error("Failed to update payment status:", err);
      console.error("Error details:", JSON.stringify(err));
      Alert.alert("Error", err.message || "Failed to update payment status");
    } finally {
      console.log("Setting processingAction to false");
      setProcessingAction(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>
            {error || "Could not load order details"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchOrderDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Order #{order.order_id.replace(/^O/, "")}
        </Text>
        <TouchableOpacity onPress={fetchOrderDetails}>
          <Ionicons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Debug Button - Uncomment to test basic button functionality */}
        {/* <TouchableOpacity
          style={{
            backgroundColor: 'red',
            padding: 10,
            margin: 10,
            alignItems: 'center',
          }}
          onPress={testButtonPress}
        >
          <Text style={{ color: 'white' }}>TEST BUTTON</Text>
        </TouchableOpacity> */}

        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderTop}>
              <Text style={styles.orderDateText}>
                Ordered on {formatDate(order.order_date)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Action buttons for order status - show based on current status */}
            {!processingAction && (
              <View style={styles.statusActionsContainer}>
                {/* Pending order can be processed or cancelled - only by owner or sales_rep */}
                {order.status === "pending" && (
                  <>
                    {/* Only owner and sales_rep can process orders */}
                    <PermissionGate permission="add_order">
                      <TouchableOpacity
                        style={[
                          styles.statusActionButton,
                          { backgroundColor: "#007bff" },
                        ]}
                        onPress={() => {
                          console.log("Process button pressed");
                          // First fetch drivers and vehicles, then show the delivery scheduling modal
                          fetchDriversAndVehicles();
                          setIsScheduleDeliveryModalVisible(true);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="progress-clock"
                          size={16}
                          color="#FFFFFF"
                          style={styles.actionButtonIcon}
                        />
                        <Text style={styles.statusActionText}>Process</Text>
                      </TouchableOpacity>
                    </PermissionGate>

                    {/* Schedule Delivery Button - Only owner can schedule delivery */}
                    <PermissionGate permission="manage_delivery">
                      <TouchableOpacity
                        style={[
                          styles.statusActionButton,
                          { backgroundColor: "#6610f2" },
                        ]}
                        onPress={() => {
                          console.log("Schedule Delivery button pressed");
                          // Fetch drivers and vehicles before showing modal
                          fetchDriversAndVehicles();
                          setIsScheduleDeliveryModalVisible(true);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="truck-delivery"
                          size={16}
                          color="#FFFFFF"
                          style={styles.actionButtonIcon}
                        />
                        <Text style={styles.statusActionText}>
                          Schedule Delivery
                        </Text>
                      </TouchableOpacity>
                    </PermissionGate>

                    {/* Only owner and sales_rep can cancel orders */}
                    <PermissionGate permission="delete_order">
                      <TouchableOpacity
                        style={[
                          styles.statusActionButton,
                          { backgroundColor: "#dc3545" },
                        ]}
                        onPress={() => {
                          console.log("Cancel button pressed");
                          handleStatusUpdate("cancelled");
                        }}
                      >
                        <MaterialIcons
                          name="cancel"
                          size={16}
                          color="#FFFFFF"
                          style={styles.actionButtonIcon}
                        />
                        <Text style={styles.statusActionText}>Cancel</Text>
                      </TouchableOpacity>
                    </PermissionGate>
                  </>
                )}

                {/* Processing order can be delivered or cancelled */}
                {order.status === "processing" && (
                  <>
                    {/* If the order has no delivery assigned, show Schedule Delivery button */}
                    {!order.delivery && (
                      <PermissionGate permission="manage_delivery">
                        <TouchableOpacity
                          style={[
                            styles.statusActionButton,
                            { backgroundColor: "#6610f2" },
                          ]}
                          onPress={() => {
                            console.log("Schedule Delivery button pressed");
                            // Fetch drivers and vehicles before showing modal
                            fetchDriversAndVehicles();
                            setIsScheduleDeliveryModalVisible(true);
                          }}
                        >
                          <MaterialCommunityIcons
                            name="truck-delivery"
                            size={16}
                            color="#FFFFFF"
                            style={styles.actionButtonIcon}
                          />
                          <Text style={styles.statusActionText}>
                            Schedule Delivery
                          </Text>
                        </TouchableOpacity>
                      </PermissionGate>
                    )}

                    {/* Only lorry drivers and owners can mark as delivered */}
                    <PermissionGate permission="update_delivery_status">
                      <TouchableOpacity
                        style={[
                          styles.statusActionButton,
                          { backgroundColor: "#28a745" },
                        ]}
                        onPress={() => {
                          console.log("Mark Delivered button pressed");
                          handleStatusUpdate("delivered");
                        }}
                      >
                        <MaterialIcons
                          name="delivery-dining"
                          size={16}
                          color="#FFFFFF"
                          style={styles.actionButtonIcon}
                        />
                        <Text style={styles.statusActionText}>
                          Mark Delivered
                        </Text>
                      </TouchableOpacity>
                    </PermissionGate>

                    {/* Only owner or sales_rep can cancel orders */}
                    <PermissionGate permission="delete_order">
                      <TouchableOpacity
                        style={[
                          styles.statusActionButton,
                          { backgroundColor: "#dc3545" },
                        ]}
                        onPress={() => {
                          console.log("Cancel button pressed");
                          handleStatusUpdate("cancelled");
                        }}
                      >
                        <MaterialIcons
                          name="cancel"
                          size={16}
                          color="#FFFFFF"
                          style={styles.actionButtonIcon}
                        />
                        <Text style={styles.statusActionText}>Cancel</Text>
                      </TouchableOpacity>
                    </PermissionGate>
                  </>
                )}
              </View>
            )}

            {/* Show loading indicator while processing */}
            {processingAction && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}
          </View>

          {/* Order Summary Info */}
          <View style={styles.orderSummaryRow}>
            <View style={styles.orderSummaryItem}>
              <Text style={styles.orderSummaryLabel}>Total</Text>
              <Text style={styles.orderSummaryValue}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>

            <View style={styles.orderSummaryItem}>
              <Text style={styles.orderSummaryLabel}>Items</Text>
              <Text style={styles.orderSummaryValue}>
                {order.items.length} items
              </Text>
            </View>

            <View style={styles.orderSummaryItem}>
              <Text style={styles.orderSummaryLabel}>Payment</Text>
              <Text
                style={[
                  styles.orderSummaryValue,
                  order.payment_status === "paid"
                    ? styles.paidText
                    : order.payment_status === "pending"
                    ? styles.pendingText
                    : styles.partialText,
                ]}
              >
                {order.payment_status.charAt(0).toUpperCase() +
                  order.payment_status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleContainer}>
              <MaterialCommunityIcons
                name="store"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.infoCardTitle}>Customer</Text>
            </View>
            <TouchableOpacity
              style={styles.infoCardAction}
              onPress={() => {
                console.log("View customer details button pressed");
                // Fix customer detail navigation path
                router.push({
                  pathname: "/(customers)/customer-detail",
                  params: {
                    id: order.customer_id,
                    customerId: order.customer_id, // Add customerId for compatibility
                    customerName: order.customer_name, // Add customer name
                  },
                });
              }}
            >
              <Text style={styles.infoCardActionText}>View Details</Text>
              <AntDesign name="right" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.customerInfoContent}>
            <Text style={styles.customerName}>{order.customer_name}</Text>
            {order.contact_person && (
              <Text style={styles.customerDetail}>
                Contact: {order.contact_person}
              </Text>
            )}
            <Text style={styles.customerDetail}>Phone: {order.phone}</Text>
            <Text style={styles.customerDetail}>Address: {order.address}</Text>
          </View>
        </View>

        {/* Payment Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleContainer}>
              <FontAwesome5
                name="money-bill-wave"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.infoCardTitle}>Payment Details</Text>
            </View>
            {/* Removed Update link in payment details section */}
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.paymentInfoContent}>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Method:</Text>
              <Text style={styles.paymentInfoValue}>
                {order.payment_type.charAt(0).toUpperCase() +
                  order.payment_type.slice(1)}
              </Text>
            </View>

            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Status:</Text>
              <View
                style={[
                  styles.paymentStatusBadge,
                  order.payment_status === "paid"
                    ? styles.paidBadge
                    : order.payment_status === "pending"
                    ? styles.pendingBadge
                    : styles.partialBadge,
                ]}
              >
                <Text style={styles.paymentStatusText}>
                  {order.payment_status.charAt(0).toUpperCase() +
                    order.payment_status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Sub Total:</Text>
              <Text style={styles.paymentInfoValue}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>

            {order.discount_amount > 0 && (
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Discount:</Text>
                <Text style={styles.paymentInfoValue}>
                  {formatCurrency(order.discount_amount)}
                </Text>
              </View>
            )}

            {/* If there's a final amount calculated, show it */}
            {order.final_amount !== null && (
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Final Amount:</Text>
                <Text style={[styles.paymentInfoValue, styles.finalAmountText]}>
                  {formatCurrency(order.final_amount)}
                </Text>
              </View>
            )}

            {/* If there are multiple payments, show them */}
            {order.payments && order.payments.length > 0 && (
              <>
                <Text style={styles.paymentsHeader}>Payment History:</Text>
                {order.payments.map((payment, index) => (
                  <View
                    key={payment.payment_id}
                    style={styles.paymentHistoryItem}
                  >
                    <View style={styles.paymentInfoRow}>
                      <Text style={styles.paymentHistoryDate}>
                        {formatDate(payment.payment_date)}
                      </Text>
                      <Text style={styles.paymentHistoryAmount}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                    <Text style={styles.paymentHistoryMethod}>
                      {payment.payment_method.charAt(0).toUpperCase() +
                        payment.payment_method.slice(1)}
                      {payment.reference_number &&
                        ` (Ref: ${payment.reference_number})`}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Tab Selection for Order Items, Returns, Notes */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "items" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("items")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "items" && styles.activeTabText,
              ]}
            >
              Items ({order.items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "returns" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("returns")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "returns" && styles.activeTabText,
              ]}
            >
              Returns {order.return ? `(${order.return.items.length})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "notes" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("notes")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "notes" && styles.activeTabText,
              ]}
            >
              Notes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Order Items Tab Content */}
        {activeTab === "items" && (
          <View style={styles.tabContent}>
            <View style={styles.orderItemsHeader}>
              <Text style={styles.orderItemsTitle}>Order Items</Text>
              <Text style={styles.orderItemsCount}>
                {order.items.length} items
              </Text>
            </View>

            {order.items.map((item) => (
              <View key={item.order_item_id} style={styles.orderItemCard}>
                <View style={styles.orderItemInfo}>
                  <View style={styles.productImagePlaceholder}>
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={24}
                      color="#ADB5BD"
                    />
                  </View>
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.productName}>{item.product_name}</Text>
                    <Text style={styles.productBatch}>
                      Batch: {item.batch_number}
                    </Text>
                    {item.expiry_date && (
                      <Text style={styles.productExpiry}>
                        Expires: {formatSimpleDate(item.expiry_date)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.orderItemPricingContainer}>
                  <View style={styles.orderItemPricingRow}>
                    <Text style={styles.orderItemPricingLabel}>Qty:</Text>
                    <Text style={styles.orderItemPricingValue}>
                      {item.quantity}
                    </Text>
                  </View>

                  <View style={styles.orderItemPricingRow}>
                    <Text style={styles.orderItemPricingLabel}>Unit:</Text>
                    <Text style={styles.orderItemPricingValue}>
                      {formatCurrency(item.unit_price)}
                    </Text>
                  </View>

                  <View style={styles.orderItemPricingRow}>
                    <Text style={styles.orderItemPricingLabel}>Discount:</Text>
                    <Text style={styles.orderItemPricingValue}>
                      {formatCurrency(item.discount)}
                    </Text>
                  </View>

                  <View style={styles.orderItemPricingRow}>
                    <Text style={styles.orderItemPricingLabel}>Total:</Text>
                    <Text style={styles.orderItemPricingValue}>
                      {formatCurrency(item.total_price)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Summary of Items */}
            <View style={styles.orderTotalCard}>
              <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalLabel}>Subtotal:</Text>
                <Text style={styles.orderTotalValue}>
                  {formatCurrency(
                    order.items.reduce(
                      (total, item) =>
                        total + parseFloat(String(item.total_price)),
                      0
                    )
                  )}
                </Text>
              </View>

              {order.discount_amount > 0 && (
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalLabel}>
                    Additional Discount:
                  </Text>
                  <Text style={styles.orderTotalValue}>
                    {formatCurrency(order.discount_amount)}
                  </Text>
                </View>
              )}

              <View style={styles.orderGrandTotalRow}>
                <Text style={styles.orderGrandTotalLabel}>Total:</Text>
                <Text style={styles.orderGrandTotalValue}>
                  {formatCurrency(order.total_amount)}
                </Text>
              </View>

              {order.final_amount !== null &&
                order.final_amount !== order.total_amount && (
                  <View style={styles.orderGrandTotalRow}>
                    <Text style={styles.orderGrandTotalLabel}>
                      Final Amount:
                    </Text>
                    <Text style={styles.orderGrandTotalValue}>
                      {formatCurrency(order.final_amount)}
                    </Text>
                  </View>
                )}
            </View>
          </View>
        )}

        {/* Returns Tab Content */}
        {activeTab === "returns" && (
          <View style={styles.tabContent}>
            {order.return ? (
              <>
                <View style={styles.returnHeader}>
                  <Text style={styles.returnTitle}>Return Details</Text>
                  <View style={styles.returnInfo}>
                    <Text style={styles.returnDate}>
                      Processed on {formatDate(order.return.return_date)}
                    </Text>
                    <Text style={styles.returnProcessor}>
                      By: {order.return.processed_by_name}
                    </Text>
                    <Text style={styles.returnReason}>
                      Reason: {order.return.reason}
                    </Text>
                  </View>
                </View>

                {order.return.items.map((item) => (
                  <View key={item.return_item_id} style={styles.returnItemCard}>
                    <View style={styles.returnItemInfo}>
                      <View style={styles.productImagePlaceholder}>
                        <MaterialCommunityIcons
                          name="package-variant-closed"
                          size={24}
                          color="#ADB5BD"
                        />
                      </View>
                      <View style={styles.returnItemDetails}>
                        <Text style={styles.productName}>
                          {item.product_name}
                        </Text>
                        <Text style={styles.productBatch}>
                          Batch: {item.batch_number}
                        </Text>
                        <Text style={styles.returnReason}>
                          Reason:{" "}
                          {item.reason.charAt(0).toUpperCase() +
                            item.reason.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.returnItemValueContainer}>
                      <View style={styles.orderItemPricingRow}>
                        <Text style={styles.orderItemPricingLabel}>Qty:</Text>
                        <Text style={styles.orderItemPricingValue}>
                          {item.quantity}
                        </Text>
                      </View>
                      <View style={styles.orderItemPricingRow}>
                        <Text style={styles.orderItemPricingLabel}>Unit:</Text>
                        <Text style={styles.orderItemPricingValue}>
                          {formatCurrency(item.unit_price)}
                        </Text>
                      </View>
                      <View style={styles.orderItemPricingRow}>
                        <Text style={styles.orderItemPricingLabel}>Total:</Text>
                        <Text style={styles.orderItemPricingValue}>
                          {formatCurrency(item.total_price)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                <View style={styles.returnTotalContainer}>
                  <Text style={styles.returnTotalLabel}>
                    Total Return Amount:
                  </Text>
                  <Text style={styles.returnTotalValue}>
                    {formatCurrency(order.return.total_amount)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.noReturnsContainer}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={50}
                  color="#ADB5BD"
                />
                <Text style={styles.noReturnsText}>
                  No returns for this order
                </Text>

                {/* Only show process return button for delivered orders */}
                {order.status === "delivered" && (
                  <TouchableOpacity
                    style={styles.processReturnButton}
                    onPress={() => {
                      console.log("Process return button pressed");
                      router.push({
                        pathname: "../(orders)/process-return",
                        params: { orderId: order.order_id },
                      });
                    }}
                  >
                    <Text style={styles.processReturnButtonText}>
                      Process Return
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Notes Tab Content */}
        {activeTab === "notes" && (
          <View style={styles.tabContent}>
            <Text style={styles.notesTitle}>Order Notes</Text>

            {order.notes ? (
              <View style={styles.notesContainer}>
                <Text style={styles.notesText}>{order.notes}</Text>
              </View>
            ) : (
              <View style={styles.noNotesContainer}>
                <MaterialIcons name="notes" size={50} color="#ADB5BD" />
                <Text style={styles.noNotesText}>No notes for this order</Text>
              </View>
            )}

            {/* Add note button */}
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => {
                console.log("Add note button pressed");
                if (Platform.OS === "web") {
                  // For web, prompt might not be available
                  const note = prompt("Enter note for this order:");
                  if (note && note.trim() !== "") {
                    // Update local state
                    setOrder({
                      ...order,
                      notes: order.notes ? `${order.notes}\n\n${note}` : note,
                    });
                    Alert.alert("Success", "Note added successfully");
                  }
                } else {
                  // For mobile
                  Alert.prompt(
                    "Add Note",
                    "Enter note for this order:",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => console.log("Note cancelled"),
                      },
                      {
                        text: "Save",
                        onPress: async (text) => {
                          console.log("Note text:", text);
                          if (text && text.trim() !== "") {
                            // In a real implementation, you would call an API to update the order notes
                            // For now, we'll just update the local state
                            setOrder({
                              ...order,
                              notes: order.notes
                                ? `${order.notes}\n\n${text}`
                                : text,
                            });
                            Alert.alert("Success", "Note added successfully");
                          }
                        },
                      },
                    ],
                    "plain-text"
                  );
                }
              }}
            >
              <Text style={styles.addNoteButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delivery Info Card - only show if delivery info exists */}
        {order.delivery && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardTitleContainer}>
                <MaterialCommunityIcons
                  name="truck-delivery"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.infoCardTitle}>Delivery Information</Text>
              </View>
            </View>

            <View style={styles.deliveryInfoContent}>
              <View style={styles.deliveryInfoRow}>
                <Text style={styles.deliveryInfoLabel}>Status:</Text>
                <View
                  style={[
                    styles.deliveryStatusBadge,
                    order.delivery.status === "delivered"
                      ? styles.deliveredBadge
                      : order.delivery.status === "scheduled"
                      ? styles.scheduledBadge
                      : order.delivery.status === "in_progress"
                      ? styles.inProgressBadge
                      : styles.failedBadge,
                  ]}
                >
                  <Text style={styles.deliveryStatusText}>
                    {order.delivery.status.charAt(0).toUpperCase() +
                      order.delivery.status.slice(1).replace("_", " ")}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryInfoRow}>
                <Text style={styles.deliveryInfoLabel}>Driver:</Text>
                <Text style={styles.deliveryInfoValue}>
                  {order.delivery.driver_name}
                </Text>
              </View>

              <View style={styles.deliveryInfoRow}>
                <Text style={styles.deliveryInfoLabel}>Vehicle:</Text>
                <Text style={styles.deliveryInfoValue}>
                  {order.delivery.vehicle_name} (
                  {order.delivery.registration_number})
                </Text>
              </View>

              <View style={styles.deliveryInfoRow}>
                <Text style={styles.deliveryInfoLabel}>Scheduled Date:</Text>
                <Text style={styles.deliveryInfoValue}>
                  {formatSimpleDate(order.delivery.scheduled_date)}
                </Text>
              </View>

              {order.delivery.delivery_date && (
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Delivered On:</Text>
                  <Text style={styles.deliveryInfoValue}>
                    {formatSimpleDate(order.delivery.delivery_date)}
                  </Text>
                </View>
              )}

              {order.delivery.notes && (
                <View style={styles.deliveryNotesContainer}>
                  <Text style={styles.deliveryNotesLabel}>Notes:</Text>
                  <Text style={styles.deliveryNotesText}>
                    {order.delivery.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Schedule Delivery Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isScheduleDeliveryModalVisible}
        onRequestClose={() => {
          setIsScheduleDeliveryModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {order?.status === "pending"
                  ? "Process Order & Schedule Delivery"
                  : "Schedule Delivery"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Show confirmation if coming from Process button
                  if (order?.status === "pending") {
                    Alert.alert(
                      "Cancel Processing?",
                      "Do you want to cancel processing this order?",
                      [
                        {
                          text: "No",
                          style: "cancel",
                        },
                        {
                          text: "Yes",
                          onPress: () =>
                            setIsScheduleDeliveryModalVisible(false),
                        },
                      ]
                    );
                  } else {
                    // Just close for Schedule Delivery button
                    setIsScheduleDeliveryModalVisible(false);
                  }
                }}
              >
                <MaterialIcons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Information message */}
            {order?.status === "pending" && (
              <View style={styles.infoContainer}>
                <MaterialIcons
                  name="info"
                  size={20}
                  color={COLORS.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ fontSize: 14, color: "#555", flex: 1 }}>
                  Scheduling a delivery will automatically process this order. s
                  To proceed without scheduling delivery, click Cancel and
                  select &quot;Process Only&quot;.
                </Text>
              </View>
            )}

            {/* ScrollView for modal content to enable scrolling */}
            <ScrollView
              style={styles.modalScrollView}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {/* Select Driver */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Driver:</Text>
                {loadingDrivers ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : drivers.length === 0 ? (
                  <Text style={styles.noVehiclesText}>No drivers found</Text>
                ) : (
                  <ScrollView
                    style={styles.pickerScrollContainer}
                    nestedScrollEnabled={true}
                  >
                    {drivers.map((driver) => (
                      <TouchableOpacity
                        key={driver.user_id}
                        style={[
                          styles.selectItem,
                          selectedDriver === driver.user_id &&
                            styles.selectedItem,
                        ]}
                        onPress={() => setSelectedDriver(driver.user_id)}
                      >
                        <Text
                          style={[
                            styles.selectItemText,
                            selectedDriver === driver.user_id &&
                              styles.selectedItemText,
                          ]}
                        >
                          {driver.full_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Select Vehicle */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Vehicle:</Text>
                {loadingVehicles ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : vehicles.length === 0 ? (
                  <Text style={styles.noVehiclesText}>
                    No available vehicles found
                  </Text>
                ) : (
                  <ScrollView
                    style={styles.pickerScrollContainer}
                    nestedScrollEnabled={true}
                  >
                    {vehicles.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.vehicle_id}
                        style={[
                          styles.selectItem,
                          selectedVehicle === vehicle.vehicle_id &&
                            styles.selectedItem,
                          vehicle.status !== "available" && styles.disabledItem,
                        ]}
                        onPress={() => setSelectedVehicle(vehicle.vehicle_id)}
                        disabled={vehicle.status !== "available"}
                      >
                        <Text
                          style={[
                            styles.selectItemText,
                            selectedVehicle === vehicle.vehicle_id &&
                              styles.selectedItemText,
                            vehicle.status !== "available" &&
                              styles.disabledItemText,
                          ]}
                        >
                          {vehicle.name} ({vehicle.registration_number})
                          {vehicle.status !== "available" && " - Unavailable"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Select Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Delivery Date:</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="YYYY-MM-DD"
                    value={scheduledDate}
                    onChangeText={setScheduledDate}
                  />
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      // On web, we rely on the browser's date input
                      if (Platform.OS === "web") {
                        // The web platform will handle this automatically
                        return;
                      }

                      // For native platforms, you would need to implement a date picker
                      // This is a simplified version that just sets today's date
                      const today = new Date();
                      const formattedDate = `${today.getFullYear()}-${String(
                        today.getMonth() + 1
                      ).padStart(2, "0")}-${String(today.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                      setScheduledDate(formattedDate);
                    }}
                  >
                    <MaterialIcons
                      name="date-range"
                      size={24}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>Format: YYYY-MM-DD</Text>
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional):</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Enter any additional notes for the delivery"
                  multiline={true}
                  numberOfLines={3}
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  // If we came from the Process button and the order is still pending
                  if (order?.status === "pending") {
                    Alert.alert(
                      "Process Without Delivery?",
                      "Do you want to process this order without scheduling a delivery?",
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: "Process Only",
                          onPress: () => {
                            setIsScheduleDeliveryModalVisible(false);
                            handleStatusUpdate("processing");
                          },
                        },
                        {
                          text: "Close Modal",
                          onPress: () =>
                            setIsScheduleDeliveryModalVisible(false),
                        },
                      ]
                    );
                  } else {
                    // Just close the modal for other cases
                    setIsScheduleDeliveryModalVisible(false);
                  }
                }}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleAssignDelivery}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/")}
        >
          <MaterialCommunityIcons name="home" size={24} color="#555" />
          <Text style={styles.navButtonText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/products")}
        >
          <MaterialCommunityIcons
            name="package-variant"
            size={24}
            color="#555"
          />
          <Text style={styles.navButtonText}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/profile")}
        >
          <MaterialCommunityIcons name="account" size={24} color="#555" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalScrollView: {
    maxHeight: 400, // Add a max height to ensure scrollability
  },
  pickerScrollContainer: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  noVehiclesText: {
    padding: 12,
    color: "#6c757d",
    fontStyle: "italic",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    textAlign: "center",
  },
  disabledItem: {
    backgroundColor: "#f5f5f5",
    opacity: 0.7,
  },
  infoContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(102, 16, 242, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.dark,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    maxHeight: 150,
  },
  selectItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedItem: {
    backgroundColor: COLORS.primary + "20", // 20% opacity
  },
  selectItemText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  selectedItemText: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  disabledItemText: {
    color: "#999",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  datePickerButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  helperText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    marginBottom: 16,
  },
  statusHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderDateText: {
    fontSize: 15,
    color: "#555",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  statusActionsContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap", // Allow buttons to wrap to next line on small screens
  },
  statusActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
    marginBottom: 8, // Add space between rows when wrapped
  },
  actionButtonIcon: {
    marginRight: 6,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.light,
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  processingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#6c757d",
  },
  orderSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
    paddingTop: 16,
  },
  orderSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  orderSummaryLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
  },
  orderSummaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  paidText: {
    color: "#28a745",
  },
  pendingText: {
    color: "#dc3545",
  },
  partialText: {
    color: "#ffc107",
  },
  infoCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  infoCardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginLeft: 8,
  },
  infoCardAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCardActionText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 4,
  },
  customerInfoContent: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 10,
  },
  customerDetail: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  paymentInfoContent: {},
  paymentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentInfoLabel: {
    fontSize: 14,
    width: 120,
    color: "#6c757d",
  },
  paymentInfoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  finalAmountText: {
    fontWeight: "700",
    fontSize: 15,
    color: COLORS.primary,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: "rgba(220, 53, 69, 0.1)",
  },
  partialBadge: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
  },
  paidBadge: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentsHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 8,
    marginBottom: 8,
  },
  paymentHistoryItem: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentHistoryDate: {
    fontSize: 13,
    color: "#6c757d",
  },
  paymentHistoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  paymentHistoryMethod: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  activeTabText: {
    color: COLORS.light,
    fontWeight: "600",
  },
  tabContent: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderItemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  orderItemsCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  orderItemCard: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
    paddingBottom: 16,
  },
  orderItemInfo: {
    flexDirection: "row",
    marginBottom: 12,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderItemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 6,
  },
  productBatch: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 3,
  },
  productExpiry: {
    fontSize: 13,
    color: "#6c757d",
  },
  orderItemPricingContainer: {
    marginTop: 8,
  },
  orderItemPricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderItemPricingLabel: {
    fontSize: 14,
    color: "#6c757d",
    width: 70,
  },
  orderItemPricingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    textAlign: "right",
    flex: 1,
  },
  orderTotalCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderTotalLabel: {
    fontSize: 14,
    color: "#555",
  },
  orderTotalValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  orderGrandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
  },
  orderGrandTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  orderGrandTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  // Return tab styles
  returnHeader: {
    marginBottom: 16,
  },
  returnTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 10,
  },
  returnInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  returnDate: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  returnProcessor: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  returnReason: {
    fontSize: 14,
    color: "#555",
  },
  returnItemCard: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
    paddingBottom: 16,
  },
  returnItemInfo: {
    flexDirection: "row",
    marginBottom: 12,
  },
  returnItemDetails: {
    flex: 1,
  },
  returnItemValueContainer: {
    marginTop: 8,
  },
  returnTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  returnTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  returnTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc3545",
  },
  noReturnsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noReturnsText: {
    fontSize: 15,
    color: "#6c757d",
    marginTop: 16,
    marginBottom: 20,
  },
  processReturnButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  processReturnButtonText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 16,
  },
  notesContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  notesText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  noNotesContainer: {
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 20,
  },
  noNotesText: {
    fontSize: 15,
    color: "#6c757d",
    marginTop: 16,
  },
  addNoteButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addNoteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.light,
  },
  // Delivery info styles
  deliveryInfoContent: {
    marginBottom: 8,
  },
  deliveryInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  deliveryInfoLabel: {
    fontSize: 14,
    width: 120,
    color: "#6c757d",
  },
  deliveryInfoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  deliveryStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduledBadge: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
  },
  inProgressBadge: {
    backgroundColor: "rgba(0, 123, 255, 0.1)",
  },
  deliveredBadge: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
  },
  failedBadge: {
    backgroundColor: "rgba(220, 53, 69, 0.1)",
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deliveryNotesContainer: {
    marginTop: 8,
  },
  deliveryNotesLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
  },
  deliveryNotesText: {
    fontSize: 14,
    color: "#555",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    lineHeight: 20,
  },
  // Bottom navigation styles
  bottomNavigation: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingVertical: 10,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  navButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: "#555",
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
    marginVertical: 16,
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
