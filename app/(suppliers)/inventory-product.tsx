// app/(suppliers)/inventory-product.tsx

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
  getProductById,
  updateBatchSellingPrice,
} from "../services/supplierApi";
import { COLORS } from "../theme/colors";

interface Batch {
  batch_id: string;
  batch_number: string;
  manufacturing_date: string | null;
  expiry_date: string | null;
  cost_price: number;
  selling_price: number;
  initial_quantity: number;
  current_quantity: number;
  received_date: string;
  supplier_name: string;
  supplier_id: string;
  supplier_contact_person: string;
  supplier_phone: string;
  notes: string;
}

interface ProductStats {
  total_stock: number;
  total_sales: number;
}

interface Product {
  product_id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  unit_price: number;
  reorder_level: number;
  image_url: string | null;
  is_company_product: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  batches: Batch[];
  stats: ProductStats;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("batches"); // batches, details

  // New state variables for the price update modal
  const [modalVisible, setModalVisible] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [priceInputError, setPriceInputError] = useState("");

  // Fetch product data
  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching product details for ID: ${id}`);
      const data = await getProductById(id as string);
      console.log("Product data received");

      setProduct(data);
    } catch (err: any) {
      console.error("Error fetching product:", err);
      setError(err.message || "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [id]);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle stock status determination - FIXED to handle negative values
  const getStockStatus = () => {
    if (!product) return {};

    const totalStock = product.batches.reduce(
      (sum, batch) => sum + batch.current_quantity,
      0
    );

    if (totalStock <= 0) {
      // Changed to <= 0 to handle negative stock
      return {
        text: "Out of Stock",
        color: "#E74C3C",
        backgroundColor: "rgba(231, 76, 60, 0.1)",
      };
    } else if (totalStock < product.reorder_level) {
      return {
        text: "Low Stock",
        color: "#F39C12",
        backgroundColor: "rgba(243, 156, 18, 0.1)",
      };
    } else {
      return {
        text: "In Stock",
        color: "#2ECC71",
        backgroundColor: "rgba(46, 204, 113, 0.1)",
      };
    }
  };

  // Handle add batch navigation
  const handleAddBatch = () => {
    router.push({
      pathname: "../(suppliers)/inventory-batch-add",
      params: { product_id: id as string },
    });
  };

  // FIXED: Handle update selling price (cross-platform)
  const handleUpdateSellingPrice = (batch: Batch) => {
    setCurrentBatch(batch);
    setNewPrice(batch.selling_price.toString());
    setPriceReason("");
    setPriceInputError("");
    setModalVisible(true);
  };

  // Price update modal
  const renderPriceUpdateModal = () => {
    if (!currentBatch) return null;

    const handleSubmit = async () => {
      if (!newPrice) {
        setPriceInputError("Please enter a price");
        return;
      }

      const value = parseFloat(newPrice);
      if (isNaN(value) || value <= 0) {
        setPriceInputError("Please enter a valid positive price");
        return;
      }

      if (!priceReason) {
        setPriceInputError("Please provide a reason for the update");
        return;
      }

      try {
        setModalVisible(false);
        await updateBatchSellingPrice(
          currentBatch.batch_id,
          value,
          priceReason || "Manual price update"
        );
        Alert.alert("Success", "Selling price updated successfully");
        fetchProductData(); // Refresh data
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to update price");
      }
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Update Selling Price</Text>
            <Text style={modalStyles.modalSubtitle}>
              Batch {currentBatch.batch_number}
            </Text>

            <Text style={modalStyles.inputLabel}>New Selling Price (Rs.)</Text>
            <TextInput
              style={modalStyles.textInput}
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              placeholder="Enter new price"
            />

            <Text style={modalStyles.inputLabel}>Reason for Update</Text>
            <TextInput
              style={[modalStyles.textInput, modalStyles.textArea]}
              value={priceReason}
              onChangeText={setPriceReason}
              placeholder="Enter reason for price change"
              multiline={true}
              numberOfLines={3}
            />

            {priceInputError ? (
              <Text style={modalStyles.errorText}>{priceInputError}</Text>
            ) : null}

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.buttonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={modalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.button, modalStyles.buttonUpdate]}
                onPress={handleSubmit}
              >
                <Text
                  style={[modalStyles.buttonText, modalStyles.buttonUpdateText]}
                >
                  Update
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render different tabs
  const renderTabContent = () => {
    if (!product) return null;

    switch (activeTab) {
      case "batches":
        return renderBatchesTab();
      case "details":
        return renderDetailsTab();
      default:
        return renderBatchesTab();
    }
  };

  // Render batches tab
  const renderBatchesTab = () => {
    if (!product?.batches?.length) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="package-variant"
            size={60}
            color="#CED4DA"
          />
          <Text style={styles.emptyText}>No batches available</Text>
          <TouchableOpacity
            style={styles.addBatchButton}
            onPress={handleAddBatch}
          >
            <Text style={styles.addBatchButtonText}>Add First Batch</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <FlatList
          data={product.batches}
          keyExtractor={(item) => item.batch_id}
          contentContainerStyle={{ paddingBottom: 95 }}
          renderItem={({ item }) => (
            <View style={styles.batchCard}>
              <View style={styles.batchHeader}>
                <View>
                  <Text style={styles.batchNumber}>{item.batch_number}</Text>
                  <Text style={styles.supplierName}>
                    From: {item.supplier_name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.quantityBadge,
                    {
                      backgroundColor:
                        item.current_quantity <= 0 // Changed to <= 0 to handle negative values
                          ? "rgba(231, 76, 60, 0.1)"
                          : "rgba(46, 204, 113, 0.1)",
                      borderColor:
                        item.current_quantity <= 0 // Changed to <= 0 to handle negative values
                          ? "#E74C3C"
                          : "#2ECC71",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quantityText,
                      {
                        color:
                          item.current_quantity <= 0 // Changed to <= 0 to handle negative values
                            ? "#E74C3C"
                            : "#2ECC71",
                      },
                    ]}
                  >
                    {item.current_quantity} units
                  </Text>
                </View>
              </View>

              <View style={styles.batchInfoRow}>
                <View style={styles.batchInfoItem}>
                  <Text style={styles.batchInfoLabel}>Cost Price</Text>
                  <Text style={styles.batchInfoValue}>
                    Rs. {item.cost_price}
                  </Text>
                </View>
                <View style={styles.batchInfoItem}>
                  <Text style={styles.batchInfoLabel}>Selling Price</Text>
                  <Text style={styles.batchInfoValue}>
                    Rs. {item.selling_price}
                  </Text>
                </View>
                <View style={styles.batchInfoItem}>
                  <Text style={styles.batchInfoLabel}>Initial Qty</Text>
                  <Text style={styles.batchInfoValue}>
                    {item.initial_quantity}
                  </Text>
                </View>
              </View>

              <View style={styles.batchDatesRow}>
                <View style={styles.batchDateItem}>
                  <MaterialCommunityIcons
                    name="calendar-plus"
                    size={14}
                    color="#6c757d"
                    style={styles.dateIcon}
                  />
                  <Text style={styles.dateLabel}>Received:</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(item.received_date)}
                  </Text>
                </View>

                {item.manufacturing_date && (
                  <View style={styles.batchDateItem}>
                    <MaterialCommunityIcons
                      name="factory"
                      size={14}
                      color="#6c757d"
                      style={styles.dateIcon}
                    />
                    <Text style={styles.dateLabel}>Mfg:</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(item.manufacturing_date)}
                    </Text>
                  </View>
                )}

                {item.expiry_date && (
                  <View style={styles.batchDateItem}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={14}
                      color={
                        new Date(item.expiry_date) < new Date()
                          ? "#E74C3C"
                          : new Date(item.expiry_date) <
                            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          ? "#F39C12"
                          : "#6c757d"
                      }
                      style={styles.dateIcon}
                    />
                    <Text style={styles.dateLabel}>Exp:</Text>
                    <Text
                      style={[
                        styles.dateValue,
                        {
                          color:
                            new Date(item.expiry_date) < new Date()
                              ? "#E74C3C"
                              : new Date(item.expiry_date) <
                                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? "#F39C12"
                              : "#6c757d",
                        },
                      ]}
                    >
                      {formatDate(item.expiry_date)}
                      {new Date(item.expiry_date) < new Date()
                        ? " (Expired)"
                        : new Date(item.expiry_date) <
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? " (Expiring soon)"
                        : ""}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => handleUpdateSellingPrice(item)}
              >
                <Feather name="edit-2" size={14} color={COLORS.light} />
                <Text style={styles.adjustButtonText}>
                  Update Selling Price
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    );
  };

  // Render details tab
  const renderDetailsTab = () => {
    return (
      <View style={styles.tabContent}>
        <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Basic Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product Name</Text>
              <Text style={styles.detailValue}>{product?.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {product?.category_name || "Uncategorized"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Unit Price</Text>
              <Text style={styles.detailValue}>Rs. {product?.unit_price}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reorder Level</Text>
              <Text style={styles.detailValue}>{product?.reorder_level}</Text>
            </View>
          </View>

          {product?.description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {product?.is_company_product !== undefined && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Product Type</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Product Origin</Text>
                <Text style={styles.detailValue}>
                  {product.is_company_product
                    ? "Roo Herbals (Own Product)"
                    : "Third-Party Product"}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchProductData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Price Update Modal */}
      {renderPriceUpdateModal()}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Product Summary */}
      <View style={styles.productSummary}>
        <View style={styles.productImagePlaceholder}>
          <MaterialCommunityIcons
            name="package-variant"
            size={50}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product?.name}</Text>
          <View style={styles.productCategoryContainer}>
            <MaterialIcons
              name="category"
              size={14}
              color={COLORS.secondary}
              style={styles.categoryIcon}
            />
            <Text style={styles.productCategory}>
              {product?.category_name || "Uncategorized"}
            </Text>
          </View>

          <View style={styles.productPriceRow}>
            <Text style={styles.productPrice}>Rs. {product?.unit_price}</Text>
            <View
              style={[
                styles.stockStatusBadge,
                { backgroundColor: stockStatus.backgroundColor },
              ]}
            >
              <Text
                style={[styles.stockStatusText, { color: stockStatus.color }]}
              >
                {stockStatus.text}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stock Summary */}
      <View style={styles.stockSummary}>
        <View style={styles.stockItem}>
          <Text style={styles.stockValue}>
            {product?.stats?.total_stock || 0}
          </Text>
          <Text style={styles.stockLabel}>Current Stock</Text>
        </View>

        <View style={styles.stockDivider} />

        <View style={styles.stockItem}>
          <Text style={styles.stockValue}>{product?.reorder_level}</Text>
          <Text style={styles.stockLabel}>Reorder Level</Text>
        </View>

        <View style={styles.stockDivider} />

        <View style={styles.stockItem}>
          <Text style={styles.stockValue}>{product?.batches?.length || 0}</Text>
          <Text style={styles.stockLabel}>Active Batches</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "batches" && styles.activeTab]}
          onPress={() => setActiveTab("batches")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "batches" && styles.activeTabText,
            ]}
          >
            Batches
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "details" && styles.activeTab]}
          onPress={() => setActiveTab("details")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "details" && styles.activeTabText,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Add Batch FAB */}
      {activeTab === "batches" && (
        <TouchableOpacity style={styles.fabButton} onPress={handleAddBatch}>
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
      Platform.OS === "android"
        ? StatusBar.currentHeight
          ? StatusBar.currentHeight + 10
          : 10
        : 10,
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
  headerRight: {
    width: 40,
  },
  productSummary: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  productCategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIcon: {
    marginRight: 4,
  },
  productCategory: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stockSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    marginBottom: 12,
  },
  stockItem: {
    alignItems: "center",
  },
  stockValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  stockLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  stockDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#F1F3F5",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
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
  batchCard: {
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
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  batchNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  supplierName: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  quantityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  batchInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  batchInfoItem: {
    alignItems: "center",
    flex: 1,
  },
  batchInfoLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  batchInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  batchDatesRow: {
    flexDirection: "column",
    marginBottom: 14,
  },
  batchDateItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dateIcon: {
    marginRight: 4,
    width: 16,
    textAlign: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: "#6c757d",
    width: 70,
  },
  dateValue: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },
  adjustButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  adjustButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  detailSection: {
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
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    flex: 1,
    textAlign: "right",
  },
  description: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  addBatchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  addBatchButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
  },
  fabButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
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
    shadowRadius: 4,
  },
});

// Add the modal styles
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonCancel: {
    backgroundColor: "#F1F3F5",
    marginRight: 8,
  },
  buttonUpdate: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  buttonUpdateText: {
    color: COLORS.light,
  },
});
