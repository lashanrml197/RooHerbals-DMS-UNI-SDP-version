import {
  FontAwesome,
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
import {
  getAllOrders,
  getOrderById,
  processReturn,
} from "../services/orderApi";
import { COLORS } from "../theme/colors";

// Define TypeScript interfaces
interface Order {
  order_id: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
}

interface OrderDetail {
  order_id: string;
  customer_name: string;
  contact_person: string;
  phone: string;
  address: string;
  sales_rep_name: string;
  order_date: string;
  delivery_date: string | null;
  payment_type: string;
  payment_status: string;
  total_amount: number;
  discount_amount: number;
  notes: string;
  status: string;
  items: OrderItem[];
  delivery: any;
  payments: any[];
  return: any;
}

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
  expiry_date: string;
  image_url: string | null;
  selected_for_return?: boolean;
  return_quantity?: number;
  return_reason?: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ReturnOrdersScreen() {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [searchText, setSearchText] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] =
    useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [processingReturn, setProcessingReturn] = useState<boolean>(false);

  // Modal for return confirmation
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState<boolean>(false);

  // Status options for filtering - only include delivered and partially returned orders
  const statusOptions = [{ value: "delivered", label: "Delivered" }];

  // Get URL params if coming from another screen
  const params = useLocalSearchParams();

  // Fetch orders data with filters for returns - only delivered orders are eligible for returns
  const fetchOrders = async (page = 1, search = searchText) => {
    try {
      setRefreshing(true);
      setError(null);

      // Build query parameters
      const params: any = {
        page,
        limit: pagination.limit,
        sort: "order_date",
        order: "DESC",
        status: "delivered", // Only delivered orders can be returned
      };

      if (search) {
        params.search = search;
      }

      console.log("Fetching orders for returns with params:", params);
      const response = await getAllOrders(params);

      if ("data" in response && "pagination" in response) {
        setOrders(response.data as Order[]);
        setPagination(response.pagination as PaginationInfo);
      } else {
        console.error("Invalid response format:", response);
        setError("Invalid response format from server");
      }
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders. Please try again.");

      // Use sample data if API fails
      setOrders([
        {
          order_id: "O1041",
          customer_name: "Herbal Store Colombo",
          order_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
          total_amount: 3200,
          status: "delivered",
          payment_status: "paid",
        },
        {
          order_id: "O1039",
          customer_name: "Beauty Shop Kandy",
          order_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          total_amount: 4750,
          status: "delivered",
          payment_status: "paid",
        },
        {
          order_id: "O1037",
          customer_name: "Natural Care Galle",
          order_date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
          total_amount: 2800,
          status: "delivered",
          payment_status: "paid",
        },
      ]);

      setPagination({
        total: 3,
        page: 1,
        limit: 10,
        pages: 1,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch order details for returns
  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoadingOrderDetails(true);
      setError(null);

      console.log("Fetching order details for:", orderId);
      const data = (await getOrderById(orderId)) as OrderDetail;

      // Initialize return quantities and reasons for all items
      const items = data.items.map((item) => ({
        ...item,
        selected_for_return: false,
        return_quantity: 1,
        return_reason: "damaged", // Default reason
      }));

      setSelectedOrder({
        ...data,
        items,
      });

      setModalVisible(true);
    } catch (err: any) {
      console.error("Failed to fetch order details:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to load order details. Please try again."
      );

      // Use sample data if API fails
      const sampleItems = [
        {
          order_item_id: "OI1001",
          product_id: "P001",
          product_name: "Herbal Shampoo",
          batch_id: "B001",
          batch_number: "BATCH-001",
          quantity: 5,
          unit_price: 350,
          discount: 50,
          total_price: 1700,
          expiry_date: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
          image_url: null,
          selected_for_return: false,
          return_quantity: 1,
          return_reason: "damaged",
        },
        {
          order_item_id: "OI1002",
          product_id: "P005",
          product_name: "Face Cream",
          batch_id: "B007",
          batch_number: "BATCH-007",
          quantity: 3,
          unit_price: 620,
          discount: 70,
          total_price: 1790,
          expiry_date: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
          image_url: null,
          selected_for_return: false,
          return_quantity: 1,
          return_reason: "damaged",
        },
        {
          order_item_id: "OI1003",
          product_id: "P009",
          product_name: "Body Lotion",
          batch_id: "B011",
          batch_number: "BATCH-011",
          quantity: 2,
          unit_price: 550,
          discount: 50,
          total_price: 1050,
          expiry_date: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
          image_url: null,
          selected_for_return: false,
          return_quantity: 1,
          return_reason: "damaged",
        },
      ];

      setSelectedOrder({
        order_id: orderId,
        customer_name: "Sample Customer",
        contact_person: "John Doe",
        phone: "0771234567",
        address: "123 Main St, Colombo",
        sales_rep_name: "Sample Sales Rep",
        order_date: new Date().toISOString(),
        delivery_date: new Date().toISOString(),
        payment_type: "cash",
        payment_status: "paid",
        total_amount: 4540,
        discount_amount: 170,
        notes: "",
        status: "delivered",
        items: sampleItems,
        delivery: null,
        payments: [],
        return: null,
      });

      setModalVisible(true);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Process return
  const submitReturn = async () => {
    try {
      if (!selectedOrder) return;

      const selectedItems = selectedOrder.items.filter(
        (item) => item.selected_for_return
      );

      if (selectedItems.length === 0) {
        Alert.alert("Error", "Please select at least one item to return");
        return;
      }

      setProcessingReturn(true);

      // Prepare return data
      const returnData = {
        processed_by: "U001", // This would normally come from authenticated user
        reason: note || "Customer return",
        items: selectedItems.map((item) => ({
          product_id: item.product_id,
          batch_id: item.batch_id,
          quantity: item.return_quantity || 1,
          unit_price: item.unit_price,
          reason: item.return_reason || "damaged",
        })),
      };

      console.log("Processing return:", returnData);
      const response = await processReturn(selectedOrder.order_id, returnData);

      console.log("Return processed:", response);

      // Close modal and refresh orders
      setModalVisible(false);
      setConfirmationModalVisible(false);
      setSelectedOrder(null);
      setNote("");

      // Show success alert with safe access to return_id
      Alert.alert(
        "Return Processed",
        `Return #${
          response && typeof response === "object" && "return_id" in response
            ? response.return_id
            : "Unknown"
        } has been processed successfully.`,
        [
          {
            text: "OK",
            onPress: () => fetchOrders(),
          },
        ]
      );
    } catch (err: any) {
      console.error("Failed to process return:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to process return. Please try again."
      );
    } finally {
      setProcessingReturn(false);
    }
  };

  // Handle item selection for return
  const toggleItemSelection = (index: number) => {
    if (!selectedOrder) return;

    const updatedItems = [...selectedOrder.items];
    updatedItems[index].selected_for_return =
      !updatedItems[index].selected_for_return;

    setSelectedOrder({
      ...selectedOrder,
      items: updatedItems,
    });
  };

  // Handle quantity change for return
  const updateReturnQuantity = (index: number, value: number) => {
    if (!selectedOrder) return;

    const updatedItems = [...selectedOrder.items];
    const maxQuantity = updatedItems[index].quantity;

    // Ensure return quantity is between 1 and max available
    const newQuantity = Math.min(Math.max(1, value), maxQuantity);
    updatedItems[index].return_quantity = newQuantity;

    setSelectedOrder({
      ...selectedOrder,
      items: updatedItems,
    });
  };

  // Handle reason change for return
  const updateReturnReason = (index: number, reason: string) => {
    if (!selectedOrder) return;

    const updatedItems = [...selectedOrder.items];
    updatedItems[index].return_reason = reason;

    setSelectedOrder({
      ...selectedOrder,
      items: updatedItems,
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchOrders();

    // If redirected with order ID, open that order
    if (params.order_id) {
      fetchOrderDetails(params.order_id as string);
    }
  }, []);

  // Handle search submit
  const handleSearch = () => {
    fetchOrders(1, searchText);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchText("");
    fetchOrders(1, "");
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchOrders(1, searchText);
  };

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      fetchOrders(pagination.page + 1, searchText);
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchOrders(pagination.page - 1, searchText);
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();

    // Calculate the difference in days
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return (
        "Today, " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else if (diffDays === 1) {
      // Yesterday
      return (
        "Yesterday, " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else {
      // Format as "Day, Month Date"
      return date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return (
      "Rs. " +
      amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Calculate total return amount
  const calculateTotalReturn = (): number => {
    if (!selectedOrder) return 0;

    return selectedOrder.items
      .filter((item) => item.selected_for_return)
      .reduce((total, item) => {
        return total + item.unit_price * (item.return_quantity || 1);
      }, 0);
  };

  // Render order item
  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => fetchOrderDetails(item.order_id)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>
            Order #{item.order_id.replace(/^O/, "")}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Delivered</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#ADB5BD" />
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfo}>
            <MaterialCommunityIcons name="store" size={16} color="#6c757d" />
            <Text style={styles.orderInfoText} numberOfLines={1}>
              {item.customer_name}
            </Text>
          </View>

          <View style={styles.orderInfo}>
            <MaterialIcons name="date-range" size={16} color="#6c757d" />
            <Text style={styles.orderInfoText}>
              {formatDate(item.order_date)}
            </Text>
          </View>
        </View>

        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfo}>
            <FontAwesome name="money" size={16} color="#6c757d" />
            <Text style={styles.orderInfoText}>
              {formatCurrency(item.total_amount)}
            </Text>
          </View>

          <View style={styles.orderInfo}>
            <MaterialCommunityIcons
              name="truck-check"
              size={16}
              color="#28a745"
            />
            <Text style={[styles.orderInfoText, { color: "#28a745" }]}>
              Eligible for Return
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render product item in return modal
  const renderProductItem = (item: OrderItem, index: number) => (
    <View key={item.order_item_id} style={styles.productItemContainer}>
      <View style={styles.productHeader}>
        <TouchableOpacity
          style={styles.selectCheckbox}
          onPress={() => toggleItemSelection(index)}
        >
          {item.selected_for_return ? (
            <MaterialIcons name="check-box" size={24} color={COLORS.primary} />
          ) : (
            <MaterialIcons
              name="check-box-outline-blank"
              size={24}
              color="#ADB5BD"
            />
          )}
        </TouchableOpacity>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>
      </View>

      <View style={styles.productDetails}>
        <View style={styles.productInfoRow}>
          <Text style={styles.productInfoLabel}>Price:</Text>
          <Text style={styles.productInfoValue}>
            {formatCurrency(item.unit_price)}
          </Text>
        </View>

        <View style={styles.productInfoRow}>
          <Text style={styles.productInfoLabel}>Quantity:</Text>
          <Text style={styles.productInfoValue}>{item.quantity}</Text>
        </View>

        <View style={styles.productInfoRow}>
          <Text style={styles.productInfoLabel}>Batch:</Text>
          <Text style={styles.productInfoValue}>{item.batch_number}</Text>
        </View>

        <View style={styles.productInfoRow}>
          <Text style={styles.productInfoLabel}>Expiry:</Text>
          <Text style={styles.productInfoValue}>
            {new Date(item.expiry_date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.selected_for_return && (
        <View style={styles.returnOptions}>
          <Text style={styles.returnOptionsTitle}>Return Options:</Text>

          <View style={styles.quantitySelector}>
            <Text style={styles.quantitySelectorLabel}>Quantity:</Text>
            <View style={styles.quantitySelectorControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  updateReturnQuantity(index, (item.return_quantity || 1) - 1)
                }
                disabled={(item.return_quantity || 1) <= 1}
              >
                <Text
                  style={[
                    styles.quantityButtonText,
                    (item.return_quantity || 1) <= 1 && styles.disabledText,
                  ]}
                >
                  -
                </Text>
              </TouchableOpacity>

              <Text style={styles.quantityValue}>
                {item.return_quantity || 1}
              </Text>

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  updateReturnQuantity(index, (item.return_quantity || 1) + 1)
                }
                disabled={(item.return_quantity || 1) >= item.quantity}
              >
                <Text
                  style={[
                    styles.quantityButtonText,
                    (item.return_quantity || 1) >= item.quantity &&
                      styles.disabledText,
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.reasonSelector}>
            <Text style={styles.reasonSelectorLabel}>Reason:</Text>
            <View style={styles.reasonOptions}>
              {["damaged", "expired", "unwanted", "wrong_item"].map(
                (reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      item.return_reason === reason &&
                        styles.selectedReasonOption,
                    ]}
                    onPress={() => updateReturnReason(index, reason)}
                  >
                    <Text
                      style={[
                        styles.reasonOptionText,
                        item.return_reason === reason &&
                          styles.selectedReasonText,
                      ]}
                    >
                      {reason.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.divider} />
    </View>
  );

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Process Returns</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading orders eligible for return...
          </Text>
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
        <Text style={styles.headerTitle}>Process Returns</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#ADB5BD"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID or customer..."
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color="#ADB5BD" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Information card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <Ionicons
            name="information-circle"
            size={24}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Processing Returns</Text>
          <Text style={styles.infoDescription}>
            Select a delivered order to process returns. Only delivered orders
            are eligible for returns.
          </Text>
        </View>
      </View>

      {/* Results count */}
      <View style={styles.resultsCountContainer}>
        <Text style={styles.resultsCount}>
          {pagination.total} {pagination.total === 1 ? "order" : "orders"}{" "}
          eligible for return
        </Text>
      </View>

      {/* Orders list */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inventory" size={50} color="#ADB5BD" />
          <Text style={styles.emptyText}>
            {searchText
              ? "No orders found matching your search."
              : "No orders available for returns."}
          </Text>
          {searchText && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchText("");
                fetchOrders(1, "");
              }}
            >
              <Text style={styles.clearFiltersText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.order_id}
          contentContainerStyle={styles.orderList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    pagination.page === 1 && styles.disabledButton,
                  ]}
                  onPress={handlePrevPage}
                  disabled={pagination.page === 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={pagination.page === 1 ? "#ADB5BD" : COLORS.dark}
                  />
                  <Text
                    style={[
                      styles.paginationButtonText,
                      pagination.page === 1 && styles.disabledText,
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <Text style={styles.paginationInfo}>
                  Page {pagination.page} of {pagination.pages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    pagination.page === pagination.pages &&
                      styles.disabledButton,
                  ]}
                  onPress={handleNextPage}
                  disabled={pagination.page === pagination.pages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      pagination.page === pagination.pages &&
                        styles.disabledText,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      pagination.page === pagination.pages
                        ? "#ADB5BD"
                        : COLORS.dark
                    }
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Return Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedOrder(null);
          setNote("");
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setSelectedOrder(null);
                setNote("");
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Process Return</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingOrderDetails ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
          ) : selectedOrder ? (
            <>
              <ScrollView style={styles.modalContent}>
                <View style={styles.orderSummary}>
                  <Text style={styles.orderSummaryTitle}>
                    Order #{selectedOrder.order_id.replace(/^O/, "")}
                  </Text>
                  <Text style={styles.orderSummaryText}>
                    {selectedOrder.customer_name}
                  </Text>
                  <Text style={styles.orderSummaryText}>
                    Date: {formatDate(selectedOrder.order_date)}
                  </Text>
                  <Text style={styles.orderSummaryText}>
                    Total: {formatCurrency(selectedOrder.total_amount)}
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Select Items to Return</Text>

                {selectedOrder.items.map((item, index) =>
                  renderProductItem(item, index)
                )}

                <View style={styles.noteContainer}>
                  <Text style={styles.noteLabel}>Additional Notes:</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Enter reason for return (optional)"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={styles.returnSummary}>
                <View style={styles.returnSummaryInfo}>
                  <Text style={styles.returnSummaryLabel}>Selected Items:</Text>
                  <Text style={styles.returnSummaryValue}>
                    {
                      selectedOrder.items.filter(
                        (item) => item.selected_for_return
                      ).length
                    }
                  </Text>
                </View>
                <View style={styles.returnSummaryInfo}>
                  <Text style={styles.returnSummaryLabel}>
                    Total Return Amount:
                  </Text>
                  <Text style={styles.returnSummaryValue}>
                    {formatCurrency(calculateTotalReturn())}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.processReturnButton,
                    selectedOrder.items.filter(
                      (item) => item.selected_for_return
                    ).length === 0 && styles.disabledButton,
                  ]}
                  disabled={
                    selectedOrder.items.filter(
                      (item) => item.selected_for_return
                    ).length === 0
                  }
                  onPress={() => {
                    if (
                      selectedOrder.items.filter(
                        (item) => item.selected_for_return
                      ).length > 0
                    ) {
                      setConfirmationModalVisible(true);
                    } else {
                      Alert.alert(
                        "Error",
                        "Please select at least one item to return"
                      );
                    }
                  }}
                >
                  <Text style={styles.processReturnButtonText}>
                    Process Return
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmationModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setConfirmationModalVisible(false);
        }}
      >
        <View style={styles.confirmationModalOverlay}>
          <View style={styles.confirmationModalContainer}>
            <View style={styles.confirmationModalHeader}>
              <MaterialIcons name="help" size={28} color={COLORS.primary} />
              <Text style={styles.confirmationModalTitle}>Confirm Return</Text>
            </View>

            <Text style={styles.confirmationModalText}>
              Are you sure you want to process this return? This action cannot
              be undone.
            </Text>

            <Text style={styles.confirmationModalDetail}>
              {selectedOrder?.items.filter((item) => item.selected_for_return)
                .length || 0}{" "}
              items selected
              {"\n"}
              Total Amount: {formatCurrency(calculateTotalReturn())}
            </Text>

            <View style={styles.confirmationModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmationModalVisible(false)}
                disabled={processingReturn}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={submitReturn}
                disabled={processingReturn}
              >
                {processingReturn ? (
                  <ActivityIndicator size="small" color={COLORS.light} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: "#6c757d",
    lineHeight: 18,
  },
  resultsCountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  orderList: {
    padding: 16,
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#28a745",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.light,
    textTransform: "capitalize",
  },
  orderDetails: {
    padding: 12,
  },
  orderInfoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  orderInfoText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 6,
    flex: 1,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  paginationInfo: {
    fontSize: 13,
    color: "#6c757d",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#ADB5BD",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: COLORS.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  modalContent: {
    flex: 1,
  },
  orderSummary: {
    backgroundColor: COLORS.light,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 8,
  },
  orderSummaryText: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    margin: 16,
    marginBottom: 8,
  },
  productItemContainer: {
    backgroundColor: COLORS.light,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectCheckbox: {
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    flex: 1,
  },
  productDetails: {
    marginLeft: 36,
    marginBottom: 12,
  },
  productInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  productInfoLabel: {
    fontSize: 13,
    color: "#6c757d",
  },
  productInfoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.dark,
  },
  returnOptions: {
    marginLeft: 36,
    marginTop: 8,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
  },
  returnOptionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quantitySelectorLabel: {
    fontSize: 13,
    color: "#6c757d",
    width: 70,
  },
  quantitySelectorControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: "center",
  },
  reasonSelector: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reasonSelectorLabel: {
    fontSize: 13,
    color: "#6c757d",
    width: 70,
    marginTop: 6,
  },
  reasonOptions: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  reasonOption: {
    backgroundColor: "#E9ECEF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  selectedReasonOption: {
    backgroundColor: COLORS.primary,
  },
  reasonOptionText: {
    fontSize: 12,
    color: COLORS.dark,
    textTransform: "capitalize",
  },
  selectedReasonText: {
    color: COLORS.light,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E9ECEF",
    marginTop: 8,
  },
  noteContainer: {
    padding: 16,
    marginBottom: 80,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    padding: 12,
    fontSize: 14,
    color: COLORS.dark,
    minHeight: 100,
    textAlignVertical: "top",
  },
  returnSummary: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  returnSummaryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  returnSummaryLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  returnSummaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dark,
  },
  processReturnButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  processReturnButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.light,
  },
  // Confirmation modal styles
  confirmationModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmationModalContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmationModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmationModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginLeft: 10,
  },
  confirmationModalText: {
    fontSize: 15,
    color: "#6c757d",
    marginBottom: 16,
    lineHeight: 22,
  },
  confirmationModalDetail: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 16,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  confirmationModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.light,
  },
});
