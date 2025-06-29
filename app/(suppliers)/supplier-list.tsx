import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { COLORS } from "../theme/colors";

// Import API functions
import { getAllSuppliers } from "../services/supplierApi";

interface Supplier {
  supplier_id: string;
  name: string;
  supplier_type: string;
  address: string;
  phone: string;
  email: string;
  payment_terms: string;
  contact_person: string;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SupplierListScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllSuppliers();
      console.log("Successfully fetched suppliers:", data);

      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (err: any) {
      console.error("Error fetching suppliers:", err);
      setError(err.message || "Failed to fetch suppliers");

      // Use sample data if API fails
      const sampleSuppliers = [
        {
          supplier_id: "S001",
          name: "Herbal Extracts Inc.",
          supplier_type: "raw_material",
          address: "Colombo, Sri Lanka",
          phone: "+94 11 234 5678",
          email: "contact@herbalextracts.com",
          payment_terms: "Net 30",
          contact_person: "John Silva",
          is_preferred: true,
          is_active: true,
          created_at: "2023-12-01T00:00:00.000Z",
          updated_at: "2024-03-15T00:00:00.000Z",
        },
        {
          supplier_id: "S002",
          name: "Natural Beauty Products",
          supplier_type: "manufacturer",
          address: "Kandy, Sri Lanka",
          phone: "+94 81 234 5678",
          email: "orders@naturalbeauty.com",
          payment_terms: "Net 15",
          contact_person: "Sarah Fernando",
          is_preferred: false,
          is_active: true,
          created_at: "2024-01-10T00:00:00.000Z",
          updated_at: "2024-02-20T00:00:00.000Z",
        },
        {
          supplier_id: "S003",
          name: "Herb Garden Co.",
          supplier_type: "raw_material",
          address: "Galle, Sri Lanka",
          phone: "+94 91 234 5678",
          email: "info@herbgarden.lk",
          payment_terms: "Net 30",
          contact_person: "Rohan Perera",
          is_preferred: true,
          is_active: true,
          created_at: "2023-11-05T00:00:00.000Z",
          updated_at: "2024-03-10T00:00:00.000Z",
        },
        {
          supplier_id: "S004",
          name: "Eco Packaging Solutions",
          supplier_type: "packaging",
          address: "Negombo, Sri Lanka",
          phone: "+94 31 234 5678",
          email: "sales@ecopack.lk",
          payment_terms: "Net 45",
          contact_person: "Anita Mendis",
          is_preferred: false,
          is_active: true,
          created_at: "2024-02-15T00:00:00.000Z",
          updated_at: "2024-03-01T00:00:00.000Z",
        },
        {
          supplier_id: "S005",
          name: "Organic Farms Ltd.",
          supplier_type: "raw_material",
          address: "Nuwara Eliya, Sri Lanka",
          phone: "+94 52 234 5678",
          email: "orders@organicfarms.lk",
          payment_terms: "Net 30",
          contact_person: "Kumar Bandara",
          is_preferred: true,
          is_active: true,
          created_at: "2023-10-20T00:00:00.000Z",
          updated_at: "2024-01-25T00:00:00.000Z",
        },
      ];

      setSuppliers(sampleSuppliers);
      setFilteredSuppliers(sampleSuppliers);
    } finally {
      setLoading(false);
    }
  };

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers when search or filter type changes
  useEffect(() => {
    if (suppliers.length > 0) {
      const normalizedQuery = searchQuery ? searchQuery.toLowerCase() : "";

      const filtered = suppliers.filter((supplier) => {
        // Safely check if properties exist before calling toLowerCase()
        const supplierName = supplier.name ? supplier.name.toLowerCase() : "";
        const supplierAddress = supplier.address
          ? supplier.address.toLowerCase()
          : "";
        const supplierPhone = supplier.phone
          ? supplier.phone.toLowerCase()
          : "";
        const supplierEmail = supplier.email
          ? supplier.email.toLowerCase()
          : "";
        const supplierContact = supplier.contact_person
          ? supplier.contact_person.toLowerCase()
          : "";

        const matchesSearch =
          normalizedQuery === "" ||
          supplierName.includes(normalizedQuery) ||
          supplierAddress.includes(normalizedQuery) ||
          supplierPhone.includes(normalizedQuery) ||
          supplierEmail.includes(normalizedQuery) ||
          supplierContact.includes(normalizedQuery);

        const matchesType =
          filterType === "All" ||
          (filterType === "Raw Materials" &&
            supplier.supplier_type === "raw_material") ||
          (filterType === "Packaging" &&
            supplier.supplier_type === "packaging") ||
          (filterType === "Manufacturer" &&
            supplier.supplier_type === "manufacturer") ||
          (filterType === "Distributor" &&
            supplier.supplier_type === "distributor");

        return matchesSearch && matchesType;
      });

      setFilteredSuppliers(filtered);
    }
  }, [searchQuery, filterType, suppliers]);

  const handleSelectSupplier = (supplier: Supplier) => {
    // Navigate to supplier detail screen
    router.push({
      pathname: "../(suppliers)/supplier-detail",
      params: { supplierId: supplier.supplier_id, supplierName: supplier.name },
    });
  };

  // Get display type based on supplier_type field
  const getDisplayType = (type: string): string => {
    switch (type) {
      case "raw_material":
        return "Raw Materials";
      case "packaging":
        return "Packaging";
      case "manufacturer":
        return "Manufacturer";
      case "distributor":
        return "Distributor";
      default:
        return type;
    }
  };

  // Available supplier types for filtering
  const supplierTypes = [
    "All",
    "Raw Materials",
    "Packaging",
    "Manufacturer",
    "Distributor",
  ];

  // Get icon based on supplier type
  const getSupplierIcon = (type: string) => {
    switch (type) {
      case "raw_material":
        return "leaf";
      case "packaging":
        return "package-variant";
      case "manufacturer":
        return "factory";
      case "distributor":
        return "truck-delivery";
      default:
        return "factory";
    }
  };

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
          <Text style={styles.headerTitle}>Supplier List</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading suppliers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header - Removed filter icon */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supplier List</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        {/* Search Bar - Removed add filter button */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Feather
              name="search"
              size={20}
              color="#ADB5BD"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search suppliers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#ADB5BD"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color="#ADB5BD" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {supplierTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type ? styles.activeFilterButton : null,
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === type ? styles.activeFilterButtonText : null,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredSuppliers.length}{" "}
            {filteredSuppliers.length === 1 ? "supplier" : "suppliers"} found
          </Text>
        </View>

        {/* Supplier List */}
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.supplier_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.supplierCard}
              onPress={() => handleSelectSupplier(item)}
              activeOpacity={0.7}
            >
              <View style={styles.supplierHeader}>
                <View style={styles.supplierIconContainer}>
                  <MaterialCommunityIcons
                    name={getSupplierIcon(item.supplier_type)}
                    size={18}
                    color={COLORS.secondary}
                  />
                </View>
                <View style={styles.supplierInfo}>
                  <Text style={styles.supplierName}>{item.name}</Text>
                  <View style={styles.supplierTypeContainer}>
                    <Text style={styles.supplierType}>
                      {getDisplayType(item.supplier_type)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.is_preferred
                      ? styles.preferredBadge
                      : styles.regularBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.is_preferred
                        ? styles.preferredText
                        : styles.regularText,
                    ]}
                  >
                    {item.is_preferred ? "Preferred" : "Regular"}
                  </Text>
                </View>
              </View>

              <View style={styles.supplierDetails}>
                <View style={styles.detailItem}>
                  <Feather
                    name="map-pin"
                    size={14}
                    color="#6c757d"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailText}>{item.address}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Feather
                    name="phone"
                    size={14}
                    color="#6c757d"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailText}>{item.phone}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Feather
                    name="user"
                    size={14}
                    color="#6c757d"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailText}>{item.contact_person}</Text>
                </View>
              </View>

              <View style={styles.supplierFooter}>
                <View style={styles.termInfo}>
                  <Text style={styles.termLabel}>Payment Terms:</Text>
                  <Text style={styles.termValue}>{item.payment_terms}</Text>
                </View>

                <View style={styles.dateInfo}>
                  <Text style={styles.dateLabel}>Added:</Text>
                  <Text style={styles.dateValue}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Chevron indicator */}
              <View style={styles.chevronContainer}>
                <MaterialIcons name="chevron-right" size={24} color="#ADB5BD" />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="factory"
                size={60}
                color="#CED4DA"
              />
              <Text style={styles.emptyText}>No suppliers found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          }
        />

        {/* Add Supplier FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("../(suppliers)/supplier-add")}
        >
          <AntDesign name="plus" size={24} color="#FFFFFF" />
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
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    color: COLORS.dark,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: COLORS.light,
    fontWeight: "600",
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: "#6c757d",
  },
  listContent: {
    paddingBottom: 80, // Space for FAB and bottom nav
  },
  supplierCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  supplierHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  supplierIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  supplierTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  supplierType: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  preferredBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
  },
  regularBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  preferredText: {
    color: "#2ECC71",
  },
  regularText: {
    color: "#3498DB",
  },
  supplierDetails: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#6c757d",
  },
  supplierFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  termInfo: {
    flexDirection: "column",
  },
  termLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  termValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  dateInfo: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  chevronContainer: {
    position: "absolute",
    right: 16,
    bottom: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#6c757d",
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ADB5BD",
    marginTop: 6,
  },
  errorText: {
    fontSize: 14,
    color: "#E74C3C",
    marginTop: 10,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.dark,
    marginTop: 10,
  },
});
