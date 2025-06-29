// Import necessary icon libraries for UI components
import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
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
// Import API functions for fetching sales representative data
import {
  getAllSalesReps,
  getSalesRepDetailStats,
} from "../services/salesRepApi";
import { COLORS } from "../theme/colors";

// Define the structure of a sales representative object
interface SalesRep {
  user_id: string;
  full_name: string;
  role: string;
  email: string;
  phone: string;
  area: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  // Optional stats that are loaded separately for performance
  stats?: {
    orders: number;
    sales: number;
    customers: number;
  };
}

export default function SalesRepListScreen() {
  // State management for the screen
  const [loading, setLoading] = useState(true); // Main loading state
  const [error, setError] = useState<string | null>(null); // Error handling
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]); // List of sales representatives
  const [searchQuery, setSearchQuery] = useState(""); // Search input value
  const [selectedFilter, setSelectedFilter] = useState("All"); // Active filter option
  // Track loading state for individual sales rep stats
  const [loadingStats, setLoadingStats] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Filter options for sales rep status
  const filterOptions = ["All", "Active", "Inactive"];

  // Main function to fetch sales reps data and their statistics
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        // Fetch all sales representatives from the API
        const data = await getAllSalesReps();
        setSalesReps(data);

        // Fetch individual statistics for each sales rep
        // This is done separately to avoid slow initial loading
        const statsPromises = data.map(async (rep: SalesRep) => {
          try {
            setLoadingStats((prev) => ({ ...prev, [rep.user_id]: true }));
            const statsData = await getSalesRepDetailStats(rep.user_id);
            setLoadingStats((prev) => ({ ...prev, [rep.user_id]: false }));

            return {
              ...rep,
              stats: {
                orders: statsData.stats.totalOrders || 0,
                sales: statsData.stats.totalSales || 0,
                customers: statsData.stats.customersCount || 0,
              },
            };
          } catch {
            // If stats fail to load, continue without them
            setLoadingStats((prev) => ({ ...prev, [rep.user_id]: false }));
            return rep;
          }
        });

        const repsWithStats = await Promise.all(statsPromises);
        setSalesReps(repsWithStats);
      } catch {
        // Fallback: If API fails, show sample data for demo purposes
        setTimeout(() => {
          const sampleSalesReps: SalesRep[] = [
            {
              user_id: "U002",
              full_name: "Kasun Perera",
              role: "sales_rep",
              email: "kasun@rooherbals.com",
              phone: "0712345678",
              area: "Badulla",
              commission_rate: 10.0,
              is_active: true,
              created_at: "2023-01-15T00:00:00.000Z",
              stats: { orders: 56, sales: 480000, customers: 15 },
            },
            {
              user_id: "U003",
              full_name: "Nirmal Silva",
              role: "sales_rep",
              email: "nirmal@rooherbals.com",
              phone: "0723456789",
              area: "Monaragala",
              commission_rate: 10.0,
              is_active: true,
              created_at: "2023-02-20T00:00:00.000Z",
              stats: { orders: 42, sales: 350000, customers: 12 },
            },
            {
              user_id: "U004",
              full_name: "Charith Kumarasinghe",
              role: "sales_rep",
              email: "charith@rooherbals.com",
              phone: "0734567890",
              area: "Wellawaya",
              commission_rate: 10.0,
              is_active: true,
              created_at: "2023-03-10T00:00:00.000Z",
              stats: { orders: 38, sales: 320000, customers: 10 },
            },
            {
              user_id: "U005",
              full_name: "Dileepa Senaratne",
              role: "sales_rep",
              email: "dileepa@rooherbals.com",
              phone: "0745678901",
              area: "Bandarawela",
              commission_rate: 10.0,
              is_active: false,
              created_at: "2023-04-05T00:00:00.000Z",
              stats: { orders: 25, sales: 180000, customers: 8 },
            },
          ];
          setSalesReps(sampleSalesReps);
        }, 1000);
      }
    } catch (fetchError: any) {
      // Handle any unexpected errors during data fetching
      setError(fetchError.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  // Filter sales reps based on search query and selected filter
  const getFilteredSalesReps = () => {
    return salesReps.filter((salesRep) => {
      // Filter by active/inactive status
      if (selectedFilter === "Active" && !salesRep.is_active) return false;
      if (selectedFilter === "Inactive" && salesRep.is_active) return false;

      // Filter by search query (name or area)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          salesRep.full_name.toLowerCase().includes(query) ||
          salesRep.area.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  const filteredSalesReps = getFilteredSalesReps();

  // Utility function to format date strings (currently unused but kept for future use)
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString();
  // };

  // Get statistics for a sales rep, with fallback values
  const getSalesRepStats = (salesRep: SalesRep) => {
    if (salesRep.stats) {
      return salesRep.stats;
    }
    return { orders: 0, sales: 0, customers: 0 };
  };

  // Format currency values for display
  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString()}`;
  };

  // Handle phone call functionality
  const handlePhoneCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Handle email functionality
  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Render individual sales representative card
  const renderSalesRep = ({ item }: { item: SalesRep }) => {
    const stats = getSalesRepStats(item);
    const isLoadingStats = loadingStats[item.user_id];

    return (
      <TouchableOpacity
        style={styles.salesRepCard}
        onPress={() =>
          router.push({
            pathname: "../(salesreps)/sales-rep-detail",
            params: { salesRepId: item.user_id },
          })
        }
      >
        {/* Card header with avatar, name, area, and status */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.salesRepName}>{item.full_name}</Text>
            <View style={styles.areaContainer}>
              <Ionicons name="location-outline" size={14} color="#6c757d" />
              <Text style={styles.areaText}>{item.area}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: item.is_active ? "#4ECDC4" : "#FF6B6B" },
              ]}
            >
              <Text style={styles.statusText}>
                {item.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics section - shows loading or actual stats */}
        <View style={styles.statsContainer}>
          {isLoadingStats ? (
            <View style={styles.statsLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statsLoadingText}>Loading stats...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.orders}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCurrency(stats.sales)}
                </Text>
                <Text style={styles.statLabel}>Total Sales</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.customers}</Text>
                <Text style={styles.statLabel}>Customers</Text>
              </View>
            </>
          )}
        </View>

        {/* Footer with commission rate and contact buttons */}
        <View style={styles.cardFooter}>
          <View style={styles.commissionContainer}>
            <Text style={styles.commissionLabel}>Commission Rate:</Text>
            <Text style={styles.commissionValue}>{item.commission_rate}%</Text>
          </View>
          <View style={styles.contactContainer}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card tap when calling
                handlePhoneCall(item.phone);
              }}
            >
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card tap when emailing
                handleEmail(item.email);
              }}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading screen while data is being fetched
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
          <Text style={styles.headerTitle}>Sales Representatives</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading sales representatives...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error screen if data fetching failed and no fallback data exists
  if (error && salesReps.length === 0) {
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
          <Text style={styles.headerTitle}>Sales Representatives</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main screen render - shows the sales reps list with search and filters
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales Representatives</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search bar for filtering by name or area */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#ADB5BD"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or area..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#ADB5BD" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter tabs and results count */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsScrollContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter ? styles.filterTabActive : null,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter ? styles.filterTabTextActive : null,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.resultsCount}>
          {filteredSalesReps.length}{" "}
          {filteredSalesReps.length === 1 ? "result" : "results"}
        </Text>
      </View>

      {/* Main content area - either shows the list or empty state */}
      {filteredSalesReps.length > 0 ? (
        <FlatList
          data={filteredSalesReps}
          renderItem={renderSalesRep}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // Empty state when no sales reps match the current filters
        <View style={styles.emptyContainer}>
          <Feather name="users" size={60} color="#CED4DA" />
          <Text style={styles.emptyTitle}>No Sales Reps Found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSearchQuery("");
              setSelectedFilter("All");
            }}
          >
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom navigation bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)")}
        >
          <AntDesign name="home" size={22} color={COLORS.dark} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(salesreps)")}
        >
          <FontAwesome5 name="users" size={20} color={COLORS.primary} />
          <Text style={[styles.navLabel, { color: COLORS.primary }]}>
            Sales Reps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <FontAwesome5 name="user-alt" size={20} color={COLORS.dark} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// StyleSheet with all the styling for the sales rep list screen
const styles = StyleSheet.create({
  // Main container styling
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Header section with navigation and title
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
  // Search functionality styling
  searchContainer: {
    padding: 15,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  // Filter tabs styling
  filterTabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  filterTabsScrollContent: {
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#F0F0F0",
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  filterTabTextActive: {
    color: COLORS.light,
  },
  resultsCount: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: "auto",
  },
  // List content and card styling
  listContent: {
    padding: 15,
    paddingBottom: 80, // Space for bottom navigation
  },
  // Individual sales rep card styling
  salesRepCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  // Avatar styling (shows initials)
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
  },
  nameContainer: {
    flex: 1,
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  areaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  areaText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 3,
  },
  statusContainer: {
    marginLeft: "auto",
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "600",
  },
  // Statistics section styling
  statsContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 15,
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    minHeight: 60, // Consistent height for loading state
  },
  statsLoadingContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  statsLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#6c757d",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  statDivider: {
    height: 30,
    width: 1,
    backgroundColor: "#EEE",
  },
  // Card footer with commission and contact buttons
  cardFooter: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  commissionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  commissionLabel: {
    fontSize: 13,
    color: "#6c757d",
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dark,
    marginLeft: 5,
  },
  contactContainer: {
    flexDirection: "row",
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  // Empty state styling when no results found
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  resetButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
  },
  // Loading state styling
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
  // Error state styling
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
  },
  // Bottom navigation styling
  bottomNav: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingVertical: 10,
    justifyContent: "space-around",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    width: "33%",
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.dark,
    fontWeight: "500",
  },
});
