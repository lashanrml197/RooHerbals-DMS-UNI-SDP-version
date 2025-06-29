import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Platform,
  Alert,
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
  Entypo,
} from "@expo/vector-icons";

interface Batch {
  batchId: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
  supplier: string;
  supplierType?: string;
  status: "active" | "expired" | "expiring_soon";
  purchaseOrderId?: string;
  cost?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  totalStock: number;
  minStockLevel: number;
  unitPrice: number;
  unit: string;
  batches: Batch[];
  description?: string;
  image?: string;
  lastUpdated?: string;
  sku?: string;
}

interface StockHistory {
  id: string;
  date: string;
  type: "add" | "remove" | "adjust" | "expired";
  quantity: number;
  batchId?: string;
  note: string;
  performedBy: string;
}

export default function InventoryItemDetailScreen() {
  const params = useLocalSearchParams();
  const { itemId, itemName } = params;

  // Tabs state
  const [activeTab, setActiveTab] = useState("overview");

  // Sample inventory item data
  const item: InventoryItem = {
    id: itemId as string,
    name: (itemName as string) || "Herbal Shampoo",
    category: "Hair Care",
    totalStock: 145,
    minStockLevel: 50,
    unitPrice: 350,
    unit: "bottle",
    sku: "HSP-100",
    description:
      "Premium herbal shampoo with natural extracts for all hair types. Contains aloe vera, coconut oil, and lavender essential oil.",
    lastUpdated: "2024-03-01",
    batches: [
      {
        batchId: "B2024-001",
        quantity: 85,
        manufacturingDate: "2024-01-10",
        expiryDate: "2025-01-10",
        supplier: "Herbal Extracts Inc.",
        supplierType: "Raw Materials",
        status: "active",
        purchaseOrderId: "PO-2024-001",
        cost: 250,
      },
      {
        batchId: "B2024-008",
        quantity: 60,
        manufacturingDate: "2024-02-15",
        expiryDate: "2025-02-15",
        supplier: "Herb Garden Co.",
        supplierType: "Raw Materials",
        status: "active",
        purchaseOrderId: "PO-2024-012",
        cost: 270,
      },
    ],
  };

  // Sample stock history data
  const stockHistory: StockHistory[] = [
    {
      id: "1",
      date: "2024-03-01",
      type: "add",
      quantity: 60,
      batchId: "B2024-008",
      note: "Added from purchase order PO-2024-012",
      performedBy: "Admin",
    },
    {
      id: "2",
      date: "2024-02-20",
      type: "remove",
      quantity: 15,
      batchId: "B2024-001",
      note: "Sold to customer",
      performedBy: "System",
    },
    {
      id: "3",
      date: "2024-01-15",
      type: "add",
      quantity: 100,
      batchId: "B2024-001",
      note: "Added from purchase order PO-2024-001",
      performedBy: "Admin",
    },
    {
      id: "4",
      date: "2024-01-30",
      type: "adjust",
      quantity: -5,
      batchId: "B2024-001",
      note: "Inventory adjustment - damaged items",
      performedBy: "Admin",
    },
  ];

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if an item is low in stock
  const isLowStock = (item: InventoryItem) => {
    return item.totalStock < item.minStockLevel;
  };

  // Get stock status color
  const getStockStatusColor = (item: InventoryItem) => {
    if (item.totalStock === 0) return "#E74C3C"; // Out of stock
    if (item.totalStock < item.minStockLevel) return "#F39C12"; // Low stock
    return "#2ECC71"; // Normal stock
  };

  // Get batch status color
  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "#E74C3C";
      case "expiring_soon":
        return "#F39C12";
      case "active":
        return "#2ECC71";
      default:
        return "#95A5A6";
    }
  };

  // Handle confirmation to write off expired batches
  const handleWriteOff = (batchId: string) => {
    Alert.alert(
      "Confirm Write-Off",
      `Are you sure you want to write off batch ${batchId}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Write Off",
          onPress: () => {
            // In a real app, this would update the database
            Alert.alert("Success", `Batch ${batchId} has been written off.`);
          },
          style: "destructive",
        },
      ]
    );
  };

  // Render overview tab content
  const renderOverviewTab = () => (
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
                    {item.totalStock === 0
                      ? "Out of Stock"
                      : isLowStock(item)
                      ? "Low Stock"
                      : "In Stock"}
                  </Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{item.totalStock}</Text>
                  <Text style={styles.statLabel}>Current</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{item.minStockLevel}</Text>
                  <Text style={styles.statLabel}>Minimum</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{item.batches.length}</Text>
                  <Text style={styles.statLabel}>Batches</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Item Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Item Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit Price</Text>
            <Text style={styles.detailValue}>
              Rs. {item.unitPrice} / {item.unit}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SKU</Text>
            <Text style={styles.detailValue}>{item.sku}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>
              {formatDate(item.lastUpdated || "")}
            </Text>
          </View>
          {item.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/inventory-update",
              params: { itemId: item.id, action: "add" },
            })
          }
        >
          <Feather name="plus" size={18} color={COLORS.light} />
          <Text style={styles.primaryActionText}>Add Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/inventory-update",
              params: { itemId: item.id, action: "remove" },
            })
          }
        >
          <Feather name="minus" size={18} color={COLORS.secondary} />
          <Text style={styles.secondaryActionText}>Remove</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/inventory-update",
              params: { itemId: item.id, action: "adjust" },
            })
          }
        >
          <Feather name="edit-2" size={18} color={COLORS.secondary} />
          <Text style={styles.secondaryActionText}>Adjust</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render batches tab content
  const renderBatchesTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={item.batches}
        keyExtractor={(batch) => batch.batchId}
        renderItem={({ item: batch }) => (
          <View style={styles.batchCard}>
            <View style={styles.batchHeader}>
              <View style={styles.batchIdContainer}>
                <Text style={styles.batchId}>{batch.batchId}</Text>
                <View
                  style={[
                    styles.batchStatusBadge,
                    {
                      backgroundColor: `${getBatchStatusColor(batch.status)}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.batchStatusText,
                      { color: getBatchStatusColor(batch.status) },
                    ]}
                  >
                    {batch.status === "expired"
                      ? "Expired"
                      : batch.status === "expiring_soon"
                      ? "Expiring Soon"
                      : "Active"}
                  </Text>
                </View>
              </View>
              <Text style={styles.batchQuantity}>
                {batch.quantity} {item.unit}s
              </Text>
            </View>

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
                      {formatDate(batch.manufacturingDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.batchDetailItem}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={16}
                    color={
                      batch.status === "expired"
                        ? "#E74C3C"
                        : batch.status === "expiring_soon"
                        ? "#F39C12"
                        : "#6c757d"
                    }
                    style={styles.batchDetailIcon}
                  />
                  <View>
                    <Text style={styles.batchDetailLabel}>Expiry Date</Text>
                    <Text
                      style={[
                        styles.batchDetailValue,
                        {
                          color:
                            batch.status === "expired"
                              ? "#E74C3C"
                              : batch.status === "expiring_soon"
                              ? "#F39C12"
                              : COLORS.dark,
                        },
                      ]}
                    >
                      {formatDate(batch.expiryDate)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.batchSupplierRow}>
                <MaterialCommunityIcons
                  name={
                    batch.supplierType === "Raw Materials"
                      ? "leaf"
                      : "package-variant"
                  }
                  size={16}
                  color={COLORS.secondary}
                  style={styles.batchDetailIcon}
                />
                <View>
                  <Text style={styles.batchDetailLabel}>Supplier</Text>
                  <Text style={styles.batchDetailValue}>{batch.supplier}</Text>
                </View>
              </View>

              {batch.purchaseOrderId && (
                <View style={styles.batchPORow}>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={16}
                    color="#6c757d"
                    style={styles.batchDetailIcon}
                  />
                  <View style={styles.poInfo}>
                    <Text style={styles.batchDetailLabel}>Purchase Order</Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "../(suppliers)/purchase-order-detail",
                          params: { poId: batch.purchaseOrderId },
                        })
                      }
                    >
                      <Text style={styles.poLink}>{batch.purchaseOrderId}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {batch.cost && (
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
                      Rs. {batch.cost} / {item.unit}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.batchActions}>
              {batch.status === "expired" ? (
                <TouchableOpacity
                  style={[styles.batchActionButton, styles.writeOffButton]}
                  onPress={() => handleWriteOff(batch.batchId)}
                >
                  <MaterialIcons name="delete" size={16} color="#E74C3C" />
                  <Text style={styles.writeOffButtonText}>Write Off</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.batchActionButton, styles.adjustBatchButton]}
                  onPress={() =>
                    router.push({
                      pathname: "../(suppliers)/inventory-update",
                      params: {
                        itemId: item.id,
                        action: "adjust",
                        batchId: batch.batchId,
                      },
                    })
                  }
                >
                  <Feather name="edit-2" size={16} color={COLORS.secondary} />
                  <Text style={styles.adjustBatchButtonText}>Adjust</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.batchesContainer}
        showsVerticalScrollIndicator={false}
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

  // Render history tab content
  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={stockHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item: history }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={styles.historyDateContainer}>
                <MaterialIcons
                  name="event"
                  size={16}
                  color="#6c757d"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.historyDate}>
                  {formatDate(history.date)}
                </Text>
              </View>
              <View
                style={[
                  styles.historyTypeBadge,
                  {
                    backgroundColor:
                      history.type === "add"
                        ? "rgba(46, 204, 113, 0.1)"
                        : history.type === "remove"
                        ? "rgba(231, 76, 60, 0.1)"
                        : "rgba(52, 152, 219, 0.1)",
                    borderColor:
                      history.type === "add"
                        ? "#2ECC71"
                        : history.type === "remove"
                        ? "#E74C3C"
                        : "#3498DB",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.historyTypeText,
                    {
                      color:
                        history.type === "add"
                          ? "#2ECC71"
                          : history.type === "remove"
                          ? "#E74C3C"
                          : "#3498DB",
                    },
                  ]}
                >
                  {history.type === "add"
                    ? "Added"
                    : history.type === "remove"
                    ? "Removed"
                    : history.type === "adjust"
                    ? "Adjusted"
                    : "Expired"}
                </Text>
              </View>
            </View>

            <View style={styles.historyDetails}>
              <View style={styles.historyQuantityRow}>
                <Text style={styles.historyQuantityLabel}>Quantity:</Text>
                <Text
                  style={[
                    styles.historyQuantityValue,
                    {
                      color:
                        history.type === "add"
                          ? "#2ECC71"
                          : history.type === "remove" || history.quantity < 0
                          ? "#E74C3C"
                          : COLORS.dark,
                    },
                  ]}
                >
                  {history.type === "add"
                    ? "+"
                    : history.type === "remove"
                    ? "-"
                    : ""}
                  {Math.abs(history.quantity)} {item.unit}
                  {Math.abs(history.quantity) !== 1 ? "s" : ""}
                </Text>
              </View>

              {history.batchId && (
                <View style={styles.historyBatchRow}>
                  <Text style={styles.historyDetailLabel}>Batch:</Text>
                  <Text style={styles.historyDetailValue}>
                    {history.batchId}
                  </Text>
                </View>
              )}

              <View style={styles.historyNoteRow}>
                <Text style={styles.historyDetailLabel}>Note:</Text>
                <Text style={styles.historyDetailValue}>{history.note}</Text>
              </View>

              <View style={styles.historyPerformerRow}>
                <Text style={styles.historyDetailLabel}>Performed by:</Text>
                <Text style={styles.historyDetailValue}>
                  {history.performedBy}
                </Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.historyContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={60} color="#CED4DA" />
            <Text style={styles.emptyText}>No history found</Text>
          </View>
        }
      />
    </View>
  );

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/inventory-edit",
              params: { itemId: item.id },
            })
          }
        >
          <Feather name="edit-2" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
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
              <Text style={styles.tabBadgeText}>{item.batches.length}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === "overview" && renderOverviewTab()}
      {activeTab === "batches" && renderBatchesTab()}
      {activeTab === "history" && renderHistoryTab()}
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
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
  quickActions: {
    flexDirection: "row",
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryActionButton: {
    backgroundColor: COLORS.primary,
    flex: 2,
  },
  secondaryActionButton: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    flex: 1,
  },
  primaryActionText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  secondaryActionText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  batchesContainer: {
    paddingBottom: 20,
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
  batchPORow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  poInfo: {
    flex: 1,
  },
  poLink: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  batchCostRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  batchActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  batchActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  writeOffButton: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    borderWidth: 1,
    borderColor: "#E74C3C",
  },
  writeOffButtonText: {
    color: "#E74C3C",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  adjustBatchButton: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  adjustBatchButtonText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  historyContainer: {
    paddingBottom: 20,
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  historyTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  historyDetails: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  historyQuantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyQuantityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  historyQuantityValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  historyBatchRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  historyDetailLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginRight: 8,
    width: 90,
  },
  historyDetailValue: {
    fontSize: 14,
    color: COLORS.dark,
    flex: 1,
  },
  historyNoteRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  historyPerformerRow: {
    flexDirection: "row",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 12,
  },
});
