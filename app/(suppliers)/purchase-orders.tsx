import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";

// Import API functions
import { getPurchaseOrders } from "../services/supplierApi";

interface PurchaseOrder {
  po_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  status: "pending" | "ordered" | "received" | "cancelled";
  supplier_name: string;
  supplier_id: string;
  item_count: number;
  created_by_name: string;
  notes?: string;
  received_items?: number;
}

export default function PurchaseOrdersScreen() {
  const { hasPermission } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Check permission on mount
  useEffect(() => {
    if (!hasPermission("view_suppliers")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to view purchase orders.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      // Prepare filter - REMOVED any supplier filter to prevent errors
      const filters: any = {};
      if (selectedStatus !== "all") {
        filters.status = selectedStatus;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }

      // Call API
      const data = await getPurchaseOrders(filters);
      setPurchaseOrders(data);

      // Log the successful fetch for debugging
      console.log(`Successfully fetched ${data.length} purchase orders`);
    } catch (err: any) {
      console.error("Error fetching purchase orders:", err);
      setError("This feature is not fully implemented yet");
      Alert.alert(
        "Not Implemented",
        "The purchase orders feature is not fully implemented yet.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on initial load and when filters change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [selectedStatus]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2 || searchQuery.length === 0) {
        fetchPurchaseOrders();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F39C12";
      case "ordered":
        return "#3498DB";
      case "received":
        return "#2ECC71";
      case "cancelled":
        return "#E74C3C";
      default:
        return "#95A5A6";
    }
  };

  // Function to format date string
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to handle navigation to purchase order details
  const handleSelectPurchaseOrder = (po: PurchaseOrder) => {
    router.push({
      pathname: "/(suppliers)/purchase-order-detail",
      params: { poId: po.po_id },
    });
  };

  // Function to create a new purchase order
  const handleCreatePurchaseOrder = () => {
    router.push("/(suppliers)/purchase-order-new");
  };

  // Function to handle editing a purchase order
  const handleEditPurchaseOrder = (po: PurchaseOrder) => {
    // Only allow editing purchase orders in 'pending' status
    if (po.status === "pending") {
      router.push({
        pathname: "../(suppliers)/purchase-order-edit",
        params: { poId: po.po_id },
      });
    } else {
      Alert.alert(
        "Cannot Edit",
        "Only purchase orders in 'pending' status can be edited.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPurchaseOrders();
  };

  // Get supplier type icon based on supplier name
  const getSupplierTypeIcon = (supplierName: string) => {
    if (!supplierName) return "help-circle-outline"; // Default icon for unknown supplier

    const lowerCaseName = supplierName.toLowerCase();
    if (lowerCaseName.includes("packaging")) {
      return "package-variant";
    } else if (lowerCaseName.includes("eco")) {
      return "leaf-maple";
    } else if (lowerCaseName.includes("manufacturer")) {
      return "factory";
    } else if (lowerCaseName.includes("distributor")) {
      return "truck-delivery";
    } else {
      return "leaf";
    }
  };

  // Get supplier type text based on supplier name
  const getSupplierType = (supplierName: string) => {
    if (!supplierName) return "Unknown"; // Default type for unknown supplier

    const lowerCaseName = supplierName.toLowerCase();
    if (lowerCaseName.includes("packaging")) {
      return "Packaging";
    } else if (lowerCaseName.includes("eco")) {
      return "Eco-Friendly";
    } else if (lowerCaseName.includes("manufacturer")) {
      return "Manufacturer";
    } else if (lowerCaseName.includes("distributor")) {
      return "Distributor";
    } else {
      return "Raw Materials";
    }
  };

  // Get status description text
  const getStatusDescription = (status: string) => {
    switch (status) {
      case "pending":
        return "Order created, not yet confirmed with supplier";
      case "ordered":
        return "Order confirmed with supplier, awaiting delivery";
      case "received":
        return "Products received from supplier";
      case "cancelled":
        return "Order was cancelled";
      default:
        return "";
    }
  };

  // Render purchase order item
  const renderPurchaseOrderItem = ({ item }: { item: PurchaseOrder }) => (
    <TouchableOpacity
      style={styles.poCard}
      onPress={() => handleSelectPurchaseOrder(item)}
    >
      <View style={styles.poHeader}>
        <View style={styles.poNumberContainer}>
          <Text style={styles.poNumber}>{item.po_id}</Text>
          <Text style={styles.poDate}>{formatDate(item.order_date)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.poSupplierInfo}>
        <View style={styles.supplierIconContainer}>
          <MaterialCommunityIcons
            name={getSupplierTypeIcon(item.supplier_name)}
            size={16}
            color={COLORS.light}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.supplierName}>
            {item.supplier_name || "Unknown Supplier"}
          </Text>
          <Text style={styles.supplierType}>
            {getSupplierType(item.supplier_name)}
          </Text>
        </View>
        {item.status === "pending" && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPurchaseOrder(item)}
          >
            <Feather name="edit-2" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {item.status === "pending" && (
        <View style={styles.statusDescriptionContainer}>
          <Text style={styles.statusDescriptionText}>
            {getStatusDescription(item.status)}
          </Text>
        </View>
      )}

      <View style={styles.poDetails}>
        <View style={styles.poDetailItem}>
          <Text style={styles.poDetailLabel}>Delivery Date</Text>
          <Text style={styles.poDetailValue}>
            {formatDate(item.expected_delivery_date)}
          </Text>
        </View>

        <View style={styles.poDetailItem}>
          <Text style={styles.poDetailLabel}>Items</Text>
          <Text style={styles.poDetailValue}>{item.item_count || 0}</Text>
        </View>

        <View style={styles.poDetailItem}>
          <Text style={styles.poDetailLabel}>Total Amount</Text>
          <Text style={styles.poDetailValue}>
            Rs. {item.total_amount ? item.total_amount.toLocaleString() : "0"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.moreButtonContainer}
        onPress={() => handleSelectPurchaseOrder(item)}
      >
        <Feather name="more-horizontal" size={20} color="#6c757d" />
        <Text style={styles.viewDetailsText}>View Details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Show loading spinner
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Purchase Orders</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreatePurchaseOrder}
          >
            <AntDesign name="plus" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading purchase orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Orders</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreatePurchaseOrder}
        >
          <AntDesign name="plus" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={20}
            color="#ADB5BD"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by supplier name or PO ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#ADB5BD"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#ADB5BD" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filters */}
        <View style={styles.filtersContainer}>
          <ScrollableStatusButtons
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
          />
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {purchaseOrders.length} purchase{" "}
            {purchaseOrders.length === 1 ? "order" : "orders"} found
          </Text>
        </View>

        {/* Error display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchPurchaseOrders}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Purchase Orders List */}
        <FlatList
          data={purchaseOrders}
          renderItem={renderPurchaseOrderItem}
          keyExtractor={(item) => item.po_id}
          contentContainerStyle={styles.poList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={60}
                color="#CED4DA"
              />
              <Text style={styles.emptyText}>No purchase orders found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filter
              </Text>
            </View>
          }
        />

        {/* Create New PO Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePurchaseOrder}
        >
          <AntDesign name="plus" size={24} color={COLORS.light} />
          <Text style={styles.createButtonText}>Create Purchase Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Scrollable status filter buttons component
function ScrollableStatusButtons({
  selectedStatus,
  onSelectStatus,
}: {
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}) {
  const statuses = [
    { key: "all", label: "All Orders" },
    { key: "pending", label: "Pending", color: "#F39C12" },
    { key: "ordered", label: "Ordered", color: "#3498DB" },
    { key: "received", label: "Received", color: "#2ECC71" },
    { key: "cancelled", label: "Cancelled", color: "#E74C3C" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statusButtonsContainer}
    >
      {statuses.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.statusButton,
            selectedStatus === item.key && styles.activeStatusButton,
            selectedStatus === item.key && item.key !== "all"
              ? { backgroundColor: `${item.color}20`, borderColor: item.color }
              : null,
          ]}
          onPress={() => onSelectStatus(item.key)}
        >
          {item.key !== "all" && (
            <View
              style={[styles.statusFilterDot, { backgroundColor: item.color }]}
            />
          )}
          <Text
            style={[
              styles.statusButtonText,
              selectedStatus === item.key && styles.activeStatusButtonText,
              selectedStatus === item.key && item.key !== "all"
                ? { color: item.color }
                : null,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
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
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 0,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.dark,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  statusButtonsContainer: {
    paddingRight: 16,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  statusFilterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeStatusButton: {
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  activeStatusButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "#6c757d",
  },
  poList: {
    paddingBottom: 85, // Space for create button
  },
  poCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  poHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  poNumberContainer: {
    flex: 1,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  poDate: {
    fontSize: 13,
    color: "#6c757d",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  poSupplierInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    borderRadius: 8,
    marginBottom: 12,
  },
  supplierIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 2,
  },
  supplierType: {
    fontSize: 12,
    color: "#6c757d",
  },
  editButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  poDetails: {
    marginBottom: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  poDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  poDetailLabel: {
    fontSize: 13,
    color: "#6c757d",
  },
  poDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dark,
  },
  statusDescriptionContainer: {
    backgroundColor: "rgba(243, 156, 18, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#F39C12",
  },
  statusDescriptionText: {
    fontSize: 12,
    color: "#F39C12",
    fontStyle: "italic",
  },
  moreButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 8,
    textAlign: "center",
  },
  createButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.dark,
    marginTop: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#FFE5E5",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFCCCC",
  },
  errorText: {
    fontSize: 14,
    color: "#CC0000",
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#CC0000",
  },
  retryButtonText: {
    fontSize: 14,
    color: "#CC0000",
    fontWeight: "600",
  },
});
