import {
  AntDesign,
  Feather,
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
import { getCategories, getProducts } from "../services/productApi";
import { COLORS } from "../theme/colors";

// Define the product types
interface Batch {
  batch_id: string;
  batch_number: string;
  current_quantity: number;
  expiry_date: string | null;
  supplier_name: string;
}

interface Product {
  product_id: string;
  name: string;
  unit_price: number | string; // Handle potential string values
  category_name: string;
  category_id: string;
  description?: string;
  current_stock: number;
  reorder_level: number;
  is_company_product: number;
  batches?: Batch[];
  batch_count?: number; // To handle the batch count returned by controller
  next_expiry?: string | null; // To handle the next expiry date
}

export default function ProductsScreen() {
  const { hasPermission } = useAuth(); // Get permission check function
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<
    {
      category_id: string;
      name: string;
    }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has permission to view products
  useEffect(() => {
    if (!hasPermission("view_products")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access products.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Fetch products and categories on component mount
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
  }, [searchQuery, selectedCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories first
      const categoriesData = await getCategories();
      setCategories([{ category_id: "", name: "All" }, ...categoriesData]);

      // Fetch products with filters
      const filters = {
        search: searchQuery,
        category: selectedCategory,
        active: "true",
      };

      console.log("Fetching products with filters:", filters);
      const productsData = await getProducts(filters);
      console.log(`Retrieved ${productsData.length} products`);

      // Log a sample product to verify batch data structure
      if (productsData.length > 0) {
        console.log(
          "Sample product batch data:",
          productsData[0].batches
            ? `${productsData[0].batches.length} batches`
            : "No batches"
        );
      }

      setProducts(productsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load products. Please try again.");
      Alert.alert("Error", "Failed to load products. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const navigateToProductDetail = (product: Product) => {
    router.push({
      pathname: "/(main)/product-detail",
      params: { id: product.product_id },
    });
  };

  const handleAddNewProduct = () => {
    router.push("/(main)/product-add");
  };

  // Check if an item is low in stock
  const isLowStock = (item: Product) => {
    return item.current_stock < item.reorder_level && item.current_stock > 0;
  };

  // Get stock status color
  const getStockStatusColor = (item: Product) => {
    if (item.current_stock <= 0) return "#E74C3C"; // Out of stock
    if (isLowStock(item)) return "#F39C12"; // Low stock
    return "#2ECC71"; // Normal stock
  };

  // Render product card in list view
  const renderListItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => navigateToProductDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeaderRow}>
        <View style={styles.nameContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>
            {item.category_name || "Uncategorized"}
          </Text>
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
            {item.current_stock <= 0
              ? "Out of Stock"
              : isLowStock(item)
              ? "Low Stock"
              : "In Stock"}
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
            {item.current_stock} units
          </Text>
        </View>

        <View style={styles.stockInfoItem}>
          <Text style={styles.stockInfoLabel}>Minimum Level</Text>
          <Text style={styles.stockInfoValue}>{item.reorder_level} units</Text>
        </View>
      </View>

      {/* If we have batch information, show it */}
      {(item.batches && item.batches.length > 0) ||
      (item.batch_count && item.batch_count > 0) ? (
        <View style={styles.batchInfoRow}>
          <View style={styles.batchCount}>
            <MaterialCommunityIcons
              name="package-variant"
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.batchCountText}>
              {item.batch_count || (item.batches ? item.batches.length : 0)}
              {item.batch_count === 1 ||
              (item.batches && item.batches.length === 1)
                ? "batch"
                : "batches"}
            </Text>
          </View>

          {/* Show expiry info if available */}
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
    </TouchableOpacity>
  );

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

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>Welcome to</Text>
            <Text style={styles.headerTitle}>Product Catalog</Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Welcome to</Text>
          <Text style={styles.headerTitle}>Product Catalog</Text>
        </View>
      </View>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Feather
              name="search"
              size={20}
              color="#ADB5BD"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
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

          {/* Only users with manage_products permission can see this button */}
          {hasPermission("manage_products") && (
            <TouchableOpacity
              style={styles.addProductButton}
              onPress={handleAddNewProduct}
            >
              <AntDesign name="plus" size={20} color={COLORS.light} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Tabs */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.category_id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.category_id
                    ? styles.selectedCategoryButton
                    : null,
                ]}
                onPress={() => setSelectedCategory(category.category_id)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category.category_id
                      ? styles.selectedCategoryButtonText
                      : null,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {products.length} {products.length === 1 ? "product" : "products"}
            found
          </Text>
        </View>

        {/* Product List */}
        <FlatList
          data={products}
          renderItem={renderListItem}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={60} color="#CED4DA" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      </View>
      {/* Add Product FAB - Only shown to users with manage_products permission */}
      {hasPermission("manage_products") && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleAddNewProduct}
        >
          <Feather name="plus" size={24} color={COLORS.light} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.light,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  addProductButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  categoriesContainer: {
    backgroundColor: COLORS.light,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoriesScrollContent: {
    paddingHorizontal: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  selectedCategoryButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  selectedCategoryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "#6C757D",
  },

  // List View Styles
  listContainer: {
    paddingBottom: 80,
  },
  listCard: {
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

  // Empty and Loading States
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
});
