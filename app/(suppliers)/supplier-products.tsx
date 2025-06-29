import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { COLORS } from "../theme/colors";
import { router, useLocalSearchParams } from "expo-router";
import {
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
  AntDesign,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  unitPrice: number;
  unit: string;
  inStock: boolean;
  stockLevel: number;
  batchInfo?: {
    batchNumber: string;
    manufactured: string;
    expiry: string;
  }[];
  lastOrderDate: string;
  image?: string;
}

export default function SupplierProductsScreen() {
  const params = useLocalSearchParams();
  const { supplierId, supplierName } = params;

  // Mock supplier data
  const supplierData = {
    id: supplierId,
    name: supplierName || "Herbal Extracts Inc.",
    type: "Raw Materials",
  };

  // Mock products data
  const initialProducts: Product[] = [
    {
      id: "1",
      name: "Aloe Vera Extract",
      category: "Raw Material",
      description: "Pure aloe vera extract for skincare products",
      unitPrice: 1500,
      unit: "liter",
      inStock: true,
      stockLevel: 45,
      batchInfo: [
        {
          batchNumber: "B2024-101",
          manufactured: "2024-01-15",
          expiry: "2025-01-14",
        },
        {
          batchNumber: "B2024-102",
          manufactured: "2024-02-20",
          expiry: "2025-02-19",
        },
      ],
      lastOrderDate: "2024-02-15",
    },
    {
      id: "2",
      name: "Coconut Oil",
      category: "Raw Material",
      description: "Cold-pressed virgin coconut oil",
      unitPrice: 1800,
      unit: "liter",
      inStock: true,
      stockLevel: 32,
      batchInfo: [
        {
          batchNumber: "B2024-103",
          manufactured: "2024-01-20",
          expiry: "2025-01-19",
        },
      ],
      lastOrderDate: "2024-02-20",
    },
    {
      id: "3",
      name: "Lavender Essential Oil",
      category: "Raw Material",
      description: "Pure lavender essential oil for fragrance",
      unitPrice: 4500,
      unit: "ml",
      inStock: true,
      stockLevel: 15,
      batchInfo: [
        {
          batchNumber: "B2024-105",
          manufactured: "2024-01-10",
          expiry: "2025-01-09",
        },
      ],
      lastOrderDate: "2024-01-10",
    },
    {
      id: "4",
      name: "Amber Glass Bottles (200ml)",
      category: "Packaging",
      description: "Amber glass bottles for product packaging",
      unitPrice: 120,
      unit: "piece",
      inStock: true,
      stockLevel: 250,
      lastOrderDate: "2024-02-05",
    },
    {
      id: "5",
      name: "Kraft Paper Boxes",
      category: "Packaging",
      description: "Eco-friendly kraft paper boxes",
      unitPrice: 85,
      unit: "piece",
      inStock: true,
      stockLevel: 320,
      lastOrderDate: "2024-02-12",
    },
    {
      id: "6",
      name: "Tea Tree Oil",
      category: "Raw Material",
      description: "Pure tea tree essential oil with antiseptic properties",
      unitPrice: 3800,
      unit: "ml",
      inStock: false,
      stockLevel: 0,
      lastOrderDate: "2023-12-20",
    },
    {
      id: "7",
      name: "Rosemary Extract",
      category: "Raw Material",
      description: "Concentrated rosemary extract for natural preservation",
      unitPrice: 2200,
      unit: "liter",
      inStock: true,
      stockLevel: 8,
      batchInfo: [
        {
          batchNumber: "B2024-109",
          manufactured: "2024-01-05",
          expiry: "2025-01-04",
        },
      ],
      lastOrderDate: "2024-01-25",
    },
  ];

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Get unique categories from products
  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  // Filter products based on search query, category, and stock status
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesStockFilter = !showInStockOnly || product.inStock;
    return matchesSearch && matchesCategory && matchesStockFilter;
  });

  // Format date to string
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Toggle product selection for batch order
  const toggleSelection = (productId: string) => {
    // In a real app, this would toggle selection for batch ordering
    console.log(`Toggling selection for product ${productId}`);
  };

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
        <Text style={styles.headerTitle}>
          Products from {supplierData.name}
        </Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            // In a real app, this would show sort options
            console.log("Sort button pressed");
          }}
        >
          <Feather name="sliders" size={20} color={COLORS.primary} />
        </TouchableOpacity>
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

          <TouchableOpacity
            style={[
              styles.stockFilterButton,
              showInStockOnly && styles.stockFilterButtonActive,
            ]}
            onPress={() => setShowInStockOnly(!showInStockOnly)}
          >
            <MaterialIcons
              name={showInStockOnly ? "check-box" : "check-box-outline-blank"}
              size={20}
              color={showInStockOnly ? COLORS.primary : COLORS.dark}
            />
            <Text
              style={[
                styles.stockFilterText,
                showInStockOnly && styles.stockFilterTextActive,
              ]}
            >
              In Stock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category &&
                      styles.categoryButtonTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "product" : "products"} found
          </Text>
          <TouchableOpacity
            style={styles.batchOrderButton}
            onPress={() =>
              router.push({
                pathname: "../(suppliers)/purchase-order-new",
                params: { supplierId: supplierData.id },
              })
            }
          >
            <MaterialIcons
              name="shopping-cart"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.batchOrderText}>Create Order</Text>
          </TouchableOpacity>
        </View>

        {/* Products List */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() =>
                router.push({
                  pathname: "../(suppliers)/product-detail",
                  params: { productId: item.id, supplierId: supplierData.id },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.productHeader}>
                {/* Left Section: Product Info */}
                <View style={styles.productHeaderLeft}>
                  <View style={styles.productIconContainer}>
                    <MaterialCommunityIcons
                      name={
                        item.category === "Raw Material"
                          ? "leaf"
                          : item.category === "Packaging"
                          ? "package-variant"
                          : "flask"
                      }
                      size={16}
                      color={COLORS.light}
                    />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productCategory}>{item.category}</Text>
                  </View>
                </View>

                {/* Right Section: Stock Badge */}
                <View
                  style={[
                    styles.stockBadge,
                    item.inStock
                      ? item.stockLevel < 10
                        ? styles.lowStockBadge
                        : styles.inStockBadge
                      : styles.outOfStockBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      item.inStock
                        ? item.stockLevel < 10
                          ? styles.lowStockText
                          : styles.inStockText
                        : styles.outOfStockText,
                    ]}
                  >
                    {item.inStock
                      ? item.stockLevel < 10
                        ? "Low Stock"
                        : "In Stock"
                      : "Out of Stock"}
                  </Text>
                </View>
              </View>

              {/* Product Details Section */}
              <View style={styles.productDetails}>
                {/* Description */}
                <Text style={styles.productDescription} numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Price, Stock, Last Order */}
                <View style={styles.productMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Price</Text>
                    <Text style={styles.metricValue}>
                      Rs. {item.unitPrice}/{item.unit}
                    </Text>
                  </View>

                  <View style={styles.metricSeparator} />

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Stock</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        !item.inStock && styles.outOfStockValue,
                      ]}
                    >
                      {item.stockLevel} {item.unit}
                    </Text>
                  </View>

                  <View style={styles.metricSeparator} />

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Last Order</Text>
                    <Text style={styles.metricValue}>
                      {formatDate(item.lastOrderDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Batch Info - Optional */}
              {item.batchInfo && item.batchInfo.length > 0 && (
                <View style={styles.batchContainer}>
                  <Text style={styles.batchTitle}>
                    Latest Batch: {item.batchInfo[0].batchNumber}
                  </Text>
                  <View style={styles.batchDetails}>
                    <Text style={styles.batchDate}>
                      Manufactured: {formatDate(item.batchInfo[0].manufactured)}
                    </Text>
                    <Text style={styles.batchExpiry}>
                      Expires: {formatDate(item.batchInfo[0].expiry)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Actions Footer */}
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.orderNowButton}
                  onPress={() =>
                    router.push({
                      pathname: "../(suppliers)/purchase-order-new",
                      params: {
                        supplierId: supplierData.id,
                        productId: item.id,
                      },
                    })
                  }
                >
                  <MaterialIcons
                    name="add-shopping-cart"
                    size={16}
                    color={COLORS.light}
                  />
                  <Text style={styles.orderNowText}>Order Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => toggleSelection(item.id)}
                >
                  <Feather name="check-square" size={16} color={COLORS.dark} />
                  <Text style={styles.selectText}>Select</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="package-variant"
                size={60}
                color="#CED4DA"
              />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/purchase-order-new",
              params: { supplierId: supplierData.id },
            })
          }
        >
          <AntDesign name="shoppingcart" size={24} color={COLORS.light} />
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
    textAlign: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  sortButton: {
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
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    color: COLORS.dark,
  },
  stockFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  stockFilterButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
  },
  stockFilterText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  stockFilterTextActive: {
    color: COLORS.primary,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesScrollContent: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: COLORS.light,
    fontWeight: "600",
  },
  resultsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: "#6c757d",
  },
  batchOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
  },
  batchOrderText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  productCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  productIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginLeft: 8,
  },
  inStockBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  lowStockBadge: {
    backgroundColor: "rgba(243, 156, 18, 0.1)",
  },
  outOfStockBadge: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  stockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inStockText: {
    color: "#2ECC71",
  },
  lowStockText: {
    color: "#F39C12",
  },
  outOfStockText: {
    color: "#E74C3C",
  },
  productDetails: {
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 12,
    lineHeight: 20,
  },
  productMetrics: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    textAlign: "center",
  },
  outOfStockValue: {
    color: "#E74C3C",
  },
  metricSeparator: {
    width: 1,
    height: "70%",
    backgroundColor: "#DEE2E6",
    alignSelf: "center",
  },
  batchContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingTop: 12,
    marginBottom: 12,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  batchDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  batchDate: {
    fontSize: 13,
    color: "#6c757d",
  },
  batchExpiry: {
    fontSize: 13,
    color: "#6c757d",
  },
  productActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderNowButton: {
    flex: 0.7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginRight: 8,
  },
  orderNowText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  selectButton: {
    flex: 0.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  selectText: {
    color: COLORS.dark,
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#6c757d",
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ADB5BD",
    marginTop: 6,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});
