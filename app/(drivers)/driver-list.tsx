import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getAllDrivers } from "../services/driverApi";
import { COLORS } from "../theme/colors";

// Define the structure of a Driver object, which is used throughout this component.
interface Driver {
  user_id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  is_active: boolean;
  current_deliveries: number;
  created_at: string;
  updated_at: string;
}

// This is the main screen for displaying the list of lorry drivers.
// It includes features like searching, filtering, and pull-to-refresh.
export default function DriverListScreen() {
  // State for managing loading indicators.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for search functionality and data management.
  const [searchQuery, setSearchQuery] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Applies search and status filters to the list of drivers.
  const applyFilters = useCallback(
    (driversData: Driver[], query: string, filter: string) => {
      let result = [...driversData];

      // Apply search query filter, checking against name, area, and phone.
      if (query) {
        const lowerQuery = query.toLowerCase();
        result = result.filter(
          (driver) =>
            driver.full_name.toLowerCase().includes(lowerQuery) ||
            (driver.area && driver.area.toLowerCase().includes(lowerQuery)) ||
            (driver.phone && driver.phone.includes(query))
        );
      }

      // Apply active/inactive status filter.
      if (filter === "active") {
        result = result.filter((driver) => driver.is_active);
      } else if (filter === "inactive") {
        result = result.filter((driver) => !driver.is_active);
      }

      setFilteredDrivers(result);
    },
    []
  );

  // Fetches the list of drivers from the API.
  // It handles loading states, errors, and updates the component's state.
  const fetchDrivers = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      console.log("Fetching all drivers...");
      const data = await getAllDrivers();
      console.log(`Received ${data.length} drivers`);

      setDrivers(data);
      applyFilters(data, searchQuery, activeFilter);
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
      setError(err.message || "Could not load drivers. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyFilters, searchQuery, activeFilter]);

  // Updates the search query state and triggers the filter function.
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(drivers, text, activeFilter);
  };

  // Updates the active filter state and triggers the filter function.
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    applyFilters(drivers, searchQuery, filter);
  };

  // Fetches drivers when the component first mounts using the useEffect hook.
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Renders a single driver item in the FlatList.
  const renderDriverItem = ({ item }: { item: Driver }) => (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() =>
        router.push(`../(drivers)/driver-detail?id=${item.user_id}`)
      }
    >
      {/* Driver's avatar and basic info */}
      <View style={styles.driverHeader}>
        <View style={styles.driverAvatarContainer}>
          <FontAwesome5 name="user-tie" size={20} color={COLORS.light} />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.full_name}</Text>
          {item.area && <Text style={styles.driverArea}>{item.area}</Text>}
        </View>
        <View
          style={[
            styles.statusBadge,
            item.is_active ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              item.is_active ? styles.activeDot : styles.inactiveDot,
            ]}
          />
          <Text
            style={
              item.is_active
                ? styles.activeStatusText
                : styles.inactiveStatusText
            }
          >
            {item.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      {/* Additional driver details like phone and email */}
      <View style={styles.driverDetails}>
        {item.phone && (
          <View style={styles.detailItem}>
            <Feather name="phone" size={14} color="#6c757d" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
        )}

        {item.email && (
          <View style={styles.detailItem}>
            <Feather name="mail" size={14} color="#6c757d" />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        )}

        <View style={styles.detailItem}>
          <MaterialIcons name="delivery-dining" size={14} color="#6c757d" />
          <Text style={styles.detailText}>
            {item.current_deliveries} deliveries today
          </Text>
        </View>
      </View>

      {/* Action buttons were removed from here to simplify the card view. */}
    </TouchableOpacity>
  );

  // Shows a loading indicator while the initial data is being fetched.
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lorry Drivers</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // This is the main view that gets rendered after the initial loading is complete.
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Custom header for the screen with back and add buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lorry Drivers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("../(drivers)/driver-add")}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Search input field with a clear button */}
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={18}
            color="#6c757d"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => handleSearch("")}
            >
              <Feather name="x" size={18} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs to switch between all, active, and inactive drivers */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === "all" && styles.activeFilterTab,
            ]}
            onPress={() => handleFilterChange("all")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "all" && styles.activeFilterText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === "active" && styles.activeFilterTab,
            ]}
            onPress={() => handleFilterChange("active")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "active" && styles.activeFilterText,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === "inactive" && styles.activeFilterTab,
            ]}
            onPress={() => handleFilterChange("inactive")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "inactive" && styles.activeFilterText,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Displays the total number of drivers found after filtering */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredDrivers.length}
            {filteredDrivers.length === 1 ? " driver" : " drivers"} found
          </Text>
        </View>

        {/* Conditionally renders the list, an error message, or an empty state view */}
        {error ? (
          // Display an error message if fetching data fails
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={50} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDrivers}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDrivers.length > 0 ? (
          // Display the list of drivers using FlatList for performance
          <FlatList
            data={filteredDrivers}
            renderItem={renderDriverItem}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchDrivers}
                colors={[COLORS.primary]}
              />
            }
          />
        ) : (
          // Display a message when no drivers match the search or filter criteria
          <View style={styles.emptyState}>
            <FontAwesome5 name="user-slash" size={50} color="#CED4DA" />
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? `No drivers found matching "${searchQuery}"`
                : "No drivers found"}
            </Text>
            <TouchableOpacity
              style={styles.addDriverButton}
              onPress={() => router.push("../(drivers)/driver-add")}
            >
              <Text style={styles.addDriverButtonText}>Add New Driver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* A spacer at the bottom to prevent the system navigation bar from overlapping the content */}
        <View style={styles.bottomSpacer} />
      </View>
    </SafeAreaView>
  );
}

// StyleSheet for all the component's styles, organized by section.
const styles = StyleSheet.create({
  // Base styles for the safe area and main container.
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Styles for the header section.
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.light,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    width: 40,
  },
  // Styles for the main content area below the header.
  container: {
    flex: 1,
    padding: 16,
  },
  // Styles for the search input container.
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  clearButton: {
    padding: 8,
  },
  // Styles for the filter tabs.
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#E9ECEF",
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: COLORS.light,
    elevation: 2,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  activeFilterText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  // Styles for the results count text.
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "#6c757d",
  },
  // Styles for the FlatList container.
  listContent: {
    paddingBottom: 16,
  },
  // Styles for individual driver cards.
  driverCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
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
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  driverAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  driverArea: {
    fontSize: 14,
    color: "#6c757d",
  },
  // Styles for the status indicator badge.
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  inactiveBadge: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: "#2ECC71",
  },
  inactiveDot: {
    backgroundColor: "#E74C3C",
  },
  activeStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2ECC71",
  },
  inactiveStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E74C3C",
  },
  // Styles for the driver details section within the card.
  driverDetails: {
    backgroundColor: "rgba(248, 249, 250, 0.5)",
    padding: 12,
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
  },
  // Styles for the loading container shown on initial load.
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
  // Styles for the error message container.
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
    marginTop: 12,
    marginBottom: 24,
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
  // Styles for the empty state container when no drivers are found.
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  addDriverButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addDriverButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
  // A spacer at the bottom to prevent the navigation bar from overlapping content.
  bottomSpacer: {
    height: 80, // Adjust this value based on your navigation bar height
  },
});
