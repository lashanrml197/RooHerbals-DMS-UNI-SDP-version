import {
  Feather,
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
import { useAuth } from "../context/AuthContext"; // Import auth context
import { COLORS } from "../theme/colors";

// Import API functions from supplierApi.js
import {
  adjustBatchQuantity,
  getInventoryItems,
  getInventoryStats,
} from "../services/supplierApi";

interface Batch {
  batch_id: string;
  batch_number: string;
  current_quantity: number;
  manufacturing_date: string | null;
  expiry_date: string | null;
  supplier_name: string;
  supplier_id: string;
  cost_price: number;
  selling_price: number;
}

interface Product {
  product_id: string;
  name: string;
  category_name: string;
  category_id: string;
  total_stock: number;
  reorder_level: number;
  unit_price: number;
  next_expiry: string | null;
  batch_count: number;
  batches: Batch[];
}

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringItems: number;
}

export default function InventoryScreen() {
  const { hasPermission } = useAuth(); // Get permission check function

  // Check if user has permission to view inventory
  useEffect(() => {
    if (!hasPermission("view_inventory")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access inventory.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    expiringItems: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStock, setFilterStock] = useState("All Stock");

  // Fetch inventory data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch inventory stats from API
      console.log("Fetching inventory stats...");
      const statsData = await getInventoryStats();
      console.log("Inventory stats:", statsData);
      setStats(statsData);

      // Fetch inventory items with filters
      const filters: any = {};
      if (filterStock === "Low Stock") filters.status = "Low Stock";
      if (filterStock === "Out of Stock") filters.status = "Out of Stock";
      if (filterStock === "Expiring Soon") filters.status = "Expiring Soon";
      if (searchQuery) filters.search = searchQuery;

      console.log("Fetching inventory items with filters:", filters);
      const productsData = await getInventoryItems(filters);
      console.log(`Retrieved ${productsData.length} products`);
      setInventory(productsData);
    } catch (err: any) {
      console.error("Error fetching inventory data:", err);
      setError(err.message || "Failed to fetch inventory data");

      // Keep previous data in case of error
      if (inventory.length === 0) {
        // Use sample data if this is the first load
        setInventory(sampleInventory);
        setStats({
          totalItems: 6,
          lowStockItems: 2,
          outOfStockItems: 1,
          expiringItems: 1,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);

  // Refresh when filters change
  useEffect(() => {
    if (!loading) {
      const delaySearch = setTimeout(() => {
        fetchData();
      }, 500);

      return () => clearTimeout(delaySearch);
    }
  }, [filterStock, searchQuery]);

  // Handle refreshing
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Handle navigation to inventory item details
  const handleSelectItem = (item: Product) => {
    router.push({
      pathname: "../(suppliers)/inventory-product",
      params: { id: item.product_id },
    });
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if an item is low in stock
  const isLowStock = (item: Product) => {
    return item.total_stock < item.reorder_level && item.total_stock > 0;
  };

  // Get stock status color - FIXED to handle negative values
  const getStockStatusColor = (item: Product) => {
    if (item.total_stock <= 0) return "#E74C3C"; // Out of stock (includes negative stock)
    if (isLowStock(item)) return "#F39C12"; // Low stock
    return "#2ECC71"; // Normal stock
  };

  // Get stock status text - FIXED to handle negative values
  const getStockStatusText = (item: Product) => {
    if (item.total_stock <= 0) return "Out of Stock"; // Out of stock (includes negative stock)
    if (isLowStock(item)) return "Low Stock";
    return "In Stock";
  };

  // Handle adjust stock
  const handleAdjustStock = (product: Product) => {
    if (!product.batches || product.batches.length === 0) {
      Alert.alert("No Batches", "This product has no active batches to adjust");
      return;
    }

    // If only one batch, use it directly
    if (product.batches.length === 1) {
      promptQuantityAdjustment(product.batches[0], product.name);
      return;
    }

    // If multiple batches, let user select which one
    Alert.alert(
      "Select Batch",
      "Which batch would you like to adjust?",
      product.batches.map((batch) => ({
        text: `${batch.batch_number} (${batch.current_quantity} units)`,
        onPress: () => promptQuantityAdjustment(batch, product.name),
      })),
      { cancelable: true }
    );
  };

  // Prompt for quantity adjustment
  const promptQuantityAdjustment = (batch: Batch, productName: string) => {
    Alert.prompt(
      "Adjust Stock",
      `Enter adjustment amount for ${productName} batch ${batch.batch_number} (current: ${batch.current_quantity}).\nUse positive number to add or negative to subtract.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Adjust",
          onPress: (amount) => {
            if (!amount) return;

            const adjustment = parseInt(amount, 10);
            if (isNaN(adjustment)) {
              Alert.alert("Invalid Input", "Please enter a valid number");
              return;
            }

            // Prevent negative stock
            if (batch.current_quantity + adjustment < 0) {
              Alert.alert(
                "Invalid Adjustment",
                "Adjustment would result in negative stock"
              );
              return;
            }

            Alert.prompt(
              "Reason",
              "Please provide a reason for this adjustment",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Confirm",
                  onPress: async (reason) => {
                    try {
                      await adjustBatchQuantity(
                        batch.batch_id,
                        adjustment,
                        reason || "Manual adjustment"
                      );
                      Alert.alert(
                        "Success",
                        "Stock quantity adjusted successfully"
                      );
                      fetchData(); // Refresh data
                    } catch (err: any) {
                      Alert.alert(
                        "Error",
                        err.message || "Failed to adjust stock"
                      );
                    }
                  },
                },
              ],
              "plain-text"
            );
          },
        },
      ],
      "plain-text"
    );
  };

  // Render list item
  const renderListItem = ({ item }: { item: Product }) => {
    return (
      <TouchableOpacity
        style={styles.listItemCard}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeaderRow}>
          <View style={styles.nameContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category_name}</Text>
          </View>

          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor: `${getStockStatusColor(item)}20`,
                borderColor: getStockStatusColor(item),
              },
            ]}
          >
            <View
              style={[
                styles.stockStatusDot,
                { backgroundColor: getStockStatusColor(item) },
              ]}
            />
            <Text
              style={[
                styles.stockStatusText,
                { color: getStockStatusColor(item) },
              ]}
            >
              {getStockStatusText(item)}
            </Text>
          </View>
        </View>
        <View style={styles.stockInfoRow}>
          <View style={styles.stockInfoItem}>
            <Text style={styles.stockInfoLabel}>Total Stock</Text>
            <Text
              style={[
                styles.stockInfoValue,
                { color: getStockStatusColor(item) },
              ]}
            >
              {item.total_stock} units
            </Text>
          </View>

          <View style={styles.stockInfoItem}>
            <Text style={styles.stockInfoLabel}>Minimum Level</Text>
            <Text style={styles.stockInfoValue}>
              {item.reorder_level} units
            </Text>
          </View>
        </View>
        {item.batch_count > 0 ? (
          <View style={styles.batchInfoRow}>
            <View style={styles.batchCount}>
              <MaterialCommunityIcons
                name="package-variant"
                size={16}
                color={COLORS.secondary}
              />
              <Text style={styles.batchCountText}>
                {item.batch_count}
                {item.batch_count === 1 ? "batch" : "batches"}
              </Text>
            </View>

            {item.next_expiry && (
              <View style={styles.expiryInfo}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={16}
                  color={
                    new Date(item.next_expiry) < new Date()
                      ? "#E74C3C"
                      : new Date(item.next_expiry) <
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      ? "#F39C12"
                      : "#6c757d"
                  }
                />
                <Text
                  style={[
                    styles.expiryText,
                    {
                      color:
                        new Date(item.next_expiry) < new Date()
                          ? "#E74C3C"
                          : new Date(item.next_expiry) <
                            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          ? "#F39C12"
                          : "#6c757d",
                    },
                  ]}
                >
                  {new Date(item.next_expiry) < new Date()
                    ? "Expired"
                    : new Date(item.next_expiry) <
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    ? "Expiring soon"
                    : "Next expiry"}
                  : {formatDate(item.next_expiry)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noBatchContainer}>
            <Text style={styles.noBatchText}>No batches available</Text>
          </View>
        )}
        {/* Action buttons - conditionally shown based on permissions */}
        <View style={styles.actionButtonsRow}>
          {hasPermission("manage_inventory") && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() =>
                router.push({
                  pathname: "../(suppliers)/inventory-batch-add",
                  params: { product_id: item.product_id },
                })
              }
            >
              <Feather name="plus" size={16} color={COLORS.light} />
              <Text style={styles.primaryButtonText}>Add Stock</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Handle stock filter
  const handleStockFilter = (stockStatus: string) => {
    setFilterStock(stockStatus);
  };

  // Show stock filter modal
  const showStockFilter = () => {
    Alert.alert(
      "Filter by Stock Level",
      "Select a stock level",
      [
        { text: "All Stock", onPress: () => handleStockFilter("All Stock") },
        { text: "Low Stock", onPress: () => handleStockFilter("Low Stock") },
        {
          text: "Out of Stock",
          onPress: () => handleStockFilter("Out of Stock"),
        },
        {
          text: "Expiring Soon",
          onPress: () => handleStockFilter("Expiring Soon"),
        },
      ],
      { cancelable: true }
    );
  };

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
          <Text style={styles.headerTitle}>Inventory</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading inventory data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && inventory.length === 0) {
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
          <Text style={styles.headerTitle}>Inventory</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchData()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.spacer} />
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
            placeholder="Search inventory..."
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

        {/* Inventory Stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(52, 100, 145, 0.1)" },
              ]}
            >
              <MaterialCommunityIcons
                name="package-variant"
                size={18}
                color={COLORS.secondary}
              />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.totalItems}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(243, 156, 18, 0.1)" },
              ]}
            >
              <MaterialIcons name="warning" size={18} color="#F39C12" />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.lowStockItems}</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(231, 76, 60, 0.1)" },
              ]}
            >
              <Feather name="x-circle" size={18} color="#E74C3C" />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.outOfStockItems}</Text>
              <Text style={styles.statLabel}>Out of Stock</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: "rgba(243, 156, 18, 0.1)" },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-alert"
                size={18}
                color="#F39C12"
              />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.expiringItems}</Text>
              <Text style={styles.statLabel}>Expiring Soon</Text>
            </View>
          </View>
        </ScrollView>

        {/* Add a clear spacer */}
        <View style={styles.statFilterSpacer} />

        {/* Filter Controls - FIXED position to always be below stats */}
        <View style={styles.controlsContainer}>
          <View style={styles.filtersContainer}>
            {/* Stock Level Filter */}
            <TouchableOpacity
              style={styles.filterButton}
              onPress={showStockFilter}
            >
              <Text style={styles.filterButtonText}>{filterStock}</Text>
              <Feather name="chevron-down" size={16} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {inventory.length} {inventory.length === 1 ? "item" : "items"} found
          </Text>
        </View>

        {/* Inventory List */}
        <FlatList
          data={inventory}
          renderItem={renderListItem}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="package-variant"
                size={60}
                color="#CED4DA"
              />
              <Text style={styles.emptyText}>No inventory items found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      </View>
      {/* Add Product FAB - Only shown for users with manage_products permission */}
      {hasPermission("manage_products") && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => router.push("./(suppliers)/inventory-product-add")}
        >
          <Feather name="plus" size={24} color={COLORS.light} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// Sample inventory data for fallback
const sampleInventory: Product[] = [
  {
    product_id: "P001",
    name: "Herbal Shampoo",
    category_name: "Hair Care",
    category_id: "CAT1",
    total_stock: 145,
    reorder_level: 50,
    unit_price: 350,
    next_expiry: "2025-01-10",
    batch_count: 2,
    batches: [
      {
        batch_id: "B001",
        batch_number: "SHAMPOO-2024-01",
        current_quantity: 45,
        manufacturing_date: "2024-01-15",
        expiry_date: "2025-01-15",
        supplier_name: "Roo Herbals Manufacturing",
        supplier_id: "S001",
        cost_price: 250,
        selling_price: 350,
      },
      {
        batch_id: "B004",
        batch_number: "SHAMPOO-2024-02",
        current_quantity: 100,
        manufacturing_date: "2024-02-15",
        expiry_date: "2025-02-15",
        supplier_name: "Roo Herbals Manufacturing",
        supplier_id: "S001",
        cost_price: 250,
        selling_price: 350,
      },
    ],
  },
  {
    product_id: "P005",
    name: "Face Cream",
    category_name: "Skin Care",
    category_id: "CAT2",
    total_stock: 32,
    reorder_level: 40,
    unit_price: 450,
    next_expiry: "2025-01-15",
    batch_count: 1,
    batches: [
      {
        batch_id: "B007",
        batch_number: "FACE-CREAM-2024-01",
        current_quantity: 32,
        manufacturing_date: "2024-01-15",
        expiry_date: "2025-01-15",
        supplier_name: "Roo Herbals Manufacturing",
        supplier_id: "S001",
        cost_price: 350,
        selling_price: 450,
      },
    ],
  },
  {
    product_id: "P009",
    name: "Body Lotion",
    category_name: "Body Care",
    category_id: "CAT3",
    total_stock: 0,
    reorder_level: 40,
    unit_price: 550,
    next_expiry: null,
    batch_count: 0,
    batches: [],
  },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  statFilterSpacer: {
    height: 8, // Add extra space between stats and filter
    width: "100%",
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
  spacer: {
    width: 40,
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
  statsContainer: {
    paddingRight: 16,
    marginBottom: 24, // Increased margin to create more space
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 120,
    height: 56, // Fixed height for consistency
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  // FIXED: Created separate controlsContainer to ensure proper positioning
  controlsContainer: {
    marginBottom: 16,
    width: "100%",
    marginTop: 8, // Added margin top to push the filter down further from stats
  },
  filtersContainer: {
    flexDirection: "row",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    zIndex: 1, // Ensure filter is above other elements
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.dark,
    marginRight: 6,
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "#6c757d",
  },
  listContainer: {
    paddingBottom: 95,
  },
  fabButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  // List View Styles
  listItemCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 13,
    color: COLORS.secondary,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  stockStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stockInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  stockInfoItem: {
    alignItems: "center",
    flex: 1,
  },
  stockInfoLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  stockInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  batchInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  batchCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  batchCountText: {
    fontSize: 13,
    color: COLORS.secondary,
    marginLeft: 6,
    fontWeight: "500",
  },
  expiryInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryText: {
    fontSize: 13,
    marginLeft: 6,
  },
  noBatchContainer: {
    marginBottom: 14,
  },
  noBatchText: {
    fontSize: 13,
    color: "#6c757d",
    fontStyle: "italic",
  },
  actionButtonsRow: {
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 8,
  },
  primaryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  // Empty and Error States
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
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
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
  },
});
