// Import necessary components and libraries from React, React Native, and Expo
import {
  AntDesign,
  Feather,
  FontAwesome5,
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
// Import API functions for fetching and updating driver data
import { getDriverById, toggleDriverStatus } from "../services/driverApi";
// Import color constants for styling
import { COLORS } from "../theme/colors";

// Define the structure for a single delivery record
interface DeliveryData {
  delivery_id: string;
  order_id: string;
  customer_name: string;
  scheduled_date: string;
  status: string;
  city?: string;
  total_amount: number;
  vehicle_name?: string;
  registration_number?: string;
}

// Define the structure for the complete driver data, including stats and recent deliveries
interface DriverData {
  user_id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stats: {
    total_deliveries: number;
    completed_deliveries: number;
    failed_deliveries: number;
    completion_rate: string;
  };
  recent_deliveries: DeliveryData[];
}

// The main component for displaying driver details
export default function DriverDetailScreen() {
  // Get route parameters, specifically the driver's ID
  const params = useLocalSearchParams();
  const { id } = params;
  // State for managing loading status
  const [loading, setLoading] = useState(true);
  // State for storing any errors that occur during data fetching
  const [error, setError] = useState<string | null>(null);
  // State for holding the fetched driver data
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  // State to track if the driver's status is being updated
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper function to format date strings into a more readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Asynchronous function to fetch driver data from the API
  const fetchDriverData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Log the ID for debugging purposes
      console.log("Fetching driver data for ID:", id);
      // Call the API to get driver data
      const data = await getDriverById(id as string);
      // Log the received data for debugging
      console.log("Driver data received:", data);

      // Set the fetched data to state
      setDriverData(data);
    } catch (err: any) {
      // Log any errors that occur
      console.error("Error fetching driver data:", err);
      // Set an error message to be displayed to the user
      setError(
        err.message || "Could not load driver details. Please try again."
      );
    } finally {
      // Stop the loading indicator
      setLoading(false);
    }
  }, [id]);

  // Function to share driver's contact information using the device's share feature
  const shareDriverInfo = async () => {
    if (!driverData) return;

    try {
      // Use the Share API to open the share dialog
      await Share.share({
        message: `Driver Details:\nName: ${driverData.full_name}\nPhone: ${driverData.phone}\nEmail: ${driverData.email}`,
        title: "Driver Contact Information",
      });
    } catch {
      // Show an alert if sharing fails
      Alert.alert("Error", "Could not share driver information");
    }
  };

  // Function to initiate a phone call to the driver
  const handleCall = () => {
    if (!driverData?.phone) {
      Alert.alert("Error", "No phone number available");
      return;
    }

    // Check if the device can handle phone calls and open the dialer
    Linking.canOpenURL(`tel:${driverData.phone}`)
      .then((supported) => {
        if (supported) {
          Linking.openURL(`tel:${driverData.phone}`);
        } else {
          Alert.alert("Error", "Phone calls not supported on this device");
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Could not open phone app");
      });
  };

  // Function to open the messaging app to send an SMS to the driver
  const handleMessage = () => {
    if (!driverData?.phone) {
      Alert.alert("Error", "No phone number available");
      return;
    }

    // Check if the device can handle SMS and open the messaging app
    Linking.canOpenURL(`sms:${driverData.phone}`)
      .then((supported) => {
        if (supported) {
          Linking.openURL(`sms:${driverData.phone}`);
        } else {
          Alert.alert("Error", "SMS not supported on this device");
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Could not open messaging app");
      });
  };

  // Function to open the email app to send an email to the driver
  const handleEmail = () => {
    if (!driverData?.email) {
      Alert.alert("Error", "No email address available");
      return;
    }

    // Check if the device can handle emails and open the email client
    Linking.canOpenURL(`mailto:${driverData.email}`)
      .then((supported) => {
        if (supported) {
          Linking.openURL(`mailto:${driverData.email}`);
        } else {
          Alert.alert("Error", "Email not supported on this device");
        }
      })
      .catch((err) => {
        Alert.alert("Error", "Could not open email app");
      });
  };

  // Function to toggle the driver's active/inactive status
  const handleToggleDriverStatus = () => {
    if (!driverData) return;

    const newStatus = !driverData.is_active;
    const actionText = newStatus ? "Activate" : "Deactivate";

    // Show a confirmation dialog before changing the status
    Alert.alert(
      `${actionText} Driver`,
      `Are you sure you want to ${actionText.toLowerCase()} this driver?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText,
          style: newStatus ? "default" : "destructive",
          onPress: async () => {
            try {
              setIsUpdating(true);
              // Call the API to toggle the driver's status
              await toggleDriverStatus(driverData.user_id, newStatus);

              // Update the local state to reflect the change immediately
              setDriverData((prev) => {
                if (!prev) return null;
                return { ...prev, is_active: newStatus };
              });

              // Show a success message
              Alert.alert(
                "Success",
                `Driver ${newStatus ? "activated" : "deactivated"} successfully`
              );
            } catch (err: any) {
              // Show an error message if the API call fails
              console.error("Error toggling driver status:", err);
              Alert.alert(
                "Error",
                `Could not ${actionText.toLowerCase()} driver. Please try again.`
              );
            } finally {
              // Stop the updating indicator
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // useEffect hook to fetch driver data when the component mounts or the ID changes
  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  // Conditional rendering: Show a loading indicator while data is being fetched
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Header for the loading screen */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Details</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Loading spinner and text */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading driver details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Conditional rendering: Show an error message if data fetching fails
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Header for the error screen */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Details</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Error icon, message, and a retry button */}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchDriverData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If there's no driver data, render nothing
  if (!driverData) {
    return null;
  }

  // Main component UI rendered when data is successfully fetched
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom header with back button, title, and share button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Details</Text>
        <TouchableOpacity onPress={shareDriverInfo} style={styles.shareButton}>
          <Feather name="share-2" size={20} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content area */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Card displaying the driver's profile information */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {/* Placeholder for driver's profile image */}
              <View style={[styles.profileImage, styles.noImageContainer]}>
                <FontAwesome5 name="user-alt" size={40} color="#CED4DA" />
              </View>
              {/* Badge indicating the driver's active status */}
              <View
                style={[
                  styles.statusBadge,
                  driverData.is_active
                    ? styles.activeBadge
                    : styles.inactiveBadge,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    driverData.is_active
                      ? styles.activeDot
                      : styles.inactiveDot,
                  ]}
                />
              </View>
            </View>

            {/* Driver's name and completion rate */}
            <View style={styles.profileInfo}>
              <Text style={styles.driverName}>{driverData.full_name}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>
                  Completion Rate: {driverData.stats.completion_rate}%
                </Text>
              </View>
            </View>
          </View>

          {/* Container for delivery statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {driverData.stats.total_deliveries}
              </Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {driverData.stats.completed_deliveries}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {driverData.stats.failed_deliveries}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Action buttons for contacting the driver */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={handleCall}
          >
            <Feather name="phone" size={20} color={COLORS.light} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={handleMessage}
          >
            <Feather name="message-circle" size={20} color={COLORS.light} />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.emailButton]}
            onPress={handleEmail}
          >
            <Feather name="mail" size={20} color={COLORS.light} />
            <Text style={styles.actionButtonText}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Card displaying detailed driver information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Driver Information</Text>

          {/* Phone Number */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons name="phone" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{driverData.phone || "N/A"}</Text>
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons name="email" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{driverData.email || "N/A"}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons name="home" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {driverData.address || "N/A"}
              </Text>
            </View>
          </View>

          {/* Created At Date */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons
                name="date-range"
                size={18}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Created At</Text>
              <Text style={styles.infoValue}>
                {formatDate(driverData.created_at)}
              </Text>
            </View>
          </View>

          {/* Updated At Date */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons
                name="calendar-today"
                size={18}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Updated At</Text>
              <Text style={styles.infoValue}>
                {formatDate(driverData.updated_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Card displaying recent deliveries */}
        <View style={styles.deliveriesCard}>
          <View style={styles.deliveriesTitleRow}>
            <Text style={styles.cardTitle}>Recent Deliveries</Text>
          </View>

          {/* Conditionally render the list of deliveries or a 'no deliveries' message */}
          {driverData.recent_deliveries.length > 0 ? (
            driverData.recent_deliveries.map((delivery, index) => (
              <View
                key={delivery.delivery_id}
                style={[
                  styles.deliveryItem,
                  index === driverData.recent_deliveries.length - 1
                    ? { borderBottomWidth: 0 }
                    : {},
                ]}
              >
                <View style={styles.deliveryHeader}>
                  <Text style={styles.customerName}>
                    {delivery.customer_name}
                  </Text>
                  {/* Badge indicating the status of the delivery */}
                  <View
                    style={[
                      styles.deliveryStatusBadge,
                      delivery.status === "delivered"
                        ? styles.completedBadge
                        : delivery.status === "in_progress"
                        ? styles.inProgressBadge
                        : delivery.status === "failed"
                        ? { backgroundColor: "rgba(231, 76, 60, 0.1)" }
                        : styles.scheduledBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deliveryStatusText,
                        delivery.status === "delivered"
                          ? { color: "#2ECC71" }
                          : delivery.status === "in_progress"
                          ? { color: "#3498DB" }
                          : delivery.status === "failed"
                          ? { color: "#E74C3C" }
                          : { color: "#9B59B6" },
                      ]}
                    >
                      {/* Format the status text for display */}
                      {delivery.status === "delivered"
                        ? "Delivered"
                        : delivery.status === "in_progress"
                        ? "In Progress"
                        : delivery.status === "failed"
                        ? "Failed"
                        : "Scheduled"}
                    </Text>
                  </View>
                </View>

                {/* Display the order number */}
                <View style={styles.orderNumberContainer}>
                  <Text style={styles.orderNumberLabel}>Order #:</Text>
                  <Text style={styles.orderNumberValue}>
                    {delivery.order_id}
                  </Text>
                </View>

                {/* Display delivery details like location, date, and amount */}
                <View style={styles.deliveryDetails}>
                  <View style={styles.deliveryInfoItem}>
                    <MaterialIcons
                      name="location-on"
                      size={14}
                      color="#6c757d"
                    />
                    <Text style={styles.deliveryInfoText}>
                      {delivery.city || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.deliveryInfoItem}>
                    <MaterialIcons name="event" size={14} color="#6c757d" />
                    <Text style={styles.deliveryInfoText}>
                      {formatDate(delivery.scheduled_date)}
                    </Text>
                  </View>

                  <View style={styles.deliveryInfoItem}>
                    <MaterialIcons
                      name="attach-money"
                      size={14}
                      color="#6c757d"
                    />
                    <Text style={styles.deliveryInfoText}>
                      Rs. {delivery.total_amount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            // Displayed when there are no recent deliveries
            <View style={styles.noDeliveriesContainer}>
              <MaterialCommunityIcons
                name="truck-delivery-outline"
                size={48}
                color="#CED4DA"
              />
              <Text style={styles.noDeliveriesText}>
                No deliveries available
              </Text>
            </View>
          )}
        </View>

        {/* Container for action buttons like Edit and Deactivate/Activate */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              // Navigate to the driver edit screen
              router.push(`../(drivers)/driver-edit?id=${driverData.user_id}`)
            }
          >
            <Feather name="edit-2" size={18} color={COLORS.light} />
            <Text style={styles.editButtonText}>Edit Driver</Text>
          </TouchableOpacity>

          {/* Conditionally render a loading indicator or the appropriate action button */}
          {isUpdating ? (
            <View
              style={[styles.deactivateButton, { backgroundColor: "#6c757d" }]}
            >
              <ActivityIndicator size="small" color={COLORS.light} />
              <Text style={styles.deactivateButtonText}>Processing...</Text>
            </View>
          ) : driverData.is_active ? (
            // Button to deactivate the driver
            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={handleToggleDriverStatus}
            >
              <MaterialIcons name="block" size={18} color={COLORS.light} />
              <Text style={styles.deactivateButtonText}>Deactivate</Text>
            </TouchableOpacity>
          ) : (
            // Button to activate the driver
            <TouchableOpacity
              style={styles.activateButton}
              onPress={handleToggleDriverStatus}
            >
              <MaterialIcons
                name="check-circle"
                size={18}
                color={COLORS.light}
              />
              <Text style={styles.activateButtonText}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Spacer at the bottom of the scroll view to prevent content from being hidden by other UI elements */}
        <View style={{ height: 95 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// StyleSheet for all the component's styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight! + 16 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.light,
  },
  shareButton: {
    padding: 8,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  noImageContainer: {
    backgroundColor: "#F1F3F5",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderWidth: 2,
    borderColor: COLORS.light,
  },
  activeBadge: {
    backgroundColor: COLORS.light,
  },
  inactiveBadge: {
    backgroundColor: COLORS.light,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeDot: {
    backgroundColor: "#2ECC71",
  },
  inactiveDot: {
    backgroundColor: "#E74C3C",
  },
  profileInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingTop: 15,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F1F3F5",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  callButton: {
    backgroundColor: "#4CAF50",
  },
  messageButton: {
    backgroundColor: "#2196F3",
  },
  emailButton: {
    backgroundColor: "#FF9800",
  },
  actionButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    marginLeft: 6,
  },
  infoCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.dark,
    marginTop: 2,
  },
  deliveriesCard: {
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
  deliveriesTitleRow: {
    marginBottom: 16,
  },
  deliveryItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    paddingVertical: 12,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  deliveryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  inProgressBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  scheduledBadge: {
    backgroundColor: "rgba(155, 89, 182, 0.1)",
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNumberLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6c757d",
    marginRight: 4,
  },
  orderNumberValue: {
    fontSize: 13,
    color: "#495057",
  },
  deliveryDetails: {
    marginBottom: 10,
  },
  deliveryInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  deliveryInfoText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 6,
  },
  noDeliveriesContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noDeliveriesText: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
  },
  editButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  deactivateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74C3C",
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
  },
  deactivateButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  activateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ECC71",
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
  },
  activateButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
});
