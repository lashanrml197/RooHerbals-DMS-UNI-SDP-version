// app/(main)/(orders)/components/CustomerSelection.tsx

import {
  AntDesign,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCustomers } from "../../services/addOrderApi";
import { COLORS } from "../../theme/colors";
import { Customer, OrderStage, useOrderContext } from "../context/OrderContext";

export default function CustomerSelection() {
  // Get context state and dispatch
  const { state, dispatch } = useOrderContext();

  // Local state for customer search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Handle customer selection
  const handleCustomerSelect = useCallback(
    (customer: Customer) => {
      dispatch({ type: "SET_CUSTOMER", payload: customer });
      dispatch({ type: "SET_STAGE", payload: OrderStage.SelectProducts });
    },
    [dispatch]
  );

  // Load customers on component mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        dispatch({ type: "SET_ERROR", payload: null });

        console.log("Loading customers...");
        const data = await getCustomers();

        if (Array.isArray(data)) {
          console.log(`Loaded ${data.length} customers`);
          setCustomers(data);
          setFilteredCustomers(data);
        } else {
          console.warn("Unexpected customer data format:", data);
          dispatch({
            type: "SET_ERROR",
            payload: "Failed to load customer data",
          });
        }
      } catch (error) {
        console.error("Error loading customers:", error);
        dispatch({
          type: "SET_ERROR",
          payload: "Failed to load customers. Please try again.",
        });

        // Show alert for error
        Alert.alert(
          "Error",
          "Failed to load customers. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, [dispatch]);

  // Filter customers when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchLower) ||
          (customer.contact_person &&
            customer.contact_person.toLowerCase().includes(searchLower)) ||
          customer.phone.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Retry loading customers
  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setCustomers([]);
    setFilteredCustomers([]);

    const loadCustomers = async () => {
      try {
        dispatch({ type: "SET_ERROR", payload: null });
        const data = await getCustomers();

        if (Array.isArray(data)) {
          setCustomers(data);
          setFilteredCustomers(data);
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: "Failed to load customer data",
          });
        }
      } catch (error) {
        console.error("Error loading customers:", error);
        dispatch({
          type: "SET_ERROR",
          payload: "Failed to load customers. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, [dispatch]);

  // Render each customer item
  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => handleCustomerSelect(item)}
      accessible={true}
      accessibilityLabel={`Customer ${item.name}`}
      accessibilityHint="Double tap to select this customer"
    >
      <View style={styles.customerIcon}>
        <FontAwesome5 name="store" size={20} color={COLORS.light} />
      </View>
      <View style={styles.customerDetails}>
        <Text style={styles.customerName}>{item.name}</Text>
        {item.contact_person ? (
          <Text style={styles.customerContact}>{item.contact_person}</Text>
        ) : null}
        <Text style={styles.customerLocation}>
          {[item.city, item.area].filter(Boolean).join(", ")}
        </Text>
      </View>
      <MaterialIcons name="arrow-forward-ios" size={16} color="#ADB5BD" />
    </TouchableOpacity>
  );

  // Render empty list component
  const renderEmptyList = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        {searchTerm.length > 0 ? (
          <>
            <MaterialIcons name="search-off" size={50} color="#ADB5BD" />
            <Text style={styles.emptyStateText}>
              No customers found matching &quot;{searchTerm}&quot;
            </Text>
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchTerm("")}
            >
              <Text style={styles.clearSearchButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <MaterialCommunityIcons
              name="store-off"
              size={50}
              color="#ADB5BD"
            />
            <Text style={styles.emptyStateText}>No customers found</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stageTitle}>Select Customer</Text>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={22}
          color={COLORS.dark}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, contact person, or phone..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          accessible={true}
          accessibilityLabel="Search customers"
          accessibilityHint="Enter text to search for customers"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchTerm("")}
            accessible={true}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={22} color={COLORS.dark} />
          </TouchableOpacity>
        )}
      </View>

      {/* Customer list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item.customer_id}
          ListEmptyComponent={renderEmptyList}
          style={styles.customerList}
          contentContainerStyle={[
            styles.listContentContainer,
            filteredCustomers.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          accessible={true}
          accessibilityLabel="Customer list"
        />
      )}

      {/* Add new customer button */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={styles.addNewButton}
          onPress={() => router.push("/(customers)/customer-add")}
          accessible={true}
          accessibilityLabel="Add new customer"
        >
          <AntDesign name="plus" size={20} color={COLORS.light} />
          <Text style={styles.addNewButtonText}>Add New Customer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 14,
  },
  customerList: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 80, // Space for the fixed bottom button
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  customerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 3,
  },
  customerContact: {
    fontSize: 14,
    color: "#6C757D",
    marginTop: 2,
  },
  customerLocation: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6C757D",
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    width: 140,
    alignItems: "center",
  },
  retryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
  },
  clearSearchButton: {
    backgroundColor: "#6C757D",
    borderRadius: 12,
    padding: 16,
    width: 160,
    alignItems: "center",
  },
  clearSearchButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
  },
  fixedBottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 999, // Ensure it's always on top
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
  },
  addNewButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});
