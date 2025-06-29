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
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../theme/colors";

// Import API functions
import { getSupplierById } from "../services/supplierApi";

// Define types for better TypeScript support
type Product = {
  product_id: string;
  name: string;
  category_name?: string;
  unit_price: number;
  total_stock: number;
  last_order_date?: string;
};

type PurchaseOrder = {
  po_id: string;
  order_date: string;
  expected_delivery_date: string;
  total_amount: number;
  status: string;
};

type SupplierData = {
  supplier_id: string;
  name: string;
  supplier_type: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
  is_preferred: boolean;
  created_at: string;
  products: Product[];
  purchaseOrders: PurchaseOrder[];
};

export default function SupplierDetailScreen() {
  const params = useLocalSearchParams();
  const { supplierId, supplierName } = params;

  // Ensure supplierId is a string
  const supplierIdString = Array.isArray(supplierId)
    ? supplierId[0]
    : (supplierId as string);

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  // Fetch supplier data
  useEffect(() => {
    const fetchSupplierData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!supplierId) {
          throw new Error("Supplier ID is required");
        }

        const data = await getSupplierById(supplierId as string);
        setSupplierData(data);
      } catch (err: unknown) {
        console.error("Error fetching supplier details:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch supplier details";
        setError(errorMessage);

        // Use sample data if API fails
        setSupplierData({
          supplier_id: supplierIdString,
          name: Array.isArray(supplierName)
            ? supplierName[0]
            : (supplierName as string) || "Herbal Extracts Inc.",
          supplier_type: "raw_material",
          contact_person: "John Smith",
          phone: "+94 77 1234567",
          email: "contact@herbalextracts.com",
          address: "123 Green Lane, Colombo, Sri Lanka",
          payment_terms: "Net 30",
          is_preferred: true,
          created_at: "2022-05-15T00:00:00.000Z",
          products: [
            {
              product_id: "P001",
              name: "Aloe Vera Extract",
              category_name: "Raw Material",
              unit_price: 1500,
              total_stock: 20,
              last_order_date: "2024-02-15",
            },
            {
              product_id: "P002",
              name: "Coconut Oil",
              category_name: "Raw Material",
              unit_price: 1800,
              total_stock: 35,
              last_order_date: "2024-02-20",
            },
            {
              product_id: "P003",
              name: "Lavender Essential Oil",
              category_name: "Raw Material",
              unit_price: 4500,
              total_stock: 0,
              last_order_date: "2024-01-10",
            },
          ],
          purchaseOrders: [
            {
              po_id: "PO001",
              order_date: "2024-03-01T10:30:00.000Z",
              expected_delivery_date: "2024-03-15",
              total_amount: 125000,
              status: "received",
            },
            {
              po_id: "PO010",
              order_date: "2024-02-15T09:45:00.000Z",
              expected_delivery_date: "2024-03-01",
              total_amount: 87500,
              status: "received",
            },
            {
              po_id: "PO022",
              order_date: "2024-01-20T11:15:00.000Z",
              expected_delivery_date: "2024-02-05",
              total_amount: 156000,
              status: "received",
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();
  }, [supplierId, supplierName, supplierIdString]);

  // Handle contacting the supplier
  const handleContact = (method: "phone" | "email", value: string): void => {
    switch (method) {
      case "phone":
        Linking.openURL(`tel:${value}`);
        break;
      case "email":
        Linking.openURL(`mailto:${value}`);
        break;
      default:
        break;
    }
  };

  // Function to get status badge color
  const getStatusColor = (status: string): string => {
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

  // Format date to string
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get formatted supplier type
  const getSupplierTypeLabel = (type: string): string => {
    switch (type) {
      case "raw_material":
        return "Raw Materials";
      case "manufacturer":
        return "Manufacturer";
      case "distributor":
        return "Distributor";
      case "packaging":
        return "Packaging";
      default:
        return type;
    }
  };

  // Render info tab content
  const renderInfoTab = () => (
    <View style={styles.tabContent}>
      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <MaterialIcons name="person" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Contact Person</Text>
            </View>
            <Text style={styles.infoValue}>{supplierData?.contact_person}</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              supplierData?.phone && handleContact("phone", supplierData.phone)
            }
          >
            <View style={styles.infoLabel}>
              <MaterialIcons name="phone" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Phone</Text>
            </View>
            <View style={styles.contactValueContainer}>
              <Text style={[styles.infoValue, styles.linkText]}>
                {supplierData?.phone}
              </Text>
              <Feather name="external-link" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              supplierData?.email && handleContact("email", supplierData.email)
            }
          >
            <View style={styles.infoLabel}>
              <MaterialIcons name="email" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Email</Text>
            </View>
            <View style={styles.contactValueContainer}>
              <Text style={[styles.infoValue, styles.linkText]}>
                {supplierData?.email}
              </Text>
              <Feather name="external-link" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <MaterialIcons name="location-on" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Address</Text>
            </View>
            <Text style={styles.infoValue}>{supplierData?.address}</Text>
          </View>
        </View>
      </View>

      {/* Supplier Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supplier Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <MaterialIcons name="category" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Type</Text>
            </View>
            <View style={styles.typeContainer}>
              <Text style={styles.typeText}>
                {supplierData?.supplier_type
                  ? getSupplierTypeLabel(supplierData.supplier_type)
                  : ""}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <MaterialIcons name="calendar-today" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Registered Since</Text>
            </View>
            <Text style={styles.infoValue}>
              {supplierData?.created_at
                ? formatDate(supplierData.created_at)
                : ""}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <MaterialIcons name="payment" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Payment Terms</Text>
            </View>
            <Text style={styles.infoValue}>{supplierData?.payment_terms}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <MaterialIcons name="star" size={16} color="#6c757d" />
              <Text style={styles.labelText}>Preferred Supplier</Text>
            </View>
            <Text style={styles.infoValue}>
              {supplierData?.is_preferred ? "Yes" : "No"}
            </Text>
          </View>
        </View>
      </View>

      {/* Business Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Summary</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {supplierData?.products ? supplierData.products.length : 0}
            </Text>
            <Text style={styles.summaryLabel}>Active Products</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {supplierData?.purchaseOrders
                ? supplierData.purchaseOrders.length
                : 0}
            </Text>
            <Text style={styles.summaryLabel}>Total Orders</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {supplierData?.purchaseOrders
                ? supplierData.purchaseOrders.filter(
                    (po) => po.status === "pending" || po.status === "ordered"
                  ).length
                : 0}
            </Text>
            <Text style={styles.summaryLabel}>Pending Orders</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Render products tab content
  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>
          Products ({supplierData?.products ? supplierData.products.length : 0})
        </Text>
      </View>

      {supplierData?.products &&
        supplierData.products.map((product) => (
          <View key={product.product_id} style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.productIconContainer}>
                <MaterialCommunityIcons
                  name={
                    product.category_name
                      ?.toLowerCase()
                      .includes("raw material")
                      ? "leaf"
                      : "package-variant"
                  }
                  size={16}
                  color={COLORS.light}
                />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>
                  {product.category_name}
                </Text>
              </View>
            </View>
          </View>
        ))}
    </View>
  );

  // Render orders tab content
  const renderOrdersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>
          Purchase Orders (
          {supplierData?.purchaseOrders
            ? supplierData.purchaseOrders.length
            : 0}
          )
        </Text>
      </View>

      {supplierData?.purchaseOrders &&
        supplierData.purchaseOrders.map((order) => (
          <View key={order.po_id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>{order.po_id}</Text>
              <View
                style={[
                  styles.orderStatusBadge,
                  { backgroundColor: `${getStatusColor(order.status)}20` },
                ]}
              >
                <View
                  style={[
                    styles.orderStatusDot,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                />
                <Text
                  style={[
                    styles.orderStatusText,
                    { color: getStatusColor(order.status) },
                  ]}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.orderDetail}>
                <Text style={styles.orderDetailLabel}>Date</Text>
                <Text style={styles.orderDetailValue}>
                  {formatDate(order.order_date)}
                </Text>
              </View>
              <View style={styles.orderDetail}>
                <Text style={styles.orderDetailLabel}>Amount</Text>
                <Text style={styles.orderDetailValue}>
                  Rs. {order.total_amount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}
    </View>
  );

  // Show loading indicator while data is loading
  if (loading) {
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
          <Text style={styles.headerTitle}>Supplier Details</Text>
          <View style={styles.placeholderButton}></View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading supplier details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if data loading failed
  if (error) {
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
          <Text style={styles.headerTitle}>Supplier Details</Text>
          <View style={styles.placeholderButton}></View>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Safety check - if supplierData is still null after loading
  if (!supplierData) {
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
          <Text style={styles.headerTitle}>Supplier Details</Text>
          <View style={styles.placeholderButton}></View>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>No supplier data available</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
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
        <Text style={styles.headerTitle}>Supplier Details</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/supplier-edit",
              params: { supplierId: supplierData.supplier_id },
            })
          }
        >
          <Feather name="edit-2" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Supplier Header */}
        <View style={styles.supplierHeader}>
          <View style={styles.supplierIconLarge}>
            <MaterialCommunityIcons
              name={
                supplierData.supplier_type === "raw_material"
                  ? "leaf"
                  : supplierData.supplier_type === "packaging"
                  ? "package-variant"
                  : "factory"
              }
              size={32}
              color={COLORS.light}
            />
          </View>
          <View style={styles.supplierHeaderInfo}>
            <Text style={styles.supplierName}>{supplierData.name}</Text>
            <Text style={styles.supplierType}>
              {getSupplierTypeLabel(supplierData.supplier_type)}
            </Text>
            <View
              style={[
                styles.preferredBadge,
                supplierData.is_preferred && styles.isPreferredBadge,
              ]}
            >
              <Text
                style={[
                  styles.preferredText,
                  supplierData.is_preferred && styles.isPreferredText,
                ]}
              >
                {supplierData.is_preferred
                  ? "Preferred Supplier"
                  : "Regular Supplier"}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "info" && styles.activeTab]}
            onPress={() => setActiveTab("info")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "info" && styles.activeTabText,
              ]}
            >
              Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "products" && styles.activeTab]}
            onPress={() => setActiveTab("products")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "products" && styles.activeTabText,
              ]}
            >
              Products
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {supplierData.products ? supplierData.products.length : 0}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "orders" && styles.activeTab]}
            onPress={() => setActiveTab("orders")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "orders" && styles.activeTabText,
              ]}
            >
              Orders
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {supplierData.purchaseOrders
                  ? supplierData.purchaseOrders.length
                  : 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "info" && renderInfoTab()}
        {activeTab === "products" && renderProductsTab()}
        {activeTab === "orders" && renderOrdersTab()}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "../(suppliers)/purchase-order-new",
              params: { supplierId: supplierData.supplier_id },
            })
          }
        >
          <MaterialIcons
            name="add-shopping-cart"
            size={20}
            color={COLORS.light}
          />
          <Text style={styles.primaryButtonText}>Create Purchase Order</Text>
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
  editButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  container: {
    flex: 1,
  },
  supplierHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.light,
  },
  supplierIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  supplierHeaderInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  supplierType: {
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  preferredBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(149, 165, 166, 0.1)",
  },
  isPreferredBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  preferredText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#95A5A6",
  },
  isPreferredText: {
    color: "#2ECC71",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
  infoCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  infoLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  contactValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkText: {
    color: COLORS.primary,
    marginRight: 4,
  },
  typeContainer: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  summaryDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#F1F3F5",
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
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tabHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginRight: 4,
  },
  productCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
    color: "#6c757d",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inStockBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
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
  outOfStockText: {
    color: "#E74C3C",
  },
  productDetails: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  productDetail: {
    flex: 1,
  },
  productDetailLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  productDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  orderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
  },
  orderButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  orderCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  orderStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    flexDirection: "row",
    marginBottom: 12,
  },
  orderDetail: {
    flex: 1,
  },
  orderDetailLabel: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 4,
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  orderActions: {
    alignItems: "flex-end",
  },
  bottomActions: {
    backgroundColor: COLORS.light,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
    marginLeft: 8,
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
    marginTop: 20,
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
    fontSize: 16,
    fontWeight: "600",
  },
});
