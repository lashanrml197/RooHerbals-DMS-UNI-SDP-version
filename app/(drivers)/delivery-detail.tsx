import {
  AntDesign,
  Feather,
  FontAwesome,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDeliveryById } from "../services/driverApi";
import { COLORS } from "../theme/colors";

// Defines the structure for a single item within an order.
interface OrderItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

// Defines the structure for the complete delivery data.
interface DeliveryData {
  delivery_id: string;
  order_id: string;
  driver_id: string;
  vehicle_id: string;
  scheduled_date: string;
  delivery_date: string | null;
  status: "scheduled" | "in_progress" | "delivered" | "failed";
  notes: string | null;
  driver_name: string;
  driver_phone: string;
  vehicle_name: string;
  registration_number: string;
  customer_id: string;
  customer_name: string;
  contact_person: string;
  customer_phone: string;
  address: string;
  city: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_type: string;
  payment_status: string;
  order_items: OrderItem[];
}

// Main component for the delivery detail screen.
export default function DeliveryDetailScreen() {
  // Retrieves route parameters, specifically the delivery ID.
  const params = useLocalSearchParams();
  const { id } = params;
  // State for managing loading state.
  const [loading, setLoading] = useState(true);
  // State for storing any errors that occur.
  const [error, setError] = useState<string | null>(null);
  // State for holding the fetched delivery data.
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);

  // Formats a date string for display.
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not yet delivered";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Formats a number as a currency string.
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "Rs. 0";
    return `Rs. ${value.toLocaleString()}`;
  };

  // Fetches delivery data from the API based on the ID.
  const fetchDeliveryData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching delivery data for ID:", id);
      const data = await getDeliveryById(id as string);
      console.log("Delivery data received:", data);
      setDeliveryData(data);
    } catch (err: any) {
      console.error("Error fetching delivery data:", err);
      setError(
        err.message || "Could not load delivery details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Shares the delivery information using the native share functionality.
  const shareDeliveryInfo = async () => {
    if (!deliveryData) return;

    try {
      const message = `
Delivery Details:
ID: ${deliveryData.delivery_id}
Order: ${deliveryData.order_id}
Customer: ${deliveryData.customer_name}
Address: ${deliveryData.address}, ${deliveryData.city}
Status: ${deliveryData.status}
Driver: ${deliveryData.driver_name}
Vehicle: ${deliveryData.vehicle_name} (${deliveryData.registration_number})
Scheduled Date: ${formatDate(deliveryData.scheduled_date)}
Amount: ${formatCurrency(deliveryData.final_amount)}
`;

      await Share.share({
        message,
        title: "Delivery Information",
      });
    } catch {
      Alert.alert("Error", "Could not share delivery information");
    }
  };

  // Initiates a phone call to the customer.
  const handleCallCustomer = () => {
    if (!deliveryData?.customer_phone) {
      Alert.alert("Error", "No customer phone number available");
      return;
    }

    Linking.canOpenURL(`tel:${deliveryData.customer_phone}`)
      .then((supported) => {
        if (supported) {
          Linking.openURL(`tel:${deliveryData.customer_phone}`);
        } else {
          Alert.alert("Error", "Phone calls not supported on this device");
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Could not open phone app");
      });
  };

  // Initiates a phone call to the driver.
  const handleCallDriver = () => {
    if (!deliveryData?.driver_phone) {
      Alert.alert("Error", "No driver phone number available");
      return;
    }

    Linking.canOpenURL(`tel:${deliveryData.driver_phone}`)
      .then((supported) => {
        if (supported) {
          Linking.openURL(`tel:${deliveryData.driver_phone}`);
        } else {
          Alert.alert("Error", "Phone calls not supported on this device");
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Could not open phone app");
      });
  };

  // Opens the delivery address in a maps application.
  const handleOpenMaps = () => {
    if (!deliveryData?.address || !deliveryData?.city) {
      Alert.alert("Error", "No address available");
      return;
    }

    const address = `${deliveryData.address}, ${deliveryData.city}, Sri Lanka`;
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
    });

    if (url) {
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            Linking.openURL(webUrl);
          }
        })
        .catch((err) => {
          Alert.alert("Error", "Could not open maps application");
        });
    }
  };

  // Effect hook to fetch data when the component mounts or the ID changes.
  useEffect(() => {
    fetchDeliveryData();
  }, [fetchDeliveryData]);

  // Renders a loading indicator while data is being fetched.
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading delivery details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renders an error message if fetching data fails.
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchDeliveryData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Returns null if there is no delivery data, to prevent rendering an empty screen.
  if (!deliveryData) {
    return null;
  }

  // Determines the badge style based on the delivery status.
  const getStatusBadgeStyle = (status: DeliveryData["status"]) => {
    switch (status) {
      case "delivered":
        return styles.deliveredBadge;
      case "in_progress":
        return styles.inProgressBadge;
      case "failed":
        return styles.failedBadge;
      default:
        return styles.scheduledBadge;
    }
  };

  // Determines the text style for the status based on the delivery status.
  const getStatusTextStyle = (status: DeliveryData["status"]) => {
    switch (status) {
      case "delivered":
        return styles.deliveredText;
      case "in_progress":
        return styles.inProgressText;
      case "failed":
        return styles.failedText;
      default:
        return styles.scheduledText;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header section with back button, title, and share button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <TouchableOpacity
          onPress={shareDeliveryInfo}
          style={styles.shareButton}
        >
          <Feather name="share-2" size={20} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Card displaying the current status of the delivery */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusLabel}>Delivery Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  getStatusBadgeStyle(deliveryData.status),
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    getStatusTextStyle(deliveryData.status),
                  ]}
                >
                  {deliveryData.status === "delivered"
                    ? "Delivered"
                    : deliveryData.status === "in_progress"
                    ? "In Progress"
                    : deliveryData.status === "failed"
                    ? "Failed"
                    : "Scheduled"}
                </Text>
              </View>
            </View>

            <View>
              <Text style={styles.idLabel}>Delivery ID</Text>
              <Text style={styles.idValue}>{deliveryData.delivery_id}</Text>
            </View>
          </View>

          <View style={styles.dateContainer}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Scheduled Date</Text>
              <Text style={styles.dateValue}>
                {formatDate(deliveryData.scheduled_date)}
              </Text>
            </View>

            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Delivery Date</Text>
              <Text style={styles.dateValue}>
                {formatDate(deliveryData.delivery_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Card displaying customer information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="user-alt" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer Name</Text>
              <Text style={styles.infoValue}>{deliveryData.customer_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="user" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact Person</Text>
              <Text style={styles.infoValue}>
                {deliveryData.contact_person || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="phone" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>
                {deliveryData.customer_phone || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {`${deliveryData.address}, ${deliveryData.city}`}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={handleCallCustomer}
            >
              <Feather name="phone" size={18} color={COLORS.light} />
              <Text style={styles.actionButtonText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.mapButton]}
              onPress={handleOpenMaps}
            >
              <Feather name="map-pin" size={18} color={COLORS.light} />
              <Text style={styles.actionButtonText}>Open Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card displaying driver and vehicle details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Driver & Vehicle</Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="user-tie" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{deliveryData.driver_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="phone" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Driver Phone</Text>
              <Text style={styles.infoValue}>
                {deliveryData.driver_phone || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="truck"
              size={18}
              color={COLORS.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>{deliveryData.vehicle_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="card-account-details-outline"
              size={18}
              color={COLORS.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Registration Number</Text>
              <Text style={styles.infoValue}>
                {deliveryData.registration_number}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.driverButton,
              { marginTop: 10 },
            ]}
            onPress={handleCallDriver}
          >
            <Feather name="phone" size={18} color={COLORS.light} />
            <Text style={styles.actionButtonText}>Call Driver</Text>
          </TouchableOpacity>
        </View>

        {/* Card displaying the items included in the order */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Order Items</Text>
            <Text style={styles.orderIdText}>
              Order #{deliveryData.order_id}
            </Text>
          </View>

          {deliveryData.order_items &&
            deliveryData.order_items.map((item, index) => (
              <View
                key={item.order_item_id}
                style={[
                  styles.orderItem,
                  index === deliveryData.order_items.length - 1
                    ? {
                        borderBottomWidth: 0,
                        marginBottom: 0,
                        paddingBottom: 0,
                      }
                    : {},
                ]}
              >
                <View style={styles.orderItemHeader}>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.total_price)}
                  </Text>
                </View>

                <View style={styles.orderItemDetails}>
                  <View style={styles.orderItemDetail}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>{item.quantity}</Text>
                  </View>

                  <View style={styles.orderItemDetail}>
                    <Text style={styles.detailLabel}>Batch:</Text>
                    <Text style={styles.detailValue}>{item.batch_number}</Text>
                  </View>

                  <View style={styles.orderItemDetail}>
                    <Text style={styles.detailLabel}>Unit Price:</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(item.unit_price)}
                    </Text>
                  </View>

                  {item.discount > 0 && (
                    <View style={styles.orderItemDetail}>
                      <Text style={styles.detailLabel}>Discount:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(item.discount)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(deliveryData.total_amount)}
              </Text>
            </View>

            {deliveryData.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.discountValue}>
                  -{formatCurrency(deliveryData.discount_amount)}
                </Text>
              </View>
            )}

            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(deliveryData.final_amount)}
              </Text>
            </View>

            <View style={styles.paymentInfoRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>Payment Type</Text>
                <Text style={styles.paymentValue}>
                  {deliveryData.payment_type || "N/A"}
                </Text>
              </View>

              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>Payment Status</Text>
                <View
                  style={[
                    styles.paymentStatusBadge,
                    deliveryData.payment_status === "paid"
                      ? styles.paidBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentStatusText,
                      deliveryData.payment_status === "paid"
                        ? styles.paidText
                        : styles.pendingText,
                    ]}
                  >
                    {deliveryData.payment_status === "paid"
                      ? "Paid"
                      : "Pending"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section for any additional notes related to the delivery */}
        {deliveryData.notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{deliveryData.notes}</Text>
          </View>
        )}

        {/* Adds space at the bottom of the scroll view */}
        <View style={{ height: 95 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main container for the screen, ensuring it fills the available space.
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Header section styling.
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight! + 16 : 16,
  },
  // Back button styling.
  backButton: {
    padding: 8,
  },
  // Header title text styling.
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.light,
  },
  // Share button styling.
  shareButton: {
    padding: 8,
  },
  // Main content container styling.
  container: {
    flex: 1,
    padding: 16,
  },
  // Card for displaying delivery status.
  statusCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Header within the status card.
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  // Label for the delivery status.
  statusLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
  },
  // Badge for displaying the delivery status.
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  // Badge style for 'scheduled' status.
  scheduledBadge: {
    backgroundColor: "rgba(155, 89, 182, 0.1)",
  },
  // Badge style for 'in_progress' status.
  inProgressBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  // Badge style for 'delivered' status.
  deliveredBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  // Badge style for 'failed' status.
  failedBadge: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  // Text style for the status.
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Text color for 'scheduled' status.
  scheduledText: {
    color: "#9B59B6",
  },
  // Text color for 'in_progress' status.
  inProgressText: {
    color: "#3498DB",
  },
  // Text color for 'delivered' status.
  deliveredText: {
    color: "#2ECC71",
  },
  // Text color for 'failed' status.
  failedText: {
    color: "#E74C3C",
  },
  // Label for the delivery ID.
  idLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
  },
  // Value for the delivery ID.
  idValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Container for dates.
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  // Individual date item.
  dateItem: {
    flex: 1,
  },
  // Label for dates.
  dateLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  // Value for dates.
  dateValue: {
    fontSize: 15,
    color: COLORS.dark,
  },
  // General card styling for information sections.
  card: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Header for cards.
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  // Title for cards.
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Text for order ID.
  orderIdText: {
    fontSize: 14,
    color: "#6c757d",
  },
  // Row for information display.
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  // Content within an info row.
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  // Label for information.
  infoLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  // Value for information.
  infoValue: {
    fontSize: 16,
    color: COLORS.dark,
  },
  // Row for action buttons.
  actionButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  // General action button style.
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  // Style for the call button.
  callButton: {
    backgroundColor: "#4CAF50",
    flex: 1,
    marginRight: 8,
  },
  // Style for the map button.
  mapButton: {
    backgroundColor: "#FF9800",
    flex: 1,
    marginLeft: 8,
  },
  // Style for the driver-related button.
  driverButton: {
    backgroundColor: "#3498DB",
    flex: 1,
  },
  // Text within action buttons.
  actionButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Style for each order item.
  orderItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    paddingBottom: 16,
    marginBottom: 16,
  },
  // Header for an order item.
  orderItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  // Style for product name.
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    flex: 1,
  },
  // Style for item price.
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  // Container for order item details.
  orderItemDetails: {
    marginTop: 8,
  },
  // Individual detail within an order item.
  orderItemDetail: {
    flexDirection: "row",
    marginBottom: 4,
  },
  // Label for order item detail.
  detailLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginRight: 8,
    width: 80,
  },
  // Value for order item detail.
  detailValue: {
    fontSize: 14,
    color: COLORS.dark,
  },
  // Section for totals.
  totalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  // Row for total values.
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  // Label for totals.
  totalLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  // Value for totals.
  totalValue: {
    fontSize: 14,
    color: COLORS.dark,
  },
  // Style for discount value.
  discountValue: {
    fontSize: 14,
    color: "#E74C3C",
  },
  // Row for the grand total.
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  // Label for the grand total.
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Value for the grand total.
  grandTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  // Row for payment information.
  paymentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  // Container for payment info.
  paymentInfo: {
    flex: 1,
  },
  // Label for payment info.
  paymentLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  // Value for payment info.
  paymentValue: {
    fontSize: 14,
    color: COLORS.dark,
  },
  // Badge for payment status.
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  // Badge style for 'paid' status.
  paidBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  // Badge style for 'pending' status.
  pendingBadge: {
    backgroundColor: "rgba(243, 156, 18, 0.1)",
  },
  // Text for payment status.
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Text color for 'paid' status.
  paidText: {
    color: "#2ECC71",
  },
  // Text color for 'pending' status.
  pendingText: {
    color: "#F39C12",
  },
  // Style for notes text.
  notesText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 22,
  },
  // Container for loading indicator.
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // Text shown during loading.
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  // Container for error message.
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // Text for error message.
  errorText: {
    fontSize: 16,
    color: COLORS.dark,
    textAlign: "center",
    marginVertical: 16,
  },
  // Button to retry fetching data.
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  // Text for the retry button.
  retryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
});
