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
import {
  getSalesRepAllOrders,
  getSalesRepById,
  getSalesRepCommissions,
  getSalesRepDetailStats,
  updateCommissionStatus,
  updateSalesRep,
} from "../services/salesRepApi";
import { COLORS } from "../theme/colors";

// Define TypeScript interfaces for SalesRep, SalesStats, Order, and Commission
interface SalesRep {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

interface SalesStats {
  totalOrders: number;
  totalSales: number;
  customersCount: number;
  recentOrders: Order[];
}

interface Order {
  order_id: string;
  order_date: string;
  total_amount: number;
  status: string;
  customer_name: string;
}

interface Commission {
  commission_id: string;
  month: number;
  year: number;
  total_sales: number;
  commission_rate: number;
  amount: number;
  status: string;
  payment_date: string | null;
}

export default function SalesRepDetailScreen() {
  // Get salesRepId from navigation params
  const { salesRepId } = useLocalSearchParams();
  // State variables for loading, sales rep data, stats, commissions, tab, etc.
  const [loading, setLoading] = useState(true);
  const [salesRep, setSalesRep] = useState<SalesRep | null>(null);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [processingCommissionId, setProcessingCommissionId] = useState<
    string | null
  >(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  // New states for all orders
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    // Fetch sales rep data when component mounts or salesRepId changes
    fetchSalesRepData();
  }, [salesRepId]);

  // Fetch sales rep details, stats, and commissions from API
  const fetchSalesRepData = async () => {
    try {
      setLoading(true);

      // Fetch the sales rep data
      const salesRepData = await getSalesRepById(salesRepId as string);
      setSalesRep(salesRepData);

      // Fetch the sales rep stats
      const statsData = await getSalesRepDetailStats(salesRepId as string);
      setStats(statsData.stats);

      // Fetch the sales rep commissions
      const commissionsData = await getSalesRepCommissions(
        salesRepId as string
      );
      setCommissions(commissionsData);

      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching sales rep data:", error);
      Alert.alert(
        "Error",
        error.message ||
          "Failed to load sales representative data. Please check your connection and try again."
      );

      // Set loading to false even when there's an error
      setLoading(false);
    }
  };

  // Fetch all orders for the sales rep (for Orders tab)
  const fetchAllOrders = async () => {
    try {
      setLoadingOrders(true);
      const ordersData = await getSalesRepAllOrders(salesRepId as string);
      setAllOrders(ordersData);
      setLoadingOrders(false);
    } catch (error: any) {
      console.error("Error fetching all orders:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to load orders. Please try again."
      );
      setLoadingOrders(false);
    }
  };

  // Handle commission approve/pay actions
  const handleCommissionAction = async (
    commissionId: string,
    action: "approve" | "pay"
  ) => {
    try {
      setProcessingCommissionId(commissionId);

      const status = action === "approve" ? "approved" : "paid";
      const payment_date =
        action === "pay" ? new Date().toISOString() : undefined;

      // Call the API to update the commission status
      await updateCommissionStatus(
        salesRepId as string,
        commissionId,
        status,
        payment_date
      );

      // Update the commissions list in UI after successful API call
      const updatedCommissions = commissions.map((c) => {
        if (c.commission_id === commissionId) {
          return {
            ...c,
            status,
            payment_date:
              action === "pay" ? new Date().toISOString() : c.payment_date,
          };
        }
        return c;
      });

      setCommissions(updatedCommissions);
      setProcessingCommissionId(null);

      Alert.alert(
        "Success",
        `Commission ${action === "approve" ? "approved" : "paid"} successfully`
      );
    } catch (error: any) {
      console.error(`Error ${action}ing commission:`, error);
      Alert.alert("Error", error.message || `Failed to ${action} commission`);
      setProcessingCommissionId(null);
    }
  };

