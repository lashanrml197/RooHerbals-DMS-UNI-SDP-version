import {
  AntDesign,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useAuth } from "../context/AuthContext"; // Import useAuth hook
import { COLORS } from "../theme/colors";

// Type definitions
interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  reorderLevel: number;
  currentStock: number;
  unit: string;
  unitPrice: number;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  total: number;
}

interface Supplier {
  id: string;
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export default function PurchaseOrderNewScreen() {
  const { hasPermission } = useAuth(); // Get hasPermission from AuthContext

  // Check for manage_suppliers permission
  useEffect(() => {
    if (!hasPermission("manage_suppliers")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to create purchase orders.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [hasPermission]);

  // Sample suppliers data
  const suppliers: Supplier[] = [
    {
      id: "1",
      name: "Herbal Extracts Inc.",
      type: "Raw Materials",
      contactPerson: "John Smith",
      phone: "+94 77 1234567",
      email: "john@herbalextracts.com",
      address: "123 Green Lane, Colombo",
    },
    {
      id: "2",
      name: "Eco Packaging Solutions",
      type: "Packaging",
      contactPerson: "Sarah Brown",
      phone: "+94 76 9876543",
      email: "sarah@ecopackaging.com",
      address: "456 Earth Road, Kandy",
    },
    {
      id: "3",
      name: "Natural Beauty Products",
      type: "Raw Materials",
      contactPerson: "Kumar Perera",
      phone: "+94 71 5554433",
      email: "kumar@naturalbeauty.com",
      address: "789 Pure Street, Galle",
    },
  ];

  // Sample products data
  const products: Product[] = [
    {
      id: "1",
      name: "Aloe Vera Extract",
      category: "Raw Material",
      description: "Pure aloe vera extract for skincare products",
      reorderLevel: 20,
      currentStock: 15,
      unit: "liter",
      unitPrice: 2500,
    },
    {
      id: "2",
      name: "Coconut Oil",
      category: "Raw Material",
      description: "Cold-pressed virgin coconut oil",
      reorderLevel: 30,
      currentStock: 45,
      unit: "liter",
      unitPrice: 1800,
    },
    {
      id: "3",
      name: "Lavender Essential Oil",
      category: "Raw Material",
      description: "Pure lavender essential oil for fragrance",
      reorderLevel: 15,
      currentStock: 8,
      unit: "ml",
      unitPrice: 4500,
    },
    {
      id: "4",
      name: "Amber Glass Bottles (200ml)",
      category: "Packaging",
      description: "Amber glass bottles for product packaging",
      reorderLevel: 100,
      currentStock: 65,
      unit: "piece",
      unitPrice: 120,
    },
    {
      id: "5",
      name: "Kraft Paper Boxes",
      category: "Packaging",
      description: "Eco-friendly kraft paper boxes",
      reorderLevel: 200,
      currentStock: 175,
      unit: "piece",
      unitPrice: 85,
    },
  ];

  // Low stock products (for quick add)
  const lowStockProducts = products.filter(
    (product) => product.currentStock <= product.reorderLevel
  );

  // State variables
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [poNumber, setPoNumber] = useState(
    `PO-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 1000)
    ).padStart(3, "0")}`
  );
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate totals
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);

  // Filter products based on search query
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Function to add item to order
  const addItemToOrder = () => {
    if (!selectedProduct) return;
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }

    const qty = parseFloat(quantity);
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: qty,
      unitPrice: selectedProduct.unitPrice,
      unit: selectedProduct.unit,
      total: qty * selectedProduct.unitPrice,
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProduct(null);
    setQuantity("");
    setShowProductModal(false);
  };

  // Function to remove item from order
  const removeItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  // Custom date handling functions
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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handleDateSelection = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    setDeliveryDate(newDate);
    setShowDatePicker(false);
  };

  const renderDatePickerModal = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const years = Array.from(
      { length: 10 },
      (_, i) => new Date().getFullYear() + i
    );

