import {
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
import { getDeliveries } from "../services/driverApi";
import {
  assignDelivery,
  getAllOrders,
  updateDeliveryStatus,
} from "../services/orderApi";
import { COLORS } from "../theme/colors";

// TypeScript interfaces for data types
interface Order {
  order_id: string;
  customer_name: string;
  customer_id: string;
  address: string;
  phone: string;
  order_date: string;
  delivery_date: string | null;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery: Delivery | null;
}

interface Delivery {
  delivery_id: string;
  order_id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_name: string;
  scheduled_date: string;
  delivery_date: string | null;
  status: "scheduled" | "in_progress" | "delivered" | "failed";
  notes: string;
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

export default function DeliveryManagementScreen() {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  // State for assign delivery modal
  const [isAssignModalVisible, setIsAssignModalVisible] =
    useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");

  // State for update status modal
  const [isUpdateStatusModalVisible, setIsUpdateStatusModalVisible] =
    useState<boolean>(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState<string>("");

  // Sample drivers and vehicles data (in real app, fetch from API)
  const drivers: Driver[] = [
    { user_id: "U006", full_name: "Sampath Gunawardena" },
    { user_id: "U007", full_name: "Pradeep Jayasooriya" },
  ];

  const vehicles: Vehicle[] = [
    {
      vehicle_id: "V001",
      name: "Lorry 1",
      registration_number: "UP-CAD-3456",
      status: "available",
    },
    {
      vehicle_id: "V002",
      name: "Lorry 2",
      registration_number: "UP-CBF-7890",
      status: "available",
    },
    {
      vehicle_id: "V003",
      name: "Van",
      registration_number: "UP-CAP-1234",
      status: "maintenance",
    },
  ];

  // Filter tabs for delivery status
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending Delivery" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress" },
    { value: "delivered", label: "Delivered" },
    { value: "failed", label: "Failed" },
  ]; // Fetch orders with delivery information
  const fetchOrders = React.useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // First get all deliveries
      console.log("Fetching deliveries for management");

      // Fetch both deliveries and pending orders that need delivery
      const [deliveriesResponse, ordersResponse] = await Promise.all([
        getDeliveries({}), // Get all deliveries
        getAllOrders({
          // Get pending orders that need delivery assignment
          status: "pending,processing",
          limit: 50,
        }),
      ]);

      // Process deliveries into order format
      const deliveryOrders = deliveriesResponse.map((del: any) => ({
        order_id: del.order_id,
        customer_name: del.customer_name,
        customer_id: del.customer_id,
        address: del.city || "No address",
        phone: "", // May not be in delivery data
        order_date: del.scheduled_date,
        delivery_date: del.delivery_date, // Adding the missing delivery_date property
        total_amount: del.total_amount || 0,
        status: "processing", // If it has a delivery, it's at least processing
        payment_status: "pending", // Default, as we don't have this in delivery data
        delivery: {
          delivery_id: del.delivery_id,
          order_id: del.order_id,
          driver_id: del.driver_id,
          driver_name: del.driver_name,
          vehicle_id: del.vehicle_id,
          vehicle_name: del.vehicle_name,
          scheduled_date: del.scheduled_date,
          delivery_date: del.delivery_date,
          status: del.status,
          notes: del.notes || "",
        },
      })); // Get orders that need delivery assignment
      let pendingOrders: Order[] = [];
      if (ordersResponse) {
        // Handle both types of response formats
        const orderData =
          "data" in ordersResponse ? ordersResponse.data : ordersResponse;
        pendingOrders = (orderData as Order[]).filter(
          (order: Order) => !order.delivery
        );
      }

      // Combine both sets of orders
      const allOrders = [...deliveryOrders, ...pendingOrders];

      console.log(
        `Fetched ${deliveryOrders.length} deliveries and ${pendingOrders.length} pending orders`
      );

      setOrders(allOrders);
      applyFilters(allOrders, searchText, statusFilter);
    } catch (err: any) {
      console.error("Failed to fetch orders/deliveries:", err);
      setError(
        err.message || "Failed to load delivery information. Please try again."
      );

      // Use sample data if API fails
      const sampleOrders: Order[] = [
        {
          order_id: "O1042",
          customer_name: "Beauty Shop Galle",
          customer_id: "C001",
          address: "45, Main Street, Galle",
          phone: "0552222111",
          order_date: new Date().toISOString(),
          delivery_date: null,
          total_amount: 2450,
          status: "processing",
          payment_status: "pending",
          delivery: {
            delivery_id: "D1013",
            order_id: "O1042",
            driver_id: "U006",
            driver_name: "Sampath Gunawardena",
            vehicle_id: "V001",
            vehicle_name: "Lorry 1",
            scheduled_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            delivery_date: null,
            status: "scheduled",
            notes: "",
          },
        },
        {
          order_id: "O1041",
          customer_name: "Herbal Store Colombo",
          customer_id: "C002",
          address: "78, Hospital Road, Colombo",
          phone: "0552223344",
          order_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
          delivery_date: new Date().toISOString(),
          total_amount: 3200,
          status: "delivered",
          payment_status: "paid",
          delivery: {
            delivery_id: "D1012",
            order_id: "O1041",
            driver_id: "U007",
            driver_name: "Pradeep Jayasooriya",
            vehicle_id: "V002",
            vehicle_name: "Lorry 2",
            scheduled_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
            delivery_date: new Date().toISOString(),
            status: "delivered",
            notes: "Delivered on time",
          },
        },
        {
          order_id: "O1039",
          customer_name: "Natural Cosmetics Kandy",
          customer_id: "C003",
          address: "23, Temple Road, Kandy",
          phone: "0552224455",
          order_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          delivery_date: null,
          total_amount: 5750,
          status: "pending",
          payment_status: "pending",
          delivery: null,
        },
      ];

      setOrders(sampleOrders);
      applyFilters(sampleOrders, searchText, statusFilter);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, statusFilter]);

  // Apply filters to orders
  const applyFilters = (
    ordersToFilter: Order[],
    search: string,
    status: string
  ) => {
    let filtered = [...ordersToFilter];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (order) =>
          order.order_id.toLowerCase().includes(search.toLowerCase()) ||
          order.customer_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status !== "all") {
      if (status === "pending") {
        // Orders with no delivery assigned
        filtered = filtered.filter((order) => !order.delivery);
      } else {
        // Orders with delivery status matching filter
        filtered = filtered.filter(
          (order) => order.delivery && order.delivery.status === status
        );
      }
    }

    setFilteredOrders(filtered);
  };

  // Handle search
  const handleSearch = () => {
    applyFilters(orders, searchText, statusFilter);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchText("");
    applyFilters(orders, "", statusFilter);
  };

  // Handle status filter change
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    applyFilters(orders, searchText, status);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchOrders();
  };

  // Handle assigning delivery for an order
  const openAssignDeliveryModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedDriver("");
    setSelectedVehicle("");
    setScheduledDate(getTomorrowDate());
    setDeliveryNotes("");
    setIsAssignModalVisible(true);
  };

  // Get tomorrow's date formatted as YYYY-MM-DD
  const getTomorrowDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // Handle assign delivery submission
  const handleAssignDelivery = async () => {
    if (
      !selectedOrder ||
      !selectedDriver ||
      !selectedVehicle ||
      !scheduledDate
    ) {
      Alert.alert(
        "Missing Information",
        "Please complete all required fields."
      );
      return;
    }

    try {
      setIsAssignModalVisible(false);
      setLoading(true);

      const deliveryData = {
        driver_id: selectedDriver,
        vehicle_id: selectedVehicle,
        scheduled_date: scheduledDate,
        notes: deliveryNotes,
      };

      console.log(
        `Assigning delivery for order ${selectedOrder.order_id}:`,
        deliveryData
      );

      const response = await assignDelivery(
        selectedOrder.order_id,
        deliveryData
      );
      console.log("Delivery assigned successfully:", response);

      Alert.alert("Success", "Delivery assigned successfully", [
        { text: "OK", onPress: fetchOrders },
      ]);
    } catch (err: any) {
      console.error("Failed to assign delivery:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to assign delivery. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Open update delivery status modal
  const openUpdateStatusModal = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setNewStatus(delivery.status);
    setStatusNotes("");
    setIsUpdateStatusModalVisible(true);
  };
  // Handle update delivery status
  const handleUpdateDeliveryStatus = async () => {
    if (!selectedDelivery || !newStatus) {
      Alert.alert("Error", "Please select a new status.");
      return;
    }

    try {
      setIsUpdateStatusModalVisible(false);
      setLoading(true);

      const statusData = {
        status: newStatus,
        notes: statusNotes,
      };

      console.log(
        `Updating delivery status for ${selectedDelivery.delivery_id}:`,
        statusData
      );

      // Show specific message based on the status change
      let successMessage = "Delivery status updated successfully";
      if (newStatus === "delivered") {
        successMessage =
          "Delivery marked as delivered. Order status has been updated automatically.";
      } else if (newStatus === "failed") {
        successMessage =
          "Delivery marked as failed. Order has been reset to processing status.";
      }

      const response = await updateDeliveryStatus(
        selectedDelivery.delivery_id,
        statusData
      );
      console.log("Delivery status updated successfully:", response);

      Alert.alert("Success", successMessage, [
        { text: "OK", onPress: fetchOrders },
      ]);
    } catch (err: any) {
      console.error("Failed to update delivery status:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to update status. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not scheduled";

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
      const isInPast = date < now;
      // Yesterday or Tomorrow
      return isInPast ? "Yesterday" : "Tomorrow";
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

  // Get delivery status color
  const getDeliveryStatusColor = (status: string | undefined): string => {
    if (!status) return "#6c757d"; // Gray for no delivery

    switch (status) {
      case "scheduled":
        return "#007bff"; // Blue
      case "in_progress":
        return "#ffc107"; // Amber
      case "delivered":
        return "#28a745"; // Green
      case "failed":
        return "#dc3545"; // Red
      default:
        return "#6c757d"; // Gray
    }
  };

  // Get delivery status text
  const getDeliveryStatusText = (order: Order): string => {
    if (!order.delivery) return "Pending Delivery";

    switch (order.delivery.status) {
      case "scheduled":
        return "Scheduled";
      case "in_progress":
        return "In Progress";
      case "delivered":
        return "Delivered";
      case "failed":
        return "Failed";
      default:
        return order.delivery.status;
    }
  }; // Initial data load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Render delivery item
  const renderDeliveryItem = ({ item }: { item: Order }) => (
    <View style={styles.deliveryCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>
            Order #{item.order_id.replace(/^O/, "")}
          </Text>
          <Text style={styles.orderDate}>{formatDate(item.order_date)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getDeliveryStatusColor(item.delivery?.status) },
          ]}
        >
          <Text style={styles.statusText}>{getDeliveryStatusText(item)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <MaterialCommunityIcons name="store" size={16} color="#6c757d" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Customer</Text>
            <Text style={styles.detailValue}>{item.customer_name}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="location" size={16} color="#6c757d" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {item.address || "No address provided"}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <FontAwesome5 name="money-bill-wave" size={14} color="#6c757d" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.total_amount)}
            </Text>
          </View>
        </View>

        {item.delivery && (
          <>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="user" size={14} color="#6c757d" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Driver</Text>
                <Text style={styles.detailValue}>
                  {item.delivery.driver_name}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialCommunityIcons
                  name="truck"
                  size={16}
                  color="#6c757d"
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>
                  {item.delivery.vehicle_name}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="event" size={16} color="#6c757d" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Scheduled For</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.delivery.scheduled_date)}
                </Text>
              </View>
            </View>

            {item.delivery.status === "delivered" && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#28a745"
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Delivered On</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(item.delivery.delivery_date)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.cardActions}>
        {!item.delivery ? (
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => openAssignDeliveryModal(item)}
          >
            <MaterialIcons
              name="add-circle-outline"
              size={18}
              color={COLORS.light}
            />
            <Text style={styles.assignButtonText}>Assign Delivery</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: "#007bff", flex: 1 },
              ]}
              onPress={() => openUpdateStatusModal(item.delivery!)}
            >
              <MaterialIcons name="update" size={16} color={COLORS.light} />
              <Text style={styles.actionButtonText}>Update Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // Initialize component
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Management</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading delivery information...
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
        <Text style={styles.headerTitle}>Delivery Management</Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                statusFilter === option.value && styles.activeFilterButton,
              ]}
              onPress={() => handleStatusFilter(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === option.value && styles.activeFilterText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results count */}
      <View style={styles.resultsCountContainer}>
        <Text style={styles.resultsCount}>
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"} found
        </Text>
      </View>

      {/* Delivery list */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="local-shipping" size={50} color="#ADB5BD" />
          <Text style={styles.emptyText}>
            {searchText || statusFilter !== "all"
              ? "No deliveries found matching the selected filters."
              : "No deliveries available."}
          </Text>
          {(searchText || statusFilter !== "all") && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchText("");
                setStatusFilter("all");
                applyFilters(orders, "", "all");
              }}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderDeliveryItem}
          keyExtractor={(item) => item.order_id}
          contentContainerStyle={styles.deliveryList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Assign Delivery Modal */}
      <Modal
        visible={isAssignModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Delivery</Text>
              <TouchableOpacity onPress={() => setIsAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {selectedOrder && (
                <View style={styles.orderInfoContainer}>
                  <Text style={styles.orderInfoTitle}>
                    Order #{selectedOrder.order_id.replace(/^O/, "")}
                  </Text>
                  <Text style={styles.orderInfoSubtitle}>
                    {selectedOrder.customer_name}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Select Driver</Text>
              <View style={styles.pickerContainer}>
                {drivers.map((driver) => (
                  <TouchableOpacity
                    key={driver.user_id}
                    style={[
                      styles.pickerOption,
                      selectedDriver === driver.user_id &&
                        styles.pickerOptionSelected,
                    ]}
                    onPress={() => setSelectedDriver(driver.user_id)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedDriver === driver.user_id &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {driver.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Select Vehicle</Text>
              <View style={styles.pickerContainer}>
                {vehicles
                  .filter((vehicle) => vehicle.status === "available")
                  .map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.vehicle_id}
                      style={[
                        styles.pickerOption,
                        selectedVehicle === vehicle.vehicle_id &&
                          styles.pickerOptionSelected,
                      ]}
                      onPress={() => setSelectedVehicle(vehicle.vehicle_id)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          selectedVehicle === vehicle.vehicle_id &&
                            styles.pickerOptionTextSelected,
                        ]}
                      >
                        {vehicle.name} - {vehicle.registration_number}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <Text style={styles.inputLabel}>Scheduled Date</Text>
              <TextInput
                style={styles.textInput}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
                placeholder="Any special instructions..."
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAssignModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAssignDelivery}
                disabled={!selectedDriver || !selectedVehicle || !scheduledDate}
              >
                <Text style={styles.submitButtonText}>Assign Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        visible={isUpdateStatusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsUpdateStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Delivery Status</Text>
              <TouchableOpacity
                onPress={() => setIsUpdateStatusModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {selectedDelivery && (
                <View style={styles.orderInfoContainer}>
                  <Text style={styles.orderInfoTitle}>
                    Delivery #{selectedDelivery.delivery_id.replace(/^D/, "")}
                  </Text>
                  <Text style={styles.orderInfoSubtitle}>
                    Order #{selectedDelivery.order_id.replace(/^O/, "")}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>New Status</Text>
              <View style={styles.pickerContainer}>
                {["scheduled", "in_progress", "delivered", "failed"].map(
                  (status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.pickerOption,
                        newStatus === status && styles.pickerOptionSelected,
                      ]}
                      onPress={() => setNewStatus(status)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          newStatus === status &&
                            styles.pickerOptionTextSelected,
                        ]}
                      >
                        {status === "scheduled"
                          ? "Scheduled"
                          : status === "in_progress"
                          ? "In Progress"
                          : status === "delivered"
                          ? "Delivered"
                          : "Failed"}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>Status Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={statusNotes}
                onChangeText={setStatusNotes}
                placeholder="Add any notes about the status update..."
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsUpdateStatusModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleUpdateDeliveryStatus}
              >
                <Text style={styles.submitButtonText}>Update Status</Text>
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
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingRight: 16,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  deliveryList: {
    padding: 16,
    paddingBottom: 80, // Increased padding to prevent content from being cut off by bottom navigation
  },
  deliveryCard: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
  },
  orderDate: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
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
  cardContent: {
    padding: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  detailIcon: {
    width: 24,
    justifyContent: "flex-start",
    alignItems: "center",
    marginRight: 8,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.dark,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f3f5",
    marginVertical: 10,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
    padding: 12,
  },
  assignButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 6,
  },
  assignButtonText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: COLORS.light,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  modalContent: {
    padding: 16,
  },
  orderInfoContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  orderInfoSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(125, 164, 83, 0.05)",
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  pickerOptionTextSelected: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 16,
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    marginLeft: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.light,
  },
});
