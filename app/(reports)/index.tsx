// app/(reports)/index.tsx

import {
  Feather,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import auth context
import { getDashboardStats } from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define types for dashboard stats
interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  newCustomers: number;
  topSellingProduct: {
    name: string;
    sales: number;
    change: number;
  } | null;
  topSalesRep: {
    name: string;
    sales: number;
    change: number;
  } | null;
}

export default function Reports() {
  const { hasPermission } = useAuth(); // Get permission check function
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    newCustomers: 0,
    topSellingProduct: null,
    topSalesRep: null,
  });

  // Check if user has permission to view reports
  useEffect(() => {
    if (!hasPermission("view_reports")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to access reports.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } else {
      fetchDashboardStats();
    }
  }, [hasPermission]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Get current time of day to display greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Get current date in readable format
  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options);
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to fetch dashboard stats:", err);
      setError(err.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.companyName}>Roo Herbals</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RH</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading report data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.companyName}>Roo Herbals</Text>
        </View>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RH</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Date */}
        <Text style={styles.dateText}>{getCurrentDate()}</Text>

        {/* Daily Sales Report Button */}
        <TouchableOpacity
          style={styles.dailyReportButton}
          onPress={() => router.push("../generate-daily-report")}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={22}
            color={COLORS.light}
          />
          <Text style={styles.dailyReportText}>Daily Sales Report</Text>
        </TouchableOpacity>

        {/* Summary Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.salesCard]}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Sales</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stats.totalSales)}
              </Text>
              <Text style={styles.statPeriod}>This month</Text>
            </View>
            <View style={[styles.statIconContainer, styles.salesIconContainer]}>
              <MaterialIcons
                name="attach-money"
                size={24}
                color={COLORS.light}
              />
            </View>
          </View>

          <View style={[styles.statCard, styles.ordersCard]}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Orders</Text>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statPeriod}>This month</Text>
            </View>
            <View
              style={[styles.statIconContainer, styles.ordersIconContainer]}
            >
              <Feather name="shopping-cart" size={22} color={COLORS.light} />
            </View>
          </View>

          <View style={[styles.statCard, styles.customersCard]}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>New Customers</Text>
              <Text style={styles.statValue}>{stats.newCustomers}</Text>
              <Text style={styles.statPeriod}>This month</Text>
            </View>
            <View
              style={[styles.statIconContainer, styles.customersIconContainer]}
            >
              <Feather name="users" size={22} color={COLORS.light} />
            </View>
          </View>
        </View>

        {/* Reports Section Title */}
        <Text style={styles.sectionTitle}>Reports</Text>

        {/* Reports Grid */}
        <View style={styles.reportsContainer}>
          {/* Sales Reports */}
          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push("/(reports)/sales-reports")}
          >
            <View
              style={[
                styles.reportIconContainer,
                { backgroundColor: "#4ECDC4" },
              ]}
            >
              <MaterialCommunityIcons
                name="chart-line"
                size={26}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.reportTitle}>Sales Reports</Text>
            <Text style={styles.reportDescription}>
              View sales by period, product, or representative
            </Text>
          </TouchableOpacity>

          {/* Inventory Reports */}
          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push("../inventory-reports")}
          >
            <View
              style={[
                styles.reportIconContainer,
                { backgroundColor: "#FF7675" },
              ]}
            >
              <Feather name="package" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.reportTitle}>Inventory</Text>
            <Text style={styles.reportDescription}>
              Stock levels, batch status, and expiry tracking
            </Text>
          </TouchableOpacity>

          {/* Customer Reports */}
          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push("../customer-reports")}
          >
            <View
              style={[
                styles.reportIconContainer,
                { backgroundColor: "#A29BFE" },
              ]}
            >
              <FontAwesome5 name="users" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.reportTitle}>Customer Reports</Text>
            <Text style={styles.reportDescription}>
              Customer insights, credits, and payment status
            </Text>
          </TouchableOpacity>

          {/* Commission Reports */}
          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => router.push("../commission-reports")}
          >
            <View
              style={[
                styles.reportIconContainer,
                { backgroundColor: COLORS.primary },
              ]}
            >
              <FontAwesome5 name="percentage" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.reportTitle}>Commissions</Text>
            <Text style={styles.reportDescription}>
              Sales rep performance and commission tracking
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Insights */}
        <Text style={styles.sectionTitle}>Analytics & Insights</Text>

        {/* Analytics Cards */}
        {stats.topSellingProduct && (
          <TouchableOpacity
            style={styles.analyticsCard}
            onPress={() => router.push("../top-products")}
          >
            <View style={styles.analyticsContent}>
              <View style={styles.analyticsHeader}>
                <View
                  style={[
                    styles.analyticsBadge,
                    {
                      backgroundColor:
                        stats.topSellingProduct.change >= 0
                          ? "rgba(46, 204, 113, 0.1)"
                          : "rgba(231, 76, 60, 0.1)",
                    },
                  ]}
                >
                  <Octicons
                    name="graph"
                    size={16}
                    color={
                      stats.topSellingProduct.change >= 0
                        ? "#2ECC71"
                        : "#E74C3C"
                    }
                  />
                  <Text
                    style={[
                      styles.analyticsBadgeText,
                      {
                        color:
                          stats.topSellingProduct.change >= 0
                            ? "#2ECC71"
                            : "#E74C3C",
                      },
                    ]}
                  >
                    {stats.topSellingProduct.change >= 0 ? "+" : ""}
                    {stats.topSellingProduct.change}%
                  </Text>
                </View>
                <Text style={styles.analyticsTitle}>Top Selling Products</Text>
              </View>
              <Text style={styles.analyticsDescription}>
                {stats.topSellingProduct.name} remains the top seller with
                {stats.topSellingProduct.change >= 0 ? " a " : " "}
                {Math.abs(stats.topSellingProduct.change)}%
                {stats.topSellingProduct.change >= 0
                  ? " increase"
                  : " decrease"}{" "}
                from last month.
              </Text>
              <Text style={styles.analyticsAction}>View Analysis</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#ADB5BD" />
          </TouchableOpacity>
        )}

        {stats.topSalesRep && (
          <TouchableOpacity
            style={styles.analyticsCard}
            onPress={() => router.push("../top-sales-reps")}
          >
            <View style={styles.analyticsContent}>
              <View style={styles.analyticsHeader}>
                <View
                  style={[
                    styles.analyticsBadge,
                    {
                      backgroundColor:
                        stats.topSalesRep.change >= 0
                          ? "rgba(46, 204, 113, 0.1)"
                          : "rgba(231, 76, 60, 0.1)",
                    },
                  ]}
                >
                  <Octicons
                    name="graph"
                    size={16}
                    color={
                      stats.topSalesRep.change >= 0 ? "#2ECC71" : "#E74C3C"
                    }
                  />
                  <Text
                    style={[
                      styles.analyticsBadgeText,
                      {
                        color:
                          stats.topSalesRep.change >= 0 ? "#2ECC71" : "#E74C3C",
                      },
                    ]}
                  >
                    {stats.topSalesRep.change >= 0 ? "+" : ""}
                    {stats.topSalesRep.change}%
                  </Text>
                </View>
                <Text style={styles.analyticsTitle}>
                  Top Sales Representative
                </Text>
              </View>
              <Text style={styles.analyticsDescription}>
                {stats.topSalesRep.name} is our top performer with
                {stats.topSalesRep.change >= 0 ? " a " : " "}
                {Math.abs(stats.topSalesRep.change)}%
                {stats.topSalesRep.change >= 0 ? " increase" : " decrease"} in
                sales compared to last month.
              </Text>
              <Text style={styles.analyticsAction}>View Analysis</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#ADB5BD" />
          </TouchableOpacity>
        )}

        {/* Bottom spacing to avoid navigation overlap */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90, // Extra padding at bottom to avoid navigation overlap
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 40 : 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  companyName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.light,
    marginTop: 2,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logoText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 16,
  },
  dailyReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dailyReportText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.light,
    marginLeft: 10,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  salesCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
  },
  ordersCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF7675",
  },
  customersCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#A29BFE",
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  statPeriod: {
    fontSize: 12,
    color: "#ADB5BD",
    marginTop: 4,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  salesIconContainer: {
    backgroundColor: "#4ECDC4",
  },
  ordersIconContainer: {
    backgroundColor: "#FF7675",
  },
  customersIconContainer: {
    backgroundColor: "#A29BFE",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
  },
  reportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  reportCard: {
    width: cardWidth,
    backgroundColor: COLORS.light,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  reportIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 6,
  },
  reportDescription: {
    fontSize: 12,
    color: "#6c757d",
    lineHeight: 16,
  },
  analyticsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  analyticsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  analyticsBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  analyticsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
  },
  analyticsDescription: {
    fontSize: 13,
    color: "#6c757d",
    lineHeight: 18,
    marginBottom: 10,
  },
  analyticsAction: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  bottomSpacer: {
    height: 30,
  },
});
