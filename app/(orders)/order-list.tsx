import {
  AntDesign,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { getAllOrders } from "../services/orderApi"; // Updated to use the correct function name
import { COLORS } from "../theme/colors";

// Define TypeScript interfaces
interface Order {
  order_id: string;
  customer_name: string;
  sales_rep_name: string;
  order_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function OrderListScreen() {
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Status options for filtering
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  // Payment status options for filtering
  const paymentOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Partial" },
    { value: "paid", label: "Paid" },
  ];

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
  ];

  // Fetch orders data with filters
  const fetchOrders = async (
    page = 1,
    search = searchText,
    status = statusFilter,
    payment = paymentFilter,
    sort = sortBy
  ) => {
    try {
      setRefreshing(true);
      setError(null);

      // Build query parameters
      const params: any = {
        page,
        limit: pagination.limit,
        sort: "order_date",
        order: sort === "newest" ? "DESC" : "ASC",
      };

      // Add filters if not "all"
      if (status !== "all") {
        params.status = status;
      }

      if (payment !== "all") {
        params.payment_status = payment;
      }

      if (search) {
        params.search = search;
      }

      console.log("Fetching orders with params:", params);
      const response = await getAllOrders(params);

      if (response && typeof response === "object") {
        // Type assertion with interface to ensure TypeScript recognizes the structure
        const typedResponse = response as {
          data: Order[];
          pagination: PaginationInfo;
        };
        setOrders(typedResponse.data);
        setPagination(typedResponse.pagination);
      }
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders. Please try again.");

      // Use sample data if API fails
      setOrders([
        {
          order_id: "O1042",
          customer_name: "Beauty Shop Galle",
          sales_rep_name: "Kasun Perera",
          order_date: new Date().toISOString(),
          total_amount: 2450,
          status: "processing",
          payment_status: "pending",
        },
        {
          order_id: "O1041",
          customer_name: "Herbal Store Colombo",
          sales_rep_name: "Nirmal Silva",
          order_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
          total_amount: 3200,
          status: "delivered",
          payment_status: "paid",
        },
        {
          order_id: "O1040",
          customer_name: "Natural Cosmetics Kandy",
          sales_rep_name: "Dileepa Senaratne",
          order_date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
          total_amount: 5750,
          status: "cancelled",
          payment_status: "partial",
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

  // Initial data fetch
  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle search submit
  const handleSearch = () => {
    fetchOrders(1, searchText, statusFilter, paymentFilter, sortBy);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchText("");
    fetchOrders(1, "", statusFilter, paymentFilter, sortBy);
  };

  // Handle status filter change
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    fetchOrders(1, searchText, status, paymentFilter, sortBy);
  };

  // Handle payment filter change
  const handlePaymentFilter = (payment: string) => {
    setPaymentFilter(payment);
    fetchOrders(1, searchText, statusFilter, payment, sortBy);
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    fetchOrders(1, searchText, statusFilter, paymentFilter, sort);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchOrders(1, searchText, statusFilter, paymentFilter, sortBy);
  };

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      fetchOrders(
        pagination.page + 1,
        searchText,
        statusFilter,
        paymentFilter,
        sortBy
      );
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchOrders(
        pagination.page - 1,
        searchText,
        statusFilter,
        paymentFilter,
        sortBy
      );
    }
  };

  // Handle order item click to show details
  const handleOrderClick = (orderId: string) => {
    // Corrected navigation to order details
    router.push({
      pathname: "/(orders)/order-details",
      params: { id: orderId },
    });
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
      "₨ " + // Using the proper Rupee symbol instead of "Rs."
      amount.toLocaleString(undefined, {
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

  // Get payment status color
  const getPaymentStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "paid":
        return "#28a745"; // Green
      case "partial":
        return "#ffc107"; // Amber
      case "pending":
        return "#dc3545"; // Red
      default:
        return "#6c757d"; // Gray
    }
  };

  // Toggle sort dropdown
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const toggleSortDropdown = () => {
    setSortDropdownVisible(!sortDropdownVisible);
  };

  // Render order item
  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => handleOrderClick(item.order_id)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>
            Order #{item.order_id.replace(/^O/, "")}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>Order Status: {item.status}</Text>
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
            <FontAwesome5 name="money-bill" size={16} color="#6c757d" />
            <Text style={styles.orderInfoText}>
              {formatCurrency(item.total_amount)}
            </Text>
          </View>

          <View style={styles.orderInfo}>
            <FontAwesome5 name="credit-card" size={14} color="#6c757d" />
            <Text
              style={[
                styles.orderInfoText,
                { color: getPaymentStatusColor(item.payment_status) },
              ]}
            >
              Payment: {item.payment_status}
            </Text>
          </View>
        </View>

        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfo}>
            <FontAwesome5 name="user" size={14} color="#6c757d" />
            <Text style={styles.orderInfoText} numberOfLines={1}>
              {item.sales_rep_name}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Order List</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
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
        <Text style={styles.headerTitle}>Order List</Text>
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

      {/* Filter tabs */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Order Status:</Text>
        <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === item.value && styles.activeFilterButton,
              ]}
              onPress={() => handleStatusFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === item.value && styles.activeFilterText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Payment:</Text>
        <FlatList
          horizontal
          data={paymentOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                paymentFilter === item.value && styles.activeFilterButton,
              ]}
              onPress={() => handlePaymentFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  paymentFilter === item.value && styles.activeFilterText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Results count and sort */}
      <View style={styles.resultsCountContainer}>
        <Text style={styles.resultsCount}>
          {pagination.total} {pagination.total === 1 ? "order" : "orders"} found
        </Text>

        {/* Sort dropdown */}
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={toggleSortDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.sortButtonText}>
              Sort by:{" "}
              {sortOptions.find((option) => option.value === sortBy)?.label ||
                "Newest"}
            </Text>
            <MaterialIcons
              name={sortDropdownVisible ? "arrow-drop-up" : "arrow-drop-down"}
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          {sortDropdownVisible && (
            <View style={styles.sortDropdown}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.activeSortOption,
                  ]}
                  onPress={() => {
                    handleSortChange(option.value);
                    setSortDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.activeSortOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <MaterialIcons
                      name="check"
                      size={16}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Orders list */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={50} color="#ADB5BD" />
          <Text style={styles.emptyText}>
            {searchText || statusFilter !== "all" || paymentFilter !== "all"
              ? "No orders found matching the selected filters."
              : "No orders available."}
          </Text>
          {(searchText ||
            statusFilter !== "all" ||
            paymentFilter !== "all") && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchText("");
                setStatusFilter("all");
                setPaymentFilter("all");
                fetchOrders(1, "", "all", "all", sortBy);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
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
                  activeOpacity={0.7}
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
                  activeOpacity={0.7}
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

      {/* Add new order FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(orders)/order-add")}
        activeOpacity={0.8}
      >
        <AntDesign name="plus" size={24} color={COLORS.light} />
      </TouchableOpacity>

      {/* Bottom padding for root navigation */}
      <View style={{ height: 70 }} />
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
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    // Fix padding to account for status bar height
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.light,
    textAlign: "center",
    flex: 1,
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
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginRight: 10,
    width: 85,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E9ECEF",
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.dark,
  },
  activeFilterText: {
    color: COLORS.light,
  },
  resultsCountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  sortContainer: {
    position: "relative",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  sortButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
    marginRight: 2,
  },
  sortDropdown: {
    position: "absolute",
    top: 30,
    right: 0,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    width: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeSortOption: {
    backgroundColor: "#F1F3F5",
  },
  sortOptionText: {
    fontSize: 13,
    color: COLORS.dark,
  },
  activeSortOptionText: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  orderList: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
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
    flexShrink: 1, // Allow container to shrink if needed
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
    marginRight: 10,
    flexShrink: 1, // Allow text to shrink
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
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
    flexWrap: "nowrap", // Prevent wrapping
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    minWidth: 0, // Allow text to be truncated
  },
  orderInfoText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 6,
    flex: 1,
    flexShrink: 1, // Allow text to shrink
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
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
