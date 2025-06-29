import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import useAuth hook
import { COLORS } from "../theme/colors";

export default function PurchaseOrderDetailScreen() {
  const { hasPermission } = useAuth(); // Get hasPermission from auth context
  const params = useLocalSearchParams();
  const { poId, poNumber } = params;

  // Check permission on mount
  useEffect(() => {
    if (!hasPermission("view_suppliers")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to view purchase order details.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Sample purchase order data
  const purchaseOrder = {
    id: poId,
    poNumber: poNumber || "PO-2024-001",
    supplier: "Herbal Extracts Inc.",
    supplierType: "Raw Materials",
    date: "2024-03-01",
    deliveryDate: "2024-03-10",
    totalAmount: 125000,
    items: [
      {
        id: "1",
        name: "Aloe Vera Extract",
        quantity: 50,
        unit: "liter",
        unitPrice: 1500,
        total: 75000,
        batchNumber: "B2024-101",
      },
      {
        id: "2",
        name: "Coconut Oil",
        quantity: 20,
        unit: "liter",
        unitPrice: 1800,
        total: 36000,
        batchNumber: "B2024-102",
      },
      {
        id: "3",
        name: "Lavender Essential Oil",
        quantity: 3,
        unit: "liter",
        unitPrice: 4500,
        total: 13500,
        batchNumber: "B2024-103",
      },
    ],
    status: "ordered",
    notes:
      "Please ensure all items are properly sealed and labeled with batch numbers.",
    createdBy: "Admin",
    contactPerson: "John Smith",
    contactPhone: "+94 77 1234567",
    contactEmail: "john@herbalextracts.com",
    address: "123 Green Lane, Colombo",
  };

  // Function to format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to handle status change
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "received") {
      Alert.alert(
        "Confirm Receipt",
        "Are you sure you want to mark this order as received? This will update inventory levels.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Confirm",
            onPress: () => {
              // In a real app, this would update the PO status and inventory
              Alert.alert(
                "Success",
                "Purchase order marked as received and inventory updated."
              );
            },
          },
        ]
      );
    } else if (newStatus === "cancelled") {
      Alert.alert(
        "Confirm Cancellation",
        "Are you sure you want to cancel this purchase order?",
        [
          {
            text: "No",
            style: "cancel",
          },
          {
            text: "Yes, Cancel Order",
            onPress: () => {
              // In a real app, this would update the PO status
              Alert.alert(
                "Order Cancelled",
                "Purchase order has been cancelled."
              );
            },
            style: "destructive",
          },
        ]
      );
    }
  };

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
        <Text style={styles.headerTitle}>Purchase Order Details</Text>
        <TouchableOpacity
          style={styles.printButton}
          onPress={() => Alert.alert("Print", "Printing purchase order...")}
        >
          <MaterialCommunityIcons
            name="printer"
            size={22}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* PO Header */}
        <View style={styles.poHeader}>
          <View style={styles.poNumberContainer}>
            <Text style={styles.poNumber}>{purchaseOrder.poNumber}</Text>
            <View style={styles.poDateContainer}>
              <MaterialIcons
                name="date-range"
                size={16}
                color="#6c757d"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.poDate}>
                {formatDate(purchaseOrder.date)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(purchaseOrder.status)}20` },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(purchaseOrder.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(purchaseOrder.status) },
              ]}
            >
              {purchaseOrder.status.charAt(0).toUpperCase() +
                purchaseOrder.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Supplier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier Information</Text>
          <View style={styles.supplierCard}>
            <View style={styles.supplierHeader}>
              <View style={styles.supplierIconContainer}>
                <MaterialCommunityIcons
                  name={
                    purchaseOrder.supplierType === "Raw Materials"
                      ? "leaf"
                      : "package-variant"
                  }
                  size={16}
                  color={COLORS.light}
                />
              </View>
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>
                  {purchaseOrder.supplier}
                </Text>
                <Text style={styles.supplierType}>
                  {purchaseOrder.supplierType}
                </Text>
              </View>
            </View>
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <MaterialIcons
                  name="person"
                  size={16}
                  color="#6c757d"
                  style={styles.contactIcon}
                />
                <Text style={styles.contactText}>
                  {purchaseOrder.contactPerson}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <MaterialIcons
                  name="phone"
                  size={16}
                  color="#6c757d"
                  style={styles.contactIcon}
                />
                <Text style={styles.contactText}>
                  {purchaseOrder.contactPhone}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <MaterialIcons
                  name="email"
                  size={16}
                  color="#6c757d"
                  style={styles.contactIcon}
                />
                <Text style={styles.contactText}>
                  {purchaseOrder.contactEmail}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <MaterialIcons
                  name="location-on"
                  size={16}
                  color="#6c757d"
                  style={styles.contactIcon}
                />
                <Text style={styles.contactText}>{purchaseOrder.address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {purchaseOrder.items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                index === purchaseOrder.items.length - 1
                  ? { marginBottom: 0 }
                  : null,
              ]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemBatch}>Batch: {item.batchNumber}</Text>
              </View>
              <View style={styles.itemDetails}>
                <View style={styles.itemDetail}>
                  <Text style={styles.itemDetailLabel}>Quantity</Text>
                  <Text style={styles.itemDetailValue}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <View style={styles.itemDetail}>
                  <Text style={styles.itemDetailLabel}>Unit Price</Text>
                  <Text style={styles.itemDetailValue}>
                    Rs. {item.unitPrice}
                  </Text>
                </View>
                <View style={styles.itemDetail}>
                  <Text style={styles.itemDetailLabel}>Total</Text>
                  <Text style={styles.itemDetailValue}>
                    Rs. {item.total.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order Date</Text>
              <Text style={styles.summaryValue}>
                {formatDate(purchaseOrder.date)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expected Delivery</Text>
              <Text style={styles.summaryValue}>
                {formatDate(purchaseOrder.deliveryDate)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Text style={styles.summaryValue}>
                {purchaseOrder.items.length}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                Rs. {purchaseOrder.totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {purchaseOrder.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{purchaseOrder.notes}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {purchaseOrder.status === "pending" && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#3498DB" }]}
              onPress={() => handleStatusChange("ordered")}
            >
              <MaterialIcons
                name="send"
                size={20}
                color={COLORS.light}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionButtonText}>Send to Supplier</Text>
            </TouchableOpacity>
          )}

          {purchaseOrder.status === "ordered" && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#2ECC71" }]}
              onPress={() => handleStatusChange("received")}
            >
              <MaterialIcons
                name="check-circle"
                size={20}
                color={COLORS.light}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionButtonText}>Mark as Received</Text>
            </TouchableOpacity>
          )}

          {(purchaseOrder.status === "pending" ||
            purchaseOrder.status === "ordered") && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: "#E74C3C", marginTop: 12 },
              ]}
              onPress={() => handleStatusChange("cancelled")}
            >
              <MaterialIcons
                name="cancel"
                size={20}
                color={COLORS.light}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}

          {purchaseOrder.status === "received" && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: COLORS.secondary },
              ]}
              onPress={() =>
                Alert.alert("View Inventory", "Navigating to inventory...")
              }
            >
              <MaterialIcons
                name="inventory"
                size={20}
                color={COLORS.light}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionButtonText}>View in Inventory</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Created By */}
        <View style={styles.createdByContainer}>
          <Text style={styles.createdByText}>
            Created by: {purchaseOrder.createdBy}
          </Text>
        </View>
      </ScrollView>
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
  },
  printButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  poHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.light,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  poNumberContainer: {
    flex: 1,
  },
  poNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  poDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  poDate: {
    fontSize: 14,
    color: "#6c757d",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
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
  supplierCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  supplierHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(52, 100, 145, 0.1)",
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
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  supplierType: {
    fontSize: 14,
    color: "#6c757d",
  },
  contactInfo: {
    padding: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  itemCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    flex: 1,
  },
  itemBatch: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
  },
  itemDetail: {
    alignItems: "center",
  },
  itemDetailLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
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
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  divider: {
    height: 1,
    backgroundColor: "#DEE2E6",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  notesCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 4,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
  },
  createdByContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  createdByText: {
    fontSize: 14,
    color: "#6c757d",
  },
});