  // Toggle sales rep active/inactive status
  const handleToggleStatus = async () => {
    if (!salesRep) return;

    try {
      setUpdatingStatus(true);

      const newStatus = !salesRep.is_active;
      const statusLabel = newStatus ? "activate" : "deactivate";

      // Confirm before changing status
      Alert.alert(
        "Change Status",
        `Are you sure you want to ${statusLabel} this sales representative?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setUpdatingStatus(false),
          },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                // Call the API to update the sales rep status
                await updateSalesRep(salesRep.user_id, {
                  is_active: newStatus,
                });

                // Update local state
                setSalesRep({
                  ...salesRep,
                  is_active: newStatus,
                });

                Alert.alert(
                  "Success",
                  `Sales representative has been ${
                    newStatus ? "activated" : "deactivated"
                  } successfully`
                );
              } catch (error: any) {
                console.error("Error updating sales rep status:", error);
                Alert.alert(
                  "Error",
                  error.message ||
                    `Failed to ${statusLabel} sales representative`
                );
              } finally {
                setUpdatingStatus(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error toggling status:", error);
      Alert.alert("Error", error.message || "Failed to change status");
      setUpdatingStatus(false);
    }
  };

  // Open phone dialer with sales rep's phone number
  const handleCall = () => {
    if (salesRep?.phone) {
      Linking.openURL(`tel:${salesRep.phone}`);
    }
  };

  // Open email client with sales rep's email
  const handleEmail = () => {
    if (salesRep?.email) {
      Linking.openURL(`mailto:${salesRep.email}`);
    }
  };

  // Format number as currency string
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  // Format date string to locale date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get month name from month number
  const getMonthName = (month: number) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1];
  };

  // Get color for order status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "#4ECDC4"; // Green
      case "processing":
        return "#FDCB6E"; // Yellow
      case "pending":
        return "#A29BFE"; // Purple
      case "cancelled":
        return "#FF6B6B"; // Red
      default:
        return "#ADB5BD"; // Gray
    }
  };

  // Get color for commission status
  const getCommissionStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#4ECDC4"; // Green
      case "approved":
        return "#FDCB6E"; // Yellow
      case "calculated":
        return "#A29BFE"; // Purple
      default:
        return "#ADB5BD"; // Gray
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales Representative</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading sales representative data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error UI if sales rep not found
  if (!salesRep) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales Representative</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Sales Rep Not Found</Text>
          <Text style={styles.errorMessage}>
            The sales representative you&apos;re looking for doesn&apos;t exist
            or could not be loaded.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSalesRepData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main UI rendering
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar and header with back and edit buttons */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        {/* Title */}
        <Text style={styles.headerTitle}>Sales Representative</Text>
        {/* Edit button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (salesRep) {
              router.push({
                pathname: "../(salesreps)/sales-rep-edit",
                params: { salesRepId: salesRep.user_id },
              });
            } else {
              Alert.alert(
                "Error",
                "Cannot edit sales representative: data not loaded"
              );
            }
          }}
        >
          <MaterialIcons name="edit" size={22} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Main scrollable content */}
      <ScrollView style={styles.scrollContainer}>
        {/* Sales Rep Profile Card: avatar, name, status, info, and action buttons */}
        <View style={styles.profileCard}>
          {/* Profile header with avatar and name/status */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {salesRep.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.salesRepName}>{salesRep.full_name}</Text>
              <View style={styles.badgeContainer}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: salesRep.is_active
                        ? "#4ECDC4"
                        : "#FF6B6B",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {salesRep.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Info rows: area, phone, email, address, commission rate */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.infoText}>{salesRep.area}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="call" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.infoText}>{salesRep.phone}</Text>
            </View>

            {salesRep.email && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialCommunityIcons
                    name="email"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.infoText}>{salesRep.email}</Text>
              </View>
            )}

            {salesRep.address && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="home" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.infoText}>{salesRep.address}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="attach-money"
                  size={18}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.infoText}>
                Commission Rate: {salesRep.commission_rate}%
              </Text>
            </View>
          </View>

          {/* Action buttons: Call, Email, Activate/Deactivate */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <Ionicons name="call" size={18} color={COLORS.light} />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleEmail}
              disabled={!salesRep.email}
            >
              <MaterialCommunityIcons
                name="email"
                size={18}
                color={COLORS.light}
              />
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusToggleButton}
              onPress={handleToggleStatus}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color={COLORS.light} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={salesRep.is_active ? "account-off" : "account-check"}
                    size={18}
                    color={COLORS.light}
                  />
                  <Text style={styles.contactButtonText}>
                    {salesRep.is_active ? "Deactivate" : "Activate"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* Tab navigation: Overview, Commissions, Orders */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "overview" ? styles.activeTab : null,
            ]}
            onPress={() => setActiveTab("overview")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "overview" ? styles.activeTabText : null,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "commissions" ? styles.activeTab : null,
            ]}
            onPress={() => setActiveTab("commissions")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "commissions" ? styles.activeTabText : null,
              ]}
            >
              Commissions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "orders" ? styles.activeTab : null,
            ]}
            onPress={() => {
              setActiveTab("orders");
              fetchAllOrders(); // Fetch all orders when tab is selected
            }}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "orders" ? styles.activeTabText : null,
              ]}
            >
              Orders
            </Text>
          </TouchableOpacity>
        </View>
        {/* Tab content: Overview, Commissions, or Orders based on activeTab */}
        {activeTab === "overview" && stats && (
          <View style={styles.tabContentContainer}>
            {/* Stats cards: Total Orders, Total Sales, Customers */}
            <View style={styles.statsCardsContainer}>
              <View style={styles.statsCard}>
                <View style={styles.statsIconContainer}>
                  <MaterialCommunityIcons
                    name="cart"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.statsValue}>{stats.totalOrders}</Text>
                <Text style={styles.statsLabel}>Total Orders</Text>
              </View>

              <View style={styles.statsCard}>
                <View style={styles.statsIconContainer}>
                  <MaterialIcons
                    name="attach-money"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.statsValue}>
                  {formatCurrency(stats.totalSales)}
                </Text>
                <Text style={styles.statsLabel}>Total Sales</Text>
              </View>

              <View style={styles.statsCard}>
                <View style={styles.statsIconContainer}>
                  <MaterialCommunityIcons
                    name="store"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.statsValue}>{stats.customersCount}</Text>
                <Text style={styles.statsLabel}>Customers</Text>
              </View>
            </View>

            {/* Recent Orders section with See All button */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => {
                    setActiveTab("orders");
                    fetchAllOrders(); // Fetch all orders when "See All" is clicked
                  }}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <MaterialIcons
                    name="arrow-forward-ios"
                    size={12}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>

              {stats.recentOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="cart-off"
                    size={50}
                    color="#CED4DA"
                  />
                  <Text style={styles.emptyTitle}>No Orders Yet</Text>
                  <Text style={styles.emptyMessage}>
                    This sales representative hasn&apos;t made any orders yet.
                  </Text>
                </View>
              ) : (
                stats.recentOrders.map((order, index) => (
                  <TouchableOpacity
                    key={order.order_id}
                    style={styles.orderItem}
                    onPress={() =>
                      router.push({
                        pathname: "/(orders)/order-details",
                        params: { orderId: order.order_id },
                      })
                    }
                  >
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderId}>
                        Order #{order.order_id.substring(1)}
                      </Text>
                      <View
                        style={[
                          styles.orderStatusBadge,
                          { backgroundColor: getStatusColor(order.status) },
                        ]}
                      >
                        <Text style={styles.orderStatusText}>
                          {order.status.charAt(0).toUpperCase() +
                            order.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderDetails}>
                      <View style={styles.orderDetail}>
                        <Text style={styles.orderDetailLabel}>Customer:</Text>
                        <Text style={styles.orderDetailValue}>
                          {order.customer_name}
                        </Text>
                      </View>

                      <View style={styles.orderDetail}>
                        <Text style={styles.orderDetailLabel}>Date:</Text>
                        <Text style={styles.orderDetailValue}>
                          {formatDate(order.order_date)}
                        </Text>
                      </View>

                      <View style={styles.orderDetail}>
                        <Text style={styles.orderDetailLabel}>Amount:</Text>
                        <Text style={styles.orderDetailValue}>
                          {formatCurrency(order.total_amount)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderActions}>
                      <TouchableOpacity style={styles.orderActionButton}>
                        <Feather name="eye" size={16} color={COLORS.primary} />
                        <Text style={styles.orderActionText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}
        {activeTab === "commissions" && (
          <View style={styles.tabContentContainer}>
            {/* Commissions history list */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Commissions History</Text>
            </View>
            {commissions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="cash-remove"
                  size={60}
                  color="#CED4DA"
                />
                <Text style={styles.emptyTitle}>No Commissions</Text>
                <Text style={styles.emptyMessage}>
                  This sales representative has no commission records yet.
                </Text>
              </View>
            ) : (
              commissions.map((commission) => (
                <View
                  key={commission.commission_id}
                  style={styles.commissionCard}
                >
                  <View style={styles.commissionHeader}>
                    <View style={styles.commissionPeriod}>
                      <Text style={styles.commissionPeriodText}>
                        {getMonthName(commission.month)} {commission.year}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.commissionStatusBadge,
                        {
                          backgroundColor: getCommissionStatusColor(
                            commission.status
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.commissionStatusText}>
                        {commission.status.charAt(0).toUpperCase() +
                          commission.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.commissionDetails}>
                    <View style={styles.commissionDetail}>
                      <Text style={styles.commissionDetailLabel}>
                        Total Sales:
                      </Text>
                      <Text style={styles.commissionDetailValue}>
                        {formatCurrency(commission.total_sales)}
                      </Text>
                    </View>

                    <View style={styles.commissionDetail}>
                      <Text style={styles.commissionDetailLabel}>
                        Commission Rate:
                      </Text>
                      <Text style={styles.commissionDetailValue}>
                        {commission.commission_rate}%
                      </Text>
                    </View>

                    <View style={styles.commissionDetail}>
                      <Text style={styles.commissionDetailLabel}>
                        Commission Amount:
                      </Text>
                      <Text
                        style={[
                          styles.commissionDetailValue,
                          styles.commissionAmount,
                        ]}
                      >
                        {formatCurrency(commission.amount)}
                      </Text>
                    </View>

                    {commission.status === "paid" &&
                      commission.payment_date && (
                        <View style={styles.commissionDetail}>
                          <Text style={styles.commissionDetailLabel}>
                            Payment Date:
                          </Text>
                          <Text style={styles.commissionDetailValue}>
                            {formatDate(commission.payment_date)}
                          </Text>
                        </View>
                      )}
                  </View>

                  <View style={styles.commissionActions}>
                    {commission.status === "calculated" && (
                      <TouchableOpacity
                        style={styles.commissionActionButton}
                        disabled={
                          processingCommissionId === commission.commission_id
                        }
                        onPress={() =>
                          handleCommissionAction(
                            commission.commission_id,
                            "approve"
                          )
                        }
                      >
                        {processingCommissionId === commission.commission_id ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.light}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={COLORS.light}
                            />
                            <Text style={styles.commissionActionText}>
                              Approve
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {commission.status === "approved" && (
                      <TouchableOpacity
                        style={styles.commissionActionButton}
                        disabled={
                          processingCommissionId === commission.commission_id
                        }
                        onPress={() =>
                          handleCommissionAction(
                            commission.commission_id,
                            "pay"
                          )
                        }
                      >
                        {processingCommissionId === commission.commission_id ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.light}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="payments"
                              size={16}
                              color={COLORS.light}
                            />
                            <Text style={styles.commissionActionText}>Pay</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {commission.status === "paid" && (
                      <View style={styles.paidStatusContainer}>
                        <MaterialCommunityIcons
                          name="check-decagram"
                          size={18}
                          color="#4ECDC4"
                        />
                        <Text style={styles.paidStatusText}>Paid</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "orders" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Orders History</Text>
            </View>

            {/* Orders history list */}
            {loadingOrders ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : allOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="cart-off"
                  size={60}
                  color="#CED4DA"
                />
                <Text style={styles.emptyTitle}>No Orders</Text>
                <Text style={styles.emptyMessage}>
                  This sales representative has no orders yet.
                </Text>
              </View>
            ) : (
              allOrders.map((order, index) => (
                <TouchableOpacity
                  key={order.order_id}
                  style={styles.orderItem}
                  onPress={() =>
                    router.push({
                      pathname: "/(orders)/order-details",
                      params: { orderId: order.order_id },
                    })
                  }
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>
                      Order #{order.order_id.substring(1)}
                    </Text>
                    <View
                      style={[
                        styles.orderStatusBadge,
                        { backgroundColor: getStatusColor(order.status) },
                      ]}
                    >
                      <Text style={styles.orderStatusText}>
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Customer:</Text>
                      <Text style={styles.orderDetailValue}>
                        {order.customer_name}
                      </Text>
                    </View>

                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Date:</Text>
                      <Text style={styles.orderDetailValue}>
                        {formatDate(order.order_date)}
                      </Text>
                    </View>

                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Amount:</Text>
                      <Text style={styles.orderDetailValue}>
                        {formatCurrency(order.total_amount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderActions}>
                    <TouchableOpacity
                      style={styles.orderActionButton}
                      onPress={() =>
                        router.push({
                          pathname: "/(orders)/order-details",
                          params: { orderId: order.order_id },
                        })
                      }
                    >
                      <Feather name="eye" size={16} color={COLORS.primary} />
                      <Text style={styles.orderActionText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
        {/* Bottom spacer for scroll padding */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles for the component UI elements
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
  },
  actionButton: {
    width: 24,
    alignItems: "flex-end",
  },
  scrollContainer: {
    flex: 1,
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
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
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
  profileCard: {
    backgroundColor: COLORS.light,
    margin: 15,
    borderRadius: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.light,
  },
  nameContainer: {
    flex: 1,
  },
  salesRepName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: "row",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "600",
  },
  infoContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.dark,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    padding: 15,
    justifyContent: "space-between",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
  },
  statusToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flex: 1,
  },
  contactButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    marginLeft: 5,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  activeTabText: {
    color: COLORS.light,
  },
  tabContentContainer: {
    flex: 1,
  },
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 15,
    marginBottom: 15,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 5,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 10,
    color: "#6c757d",
  },
  sectionContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    padding: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
    marginRight: 3,
  },
  orderItem: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE",
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  orderStatusText: {
    color: COLORS.light,
    fontSize: 11,
    fontWeight: "600",
  },
  orderDetails: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  orderDetail: {
    flexDirection: "row",
    marginBottom: 5,
  },
  orderDetailLabel: {
    width: 80,
    fontSize: 13,
    color: "#6c757d",
  },
  orderDetailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.dark,
  },
  orderActions: {
    flexDirection: "row",
    padding: 10,
    justifyContent: "flex-end",
  },
  orderActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  orderActionText: {
    fontSize: 12,
    marginLeft: 5,
    color: COLORS.primary,
    fontWeight: "600",
  },
  commissionCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    margin: 15,
    marginBottom: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  commissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  commissionPeriod: {
    flex: 1,
  },
  commissionPeriodText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  commissionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commissionStatusText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "600",
  },
  commissionDetails: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  commissionDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  commissionDetailLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  commissionDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  commissionAmount: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  commissionActions: {
    padding: 12,
    alignItems: "flex-end",
  },
  commissionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  commissionActionText: {
    fontSize: 13,
    color: COLORS.light,
    fontWeight: "600",
    marginLeft: 5,
  },
  paidStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paidStatusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ECDC4",
    marginLeft: 5,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 10,
    marginBottom: 5,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterButtonText: {
    fontSize: 12,
    marginLeft: 5,
    color: COLORS.primary,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 95, // Provides some space at the bottom of the content
  },
});
