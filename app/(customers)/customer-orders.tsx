// Import necessary icon libraries for UI icons
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
// Import navigation and parameter hooks from expo-router
import { router, useLocalSearchParams } from "expo-router";
// Import React and React Native core components
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import custom PermissionGate component for permission-based UI
import PermissionGate from "../components/PermissionGate";
// Import API function to fetch customer orders
import { getCustomerOrders } from "../services/api";
// Import color constants
import { COLORS } from "../theme/colors";

// Define TypeScript interfaces for type safety

// Structure for individual items within an order
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
}

// Structure for order data from the API
interface Order {
  order_id: string;
  order_date: string;
  delivery_date: string | null;
  payment_type: "cash" | "credit" | "cheque";
  payment_status: "pending" | "partial" | "paid";
  total_amount: number;
  discount_amount: number;
  status: "pending" | "processing" | "delivered" | "cancelled";
  items_count: number;
  items?: OrderItem[];
}

// Structure for customer information
interface CustomerDetails {
  customer_id: string;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
}

// Main component for displaying a customer's orders
export default function CustomerOrdersScreen() {
  // Get navigation parameters for customer ID and name
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;
  const customerName = params.customerName as string;

  // State variables for component data and UI state
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Fetch orders when the component mounts
  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch orders for the given customer from the API
  const fetchOrders = async () => {
    if (!customerId) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      const response = await getCustomerOrders(customerId);

      // Ensure all numeric values are properly typed as numbers
      const processedOrders = (response.orders || []).map((order: any) => ({
        ...order,
        total_amount:
          typeof order.total_amount === "string"
            ? parseFloat(order.total_amount)
            : Number(order.total_amount),
        discount_amount:
          typeof order.discount_amount === "string"
            ? parseFloat(order.discount_amount)
            : Number(order.discount_amount),
        items_count:
          typeof order.items_count === "string"
            ? parseInt(order.items_count, 10)
            : Number(order.items_count),
        items: order.items
          ? order.items.map((item: any) => ({
              ...item,
              quantity:
                typeof item.quantity === "string"
                  ? parseInt(item.quantity, 10)
                  : Number(item.quantity),
              unit_price:
                typeof item.unit_price === "string"
                  ? parseFloat(item.unit_price)
                  : Number(item.unit_price),
              discount:
                typeof item.discount === "string"
                  ? parseFloat(item.discount)
                  : Number(item.discount),
              total_price:
                typeof item.total_price === "string"
                  ? parseFloat(item.total_price)
                  : Number(item.total_price),
            }))
          : undefined,
      }));

      setOrders(processedOrders);
      setCustomer(response.customer || null);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle the expanded/collapsed state of an order card
  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  // Format a date string to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format a number or string as a currency amount
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

  // Render a colored badge for the order status
  const getStatusBadge = (status: string) => {
    let backgroundColor = "#757575";
    let statusText = status.charAt(0).toUpperCase() + status.slice(1);

    switch (status) {
      case "pending":
        backgroundColor = "#FFC107";
        break;
      case "processing":
        backgroundColor = "#2196F3";
        break;
      case "delivered":
        backgroundColor = "#4CAF50";
        break;
      case "cancelled":
        backgroundColor = "#F44336";
        break;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <Text style={styles.statusBadgeText}>{statusText}</Text>
      </View>
    );
  };

  // Render a colored indicator for the payment status
  const getPaymentStatusIndicator = (status: string) => {
    let color = "#757575";

    switch (status) {
      case "paid":
        color = "#4CAF50";
        break;
      case "partial":
        color = "#FFC107";
        break;
      case "pending":
        color = "#F44336";
        break;
    }

    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={[styles.paymentStatusIndicator, { backgroundColor: color }]}
        />
        <Text style={styles.paymentStatusText}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  // Render a single order card in the list
  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const isExpanded = expandedOrderId === order.order_id;

    return (
      <View style={styles.orderCard}>
        {/* Order header with ID, date, and expand/collapse icon */}
        <TouchableOpacity
          style={styles.orderHeader}
          onPress={() => toggleOrderExpand(order.order_id)}
        >
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>{order.order_id}</Text>
            <Text style={styles.orderDate}>{formatDate(order.order_date)}</Text>
          </View>

          <View style={styles.orderStatusContainer}>
            {getStatusBadge(order.status)}
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={24}
              color="#757575"
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>

        {/* Order summary row with total, items, and payment status */}
        <View style={styles.orderSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>
              {formatAmount(order.total_amount)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{order.items_count}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Payment Status</Text>
            {getPaymentStatusIndicator(order.payment_status)}
          </View>
        </View>

        {/* Expanded order details with item list and totals */}
        {isExpanded && order.items && (
          <View style={styles.orderDetails}>
            <View style={styles.orderItemsHeader}>
              <Text style={styles.orderItemsTitle}>Order Items</Text>
              <Text style={styles.orderItemsCount}>
                {order.items.length}{" "}
                {order.items.length === 1 ? "item" : "items"}
              </Text>
            </View>

            {/* List of products in the order */}
            {order.items.map((item) => (
              <View key={item.order_item_id} style={styles.orderItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  <Text style={styles.batchNumber}>
                    Batch: {item.batch_number}
                  </Text>
                </View>

                <View style={styles.quantityPrice}>
                  <Text style={styles.quantity}>{item.quantity} x </Text>
                  <Text style={styles.unitPrice}>
                    {formatAmount(item.unit_price)}
                  </Text>
                </View>

                <Text style={styles.totalPrice}>
                  {formatAmount(item.total_price)}
                </Text>
              </View>
            ))}

            {/* Order totals section */}
            <View style={styles.orderTotals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(
                    Number(order.total_amount) + Number(order.discount_amount)
                  )}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.discountValue}>
                  - {formatAmount(order.discount_amount)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatAmount(order.total_amount)}
                </Text>
              </View>
            </View>

            {/* Order Actions Section Removed */}
          </View>
        )}
      </View>
    );
  };

  // Calculate the total sales amount for all orders
  const calculateTotalSales = () => {
    return orders.reduce((total, order) => {
      const orderAmount =
        typeof order.total_amount === "string"
          ? parseFloat(order.total_amount)
          : Number(order.total_amount);
      return total + (isNaN(orderAmount) ? 0 : orderAmount);
    }, 0);
  };

  // Format the total sales amount in a compact K/M notation for the stat card
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

  // Render the main UI
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar and header */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {customerName || (customer ? customer.name : "Customer")} Orders
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading indicator while fetching orders */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <>
          {/* Stats cards for total orders, sales, and last order date */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatCompactAmount(calculateTotalSales())}
              </Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {orders.length > 0 ? formatDate(orders[0].order_date) : "N/A"}
              </Text>
              <Text style={styles.statLabel}>Last Order</Text>
            </View>
          </View>
          <View style={styles.container}>
            {/* List of all orders for the customer */}
            <FlatList
              data={orders}
              renderItem={renderOrderItem}
              keyExtractor={(item) => item.order_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.ordersList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="cart-off"
                    size={60}
                    color="#ADB5BD"
                  />
                  <Text style={styles.emptyText}>
                    No orders found for this customer
                  </Text>
                </View>
              }
            />
          </View>
          {/* Floating action button to add a new order (permission protected) */}
          <View style={styles.fabContainer}>
            <PermissionGate permission="add_order">
              <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                  router.push({
                    pathname: "../(orders)/order-add",
                    params: { customerId: customerId },
                  });
                }}
              >
                <MaterialIcons
                  name="add-shopping-cart"
                  size={24}
                  color={COLORS.light}
                />
              </TouchableOpacity>
            </PermissionGate>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// Styles for the component UI elements
const styles = StyleSheet.create({
  // Main container with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Header bar with navigation and title
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
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 15 : 8, // Reduced padding
  },
  // Back navigation button styling
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
  // Loading spinner container
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
  // Container for statistics cards at the top
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12, // Reduced from 16
    paddingVertical: 10, // Reduced from 16
  },
  // Individual statistic card styling
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
  // Statistic value text (number)
  statValue: {
    fontSize: 14, // Reduced from 16
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2, // Reduced from 4
  },
  // Statistic label text (description)
  statLabel: {
    fontSize: 10, // Reduced from 12
    color: "#6c757d",
  },
  // Main content container
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // FlatList content container styling
  ordersList: {
    paddingBottom: 80, // Space for FAB
  },
  // Individual order card container
  orderCard: {
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
  // Order card header with ID and status
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  // Order ID and date container
  orderInfo: {
    flex: 1,
  },
  // Order ID text styling
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Order date text styling
  orderDate: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
  },
  // Status badge and expand icon container
  orderStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Colored status badge background
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // Status badge text styling
  statusBadgeText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "600",
  },
  // Order summary row with key metrics
  orderSummary: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  // Individual summary item container
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  // Summary label text
  summaryLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  // Summary value text
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  // Small colored circle for payment status
  paymentStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  // Payment status text styling
  paymentStatusText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  // Expanded order details container
  orderDetails: {
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  // Header for order items section
  orderItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  // "Order Items" title styling
  orderItemsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Item count text styling
  orderItemsCount: {
    fontSize: 13,
    color: "#6c757d",
  },
  // Individual order item row
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  // Product name and batch container
  productInfo: {
    flex: 2,
  },
  // Product name text styling
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  // Batch number text styling
  batchNumber: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
  },
  // Quantity and unit price container
  quantityPrice: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  // Quantity text styling
  quantity: {
    fontSize: 14,
    color: COLORS.dark,
  },
  // Unit price text styling
  unitPrice: {
    fontSize: 14,
    color: COLORS.dark,
  },
  // Total price for the item
  totalPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    textAlign: "right",
  },
  // Order totals section container
  orderTotals: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  // Individual total row (subtotal, discount, total)
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  // Total label text (left side)
  totalLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  // Total value text (right side)
  totalValue: {
    fontSize: 14,
    color: COLORS.dark,
  },
  // Discount amount styling (red text)
  discountValue: {
    fontSize: 14,
    color: "#F44336",
  },
  // Grand total label styling (bold)
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Grand total value styling (bold)
  grandTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  /* Order Action styles removed */
  // Empty state container when no orders found
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  // Empty state message text
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 16,
  },
  // Floating action button container
  fabContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  // Floating action button styling
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
