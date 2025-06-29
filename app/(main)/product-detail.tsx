// Import necessary components and libraries from React, React Native, and Expo.
import {
  Feather,
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
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import custom hooks, services, and theme configuration.
import { useAuth } from "../context/AuthContext"; // Import useAuth hook
import { getProductById } from "../services/productApi";
import { COLORS } from "../theme/colors";

// Define the TypeScript interface for a single batch of a product.
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
  initial_quantity: number;
  received_date: string;
}

// Define the TypeScript interface for a product, including optional batches and current stock.
interface Product {
  product_id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  unit_price: number;
  reorder_level: number;
  is_company_product: number;
  is_active: number;
  batches?: Batch[];
  current_stock?: number;
}

// Define the main component for the product detail screen.
export default function ProductDetailScreen() {
  const { hasPermission } = useAuth(); // Get hasPermission from auth context
  // Get the product ID from the navigation parameters.
  const { id } = useLocalSearchParams<{ id: string }>();

  // useEffect hook to check for user permissions when the component mounts.
  useEffect(() => {
    if (!hasPermission("view_products")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to view product details.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // State variables for managing product data, loading status, and active tab.
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Placeholder image for products that do not have a specific image.
  const placeholderImage = require("../assets/placeholder.png");

  // Helper function to format a price value into a string with two decimal places.
  const formatPrice = (price: number | string | null | undefined) => {
    // Handle undefined, null, string, or non-numeric values
    if (price === undefined || price === null) return "0.00";

    // Convert string to number if needed
    const numPrice = typeof price === "string" ? parseFloat(price) : price;

    // Check if it's a valid number
    if (isNaN(numPrice)) return "0.00";

    // Format with 2 decimal places
    return numPrice.toFixed(2);
  };

  // useEffect hook to fetch product data when the component mounts or the ID changes.
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);

        // Fetch product details from the API.
        const productData = await getProductById(id!);
        setProduct(productData as Product);
      } catch (error) {
        console.error("Error fetching product:", error);
        Alert.alert("Error", "Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProductData();
    }
  }, [id]);

  // Helper function to format a date string into a more readable format.
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to check if a product's stock is below its reorder level.
  const isLowStock = (product: Product) => {
    const totalStock =
      product.batches?.reduce(
        (total, batch) => total + batch.current_quantity,
        0
      ) || 0;
    return totalStock < (product.reorder_level || 0) && totalStock > 0;
  };

  // Function to determine the color for the stock status indicator based on stock levels.
  const getStockStatusColor = (product: Product) => {
    const totalStock =
      product.batches?.reduce(
        (total, batch) => total + batch.current_quantity,
        0
      ) || 0;

    if (totalStock === 0) return "#E74C3C"; // Out of stock
    if (totalStock < (product.reorder_level || 0)) return "#F39C12"; // Low stock
    return "#2ECC71"; // Normal stock
  };

  // Function to determine the color for a batch's status based on its expiry date.
  const getBatchStatusColor = (batch: Batch) => {
    if (!batch.expiry_date) return "#2ECC71"; // No expiry date, assume active

    const now = new Date();
    const expiryDate = new Date(batch.expiry_date);

    if (expiryDate < now) {
      return "#E74C3C"; // Expired
    }

    // Check if expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate <= thirtyDaysFromNow) {
      return "#F39C12"; // Expiring soon
    }

    return "#2ECC71"; // Active
  };

  // Function to render the content of the "Overview" tab.
  const renderOverviewTab = () => {
    if (!product) return null;

    // Calculate stock status
    const totalStock =
      product.batches?.reduce(
        (total, batch) => total + batch.current_quantity,
        0
      ) || 0;

    const stockStatus =
      totalStock === 0
        ? "Out of Stock"
        : totalStock < (product.reorder_level || 0)
        ? "Low Stock"
        : "In Stock";

    const stockStatusColor = getStockStatusColor(product);

    return (
      <View style={styles.tabContent}>
        {/* Stock Summary Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={24}
                  color={COLORS.light}
                />
              </View>
              <View style={styles.summaryInfo}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Current Stock</Text>
                  <View
                    style={[
                      styles.stockBadge,
                      {
                        backgroundColor: `${stockStatusColor}20`,
                        borderColor: stockStatusColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stockStatusDot,
                        { backgroundColor: stockStatusColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stockStatusText,
                        { color: stockStatusColor },
                      ]}
                    >
                      {stockStatus}
                    </Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalStock}</Text>
                    <Text style={styles.statLabel}>Current</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {product.reorder_level || 0}
                    </Text>
                    <Text style={styles.statLabel}>Minimum</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {product.batches?.length || 0}
                    </Text>
                    <Text style={styles.statLabel}>Batches</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Item Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product ID</Text>
              <Text style={styles.detailValue}>{product.product_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {product.category_name || "Uncategorized"}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Unit Price</Text>
              <Text style={styles.detailValue}>
                Rs. {formatPrice(product.unit_price)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company Product</Text>
              <Text style={styles.detailValue}>
                {product.is_company_product ? "Yes" : "No"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Active</Text>
              <Text style={styles.detailValue}>
                {product.is_active ? "Yes" : "No"}
              </Text>
            </View>
            {/* Display product description if available */}
            {product.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>
                  {product.description}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Function to render the content of the "Batches" tab, displaying a list of product batches.
  const renderBatchesTab = () => {
    if (!product || !product.batches) return null;

    return (
      <View style={styles.tabContent}>
        <FlatList
          data={product.batches}
          keyExtractor={(batch) => batch.batch_id}
          renderItem={({ item: batch }) => (
            <View style={styles.batchCard}>
              <View style={styles.batchHeader}>
                <View style={styles.batchIdContainer}>
                  <Text style={styles.batchId}>{batch.batch_number}</Text>
                  {/* Batch status badge with dynamic color */}
                  <View
                    style={[
                      styles.batchStatusBadge,
                      {
                        backgroundColor: `${getBatchStatusColor(batch)}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.batchStatusText,
                        { color: getBatchStatusColor(batch) },
                      ]}
                    >
                      {/* Logic to display batch status text */}
                      {!batch.expiry_date
                        ? "Active"
                        : new Date(batch.expiry_date) < new Date()
                        ? "Expired"
                        : new Date(batch.expiry_date) <
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? "Expiring Soon"
                        : "Active"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.batchQuantity}>
                  {batch.current_quantity} units
                </Text>
              </View>

              {/* Detailed information about the batch */}
              <View style={styles.batchDetails}>
                <View style={styles.batchDetailRow}>
                  <View style={styles.batchDetailItem}>
                    <MaterialIcons
                      name="date-range"
                      size={16}
                      color="#6c757d"
                      style={styles.batchDetailIcon}
                    />
                    <View>
                      <Text style={styles.batchDetailLabel}>
                        Manufacturing Date
                      </Text>
                      <Text style={styles.batchDetailValue}>
                        {formatDate(batch.manufacturing_date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.batchDetailItem}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={16}
                      color={getBatchStatusColor(batch)}
                      style={styles.batchDetailIcon}
                    />
                    <View>
                      <Text style={styles.batchDetailLabel}>Expiry Date</Text>
                      <Text
                        style={[
                          styles.batchDetailValue,
                          {
                            color: getBatchStatusColor(batch),
                          },
                        ]}
                      >
                        {formatDate(batch.expiry_date)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Supplier information */}
                <View style={styles.batchSupplierRow}>
                  <MaterialCommunityIcons
                    name="warehouse"
                    size={16}
                    color={COLORS.secondary}
                    style={styles.batchDetailIcon}
                  />
                  <View>
                    <Text style={styles.batchDetailLabel}>Supplier</Text>
                    <Text style={styles.batchDetailValue}>
                      {batch.supplier_name}
                    </Text>
                  </View>
                </View>

                {/* Cost information */}
                <View style={styles.batchCostRow}>
                  <MaterialIcons
                    name="attach-money"
                    size={16}
                    color="#6c757d"
                    style={styles.batchDetailIcon}
                  />
                  <View>
                    <Text style={styles.batchDetailLabel}>Unit Cost</Text>
                    <Text style={styles.batchDetailValue}>
                      Rs. {formatPrice(batch.cost_price)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress bar indicating the remaining quantity of the batch */}
              <View style={styles.batchProgressContainer}>
                <View style={styles.batchProgress}>
                  <View
                    style={[
                      styles.batchProgressFill,
                      {
                        width: `${Math.min(
                          100,
                          (batch.current_quantity /
                            (batch.initial_quantity || 1)) *
                            100
                        )}%`,
                        backgroundColor:
                          batch.current_quantity === 0
                            ? "#FF6B6B"
                            : batch.current_quantity <
                              (batch.initial_quantity || 1) * 0.2
                            ? "#FFD166"
                            : "#06D6A0",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.batchProgressText}>
                  {batch.current_quantity} / {batch.initial_quantity || 0} units
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.batchesContainer}
          showsVerticalScrollIndicator={false}
          // Component to display when there are no batches
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="package-variant"
                size={60}
                color="#CED4DA"
              />
              <Text style={styles.emptyText}>No batches found</Text>
            </View>
          }
        />
      </View>
    );
  };

  // Conditional rendering for the loading state.
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Conditional rendering for when the product is not found.
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <MaterialIcons name="error-outline" size={60} color="#ADB5BD" />
          <Text style={styles.notFoundText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backToProductsButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToProductsText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main render method for the component.
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header section with back button, title, and edit button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            router.push({
              pathname: "../(main)/product-edit",
              params: { id: product.product_id },
            });
          }}
        >
          <Feather name="edit-2" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab bar for switching between "Overview" and "Batches" views */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "overview" && styles.activeTabText,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "batches" && styles.activeTab]}
          onPress={() => setActiveTab("batches")}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabText,
                activeTab === "batches" && styles.activeTabText,
              ]}
            >
              Batches
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {product.batches?.length || 0}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Renders the content of the active tab */}
      {activeTab === "overview" && renderOverviewTab()}
      {activeTab === "batches" && renderBatchesTab()}
    </SafeAreaView>
  );
}

// StyleSheet for the component, defining all the styles used in the layout.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: COLORS.light,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.dark,
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
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
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 10,
    marginBottom: 20,
  },
  backToProductsButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backToProductsText: {
    color: COLORS.light,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  tab: {
    paddingVertical: 14,
    marginRight: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6c757d",
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabBadge: {
    backgroundColor: "#F1F3F5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    fontSize: 10,
    color: "#6c757d",
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  statDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "#DEE2E6",
    alignSelf: "center",
  },
  detailsCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  categoryBadge: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
  batchesContainer: {
    paddingBottom: 85,
  },
  batchCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  batchIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  batchId: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginRight: 10,
  },
  batchStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batchStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  batchQuantity: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  batchDetails: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  batchDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  batchDetailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  batchDetailIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  batchDetailLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  batchDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  batchSupplierRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  batchCostRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  batchProgressContainer: {
    marginTop: 4,
  },
  batchProgress: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    overflow: "hidden",
  },
  batchProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  batchProgressText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 10,
  },
});