    return (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { padding: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <AntDesign name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              {/* Month Selector */}
              <View style={styles.datePickerSection}>
                <Text style={styles.datePickerLabel}>Month</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        selectedMonth === index &&
                          styles.datePickerItemSelected,
                      ]}
                      onPress={() => setSelectedMonth(index)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          selectedMonth === index &&
                            styles.datePickerItemTextSelected,
                        ]}
                      >
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Selector */}
              <View style={styles.datePickerSection}>
                <Text style={styles.datePickerLabel}>Day</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        selectedDay === day && styles.datePickerItemSelected,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          selectedDay === day &&
                            styles.datePickerItemTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Selector */}
              <View style={styles.datePickerSection}>
                <Text style={styles.datePickerLabel}>Year</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        selectedYear === year && styles.datePickerItemSelected,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          selectedYear === year &&
                            styles.datePickerItemTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmDateButton}
              onPress={handleDateSelection}
            >
              <Text style={styles.confirmDateButtonText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Function to save the purchase order
  const savePurchaseOrder = () => {
    if (!supplier) {
      Alert.alert("Missing Information", "Please select a supplier");
      return;
    }

    if (orderItems.length === 0) {
      Alert.alert(
        "Empty Order",
        "Please add at least one product to the order"
      );
      return;
    }

    // In a real app, you would save the purchase order to your backend
    Alert.alert("Success", `Purchase order ${poNumber} created successfully`, [
      {
        text: "OK",
        onPress: () => router.back(),
      },
    ]);
  };

  // Render supplier selection modal
  const renderSupplierModal = () => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Supplier</Text>
          <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
            <AntDesign name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView style={styles.modalScrollView}>
          {suppliers.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.supplierItem}
              onPress={() => {
                setSupplier(s);
                setShowSupplierModal(false);
                setSearchQuery("");
              }}
            >
              <View style={styles.supplierIconContainer}>
                <MaterialCommunityIcons
                  name={s.type === "Raw Materials" ? "leaf" : "package-variant"}
                  size={16}
                  color={COLORS.light}
                />
              </View>
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>{s.name}</Text>
                <Text style={styles.supplierType}>{s.type}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // Render product selection modal
  const renderProductModal = () => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Product</Text>
          <TouchableOpacity onPress={() => setShowProductModal(false)}>
            <AntDesign name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.quickAddContainer}>
          <Text style={styles.quickAddTitle}>Low Stock Items</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {lowStockProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.quickAddItem}
                onPress={() => {
                  setSelectedProduct(product);
                  setSearchQuery("");
                }}
              >
                <View
                  style={[
                    styles.quickAddIcon,
                    { backgroundColor: COLORS.warning + "20" },
                  ]}
                >
                  <FontAwesome5
                    name="exclamation"
                    size={12}
                    color={COLORS.warning}
                  />
                </View>
                <Text style={styles.quickAddText} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.quickAddStock}>
                  Stock: {product.currentStock}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.modalScrollView}>
          {filteredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productItem,
                selectedProduct?.id === product.id &&
                  styles.selectedProductItem,
              ]}
              onPress={() => setSelectedProduct(product)}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
                <View style={styles.productStockContainer}>
                  <Text
                    style={[
                      styles.productStock,
                      product.currentStock <= product.reorderLevel
                        ? styles.lowStock
                        : null,
                    ]}
                  >
                    Stock: {product.currentStock} {product.unit}
                  </Text>
                  <Text style={styles.productPrice}>
                    Rs. {product.unitPrice}/{product.unit}
                  </Text>
                </View>
              </View>
              {selectedProduct?.id === product.id && (
                <View style={styles.checkIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedProduct && (
          <View style={styles.addItemContainer}>
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder={`Enter quantity in ${selectedProduct.unit}`}
              />
            </View>
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={addItemToOrder}
            >
              <Text style={styles.addItemButtonText}>Add to Order</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // Format date to string
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
          <Text style={styles.headerTitle}>New Purchase Order</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePurchaseOrder}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* PO Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>PO Number</Text>
              <TextInput
                style={styles.input}
                value={poNumber}
                onChangeText={setPoNumber}
                placeholder="Enter PO number"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Delivery Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(deliveryDate)}</Text>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color="#6c757d"
                />
              </TouchableOpacity>
              {/* Date picker is now handled by our custom modal */}
              {showDatePicker && renderDatePickerModal()}
            </View>
          </View>

          {/* Supplier Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier</Text>
            {supplier ? (
              <View style={styles.selectedSupplierContainer}>
                <View style={styles.selectedSupplierHeader}>
                  <View style={styles.supplierIconContainer}>
                    <MaterialCommunityIcons
                      name={
                        supplier.type === "Raw Materials"
                          ? "leaf"
                          : "package-variant"
                      }
                      size={16}
                      color={COLORS.light}
                    />
                  </View>
                  <View style={styles.selectedSupplierInfo}>
                    <Text style={styles.selectedSupplierName}>
                      {supplier.name}
                    </Text>
                    <Text style={styles.selectedSupplierType}>
                      {supplier.type}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setShowSupplierModal(true)}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.supplierDetails}>
                  <View style={styles.supplierDetailRow}>
                    <Text style={styles.supplierDetailLabel}>Contact:</Text>
                    <Text style={styles.supplierDetailValue}>
                      {supplier.contactPerson}
                    </Text>
                  </View>
                  <View style={styles.supplierDetailRow}>
                    <Text style={styles.supplierDetailLabel}>Phone:</Text>
                    <Text style={styles.supplierDetailValue}>
                      {supplier.phone}
                    </Text>
                  </View>
                  <View style={styles.supplierDetailRow}>
                    <Text style={styles.supplierDetailLabel}>Email:</Text>
                    <Text style={styles.supplierDetailValue}>
                      {supplier.email}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectSupplierButton}
                onPress={() => setShowSupplierModal(true)}
              >
                <AntDesign name="plus" size={20} color={COLORS.primary} />
                <Text style={styles.selectSupplierText}>Select Supplier</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Order Items Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              <Text style={styles.itemCount}>
                {orderItems.length} {orderItems.length === 1 ? "item" : "items"}
              </Text>
            </View>

            {orderItems.length > 0 ? (
              <View style={styles.orderItemsList}>
                {orderItems.map((item) => (
                  <View key={item.id} style={styles.orderItem}>
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemName}>
                        {item.productName}
                      </Text>
                      <Text style={styles.orderItemQuantity}>
                        {item.quantity} {item.unit} × Rs. {item.unitPrice}/
                        {item.unit}
                      </Text>
                    </View>
                    <View style={styles.orderItemActions}>
                      <Text style={styles.orderItemTotal}>
                        Rs. {item.total.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeItem(item.id)}
                      >
                        <AntDesign name="close" size={16} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noItemsContainer}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={48}
                  color="#CED4DA"
                />
                <Text style={styles.noItemsText}>No items added yet</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.addProductButton}
              onPress={() => {
                setSelectedProduct(null);
                setQuantity("");
                setSearchQuery("");
                setShowProductModal(true);
              }}
            >
              <AntDesign name="plus" size={20} color={COLORS.primary} />
              <Text style={styles.addProductText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {/* Order Summary Section */}
          {orderItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryValue}>
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    Rs. {totalAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>
                    Rs. {totalAmount.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Add notes for supplier or internal reference"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={savePurchaseOrder}
          >
            <Text style={styles.createButtonText}>Create Purchase Order</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modals */}
        {showSupplierModal && renderSupplierModal()}
        {showProductModal && renderProductModal()}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  datePickerButton: {
    height: 48,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  selectSupplierButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectSupplierText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 10,
  },
  selectedSupplierContainer: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    overflow: "hidden",
  },
  selectedSupplierHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
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
  selectedSupplierInfo: {
    flex: 1,
  },
  selectedSupplierName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 2,
  },
  selectedSupplierType: {
    fontSize: 14,
    color: "#6c757d",
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.light,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  changeButtonText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  supplierDetails: {
    padding: 12,
    backgroundColor: "#F8F9FA",
  },
  supplierDetailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  supplierDetailLabel: {
    width: 80,
    fontSize: 14,
    color: "#6c757d",
  },
  supplierDetailValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  orderItemsList: {
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: "#6c757d",
  },
  orderItemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderItemTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginRight: 16,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(220, 53, 69, 0.1)",
  },
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addProductText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 10,
  },
  noItemsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 16,
  },
  noItemsText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 8,
  },
  summaryContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  totalRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DEE2E6",
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  notesInput: {
    height: 100,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.dark,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 30,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
  },
  datePickerContainer: {
    flexDirection: "row",
    marginVertical: 16,
  },
  datePickerSection: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: "center",
  },
  datePickerScroll: {
    height: 160,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  datePickerItem: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerItemSelected: {
    backgroundColor: "rgba(125, 164, 83, 0.1)",
  },
  datePickerItemText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  datePickerItemTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  confirmDateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmDateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
  },
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  searchInput: {
    height: 48,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  supplierItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
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
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    backgroundColor: COLORS.light,
  },
  selectedProductItem: {
    backgroundColor: "rgba(125, 164, 83, 0.1)",
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
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  productStockContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productStock: {
    fontSize: 14,
    color: "#6c757d",
  },
  lowStock: {
    color: "#F39C12",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  checkIcon: {
    marginLeft: 8,
  },
  addItemContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingTop: 16,
    marginTop: 16,
  },
  quantityContainer: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
  },
  quantityInput: {
    height: 48,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  addItemButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  addItemButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
  },
  quickAddContainer: {
    marginBottom: 16,
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  quickAddItem: {
    width: 100,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  quickAddIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginBottom: 4,
  },
  quickAddStock: {
    fontSize: 12,
    color: "#6c757d",
  },
});
