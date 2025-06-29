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
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import auth context
import { COLORS } from "../theme/colors";

// Import API service
import { createSupplier } from "../services/supplierApi";

// Define supplier types for dropdown - corresponding to the enum in the database
const supplierTypes = [
  { id: "raw_material", label: "Raw Materials" },
  { id: "manufacturer", label: "Manufacturer" },
  { id: "distributor", label: "Distributor" },
  { id: "packaging", label: "Packaging" },
];

export default function AddSupplierScreen() {
  const { hasPermission } = useAuth(); // Get permission check function

  // Check if user has permission to manage suppliers
  useEffect(() => {
    if (!hasPermission("manage_suppliers")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to add suppliers.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    supplier_type: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    payment_terms: "",
    is_preferred: false,
  });

  // State for showing type dropdown
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation state
  const [errors, setErrors] = useState({
    name: false,
    supplier_type: false,
    phone: false,
    phoneFormat: false,
    email: false,
    contact_person: false,
    address: false,
  });

  // Sri Lankan phone number validation
  const isValidSriLankanPhone = (phoneNumber: string) => {
    // All Sri Lankan phone numbers are 10 digits and start with 0
    // Valid prefixes include: 07x (mobile), 011 (Colombo), 038 (Galle), 055 (Badulla),
    // 031 (Negombo), 081 (Kandy), 025 (Anuradhapura), 021 (Jaffna), etc.

    const validPrefixes = [
      // Mobile prefixes
      "070",
      "071",
      "072",
      "073",
      "074",
      "075",
      "076",
      "077",
      "078",
      "079",
      // City/area codes
      "011",
      "038",
      "031",
      "081",
      "025",
      "021",
      "027",
      "045",
      "047",
      "055",
      "026",
      "022",
      "024",
      "023",
      "057",
      "041",
      "091",
      "033",
      "034",
      "035",
      "037",
      "051",
      "052",
      "054",
      "063",
      "065",
      "066",
      "067",
    ];

    // Basic format check: 10 digits starting with 0
    if (!/^0\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check for valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Contact person name validation - only alphabetic characters, spaces, and periods
  const isValidContactName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Update form data
  const handleChange = (field: string, value: any) => {
    // Special handling for phone field to only allow numbers
    if (field === "phone") {
      // Only allow numbers to be entered
      value = value.replace(/[^0-9]/g, "");

      // Update phoneFormat validation as the user types
      if (value.trim()) {
        setErrors({
          ...errors,
          phone: false,
          phoneFormat:
            value.length === 10 ? !isValidSriLankanPhone(value) : true,
        });
      }
    }

    // Special handling for email field
    else if (field === "email") {
      if (value && !isValidEmail(value)) {
        setErrors({ ...errors, email: true });
      } else {
        setErrors({ ...errors, email: false });
      }
    }

    // Special handling for contact_person field
    else if (field === "contact_person") {
      if (value && !isValidContactName(value)) {
        setErrors({ ...errors, contact_person: true });
      } else {
        setErrors({ ...errors, contact_person: false });
      }
    }

    // General error clearing for other fields
    else if (field in errors && errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field as keyof typeof errors]: false });
    }

    setFormData({ ...formData, [field]: value });
  };

  // Toggle preferred supplier
  const togglePreferred = () => {
    setFormData({ ...formData, is_preferred: !formData.is_preferred });
  };

  // Select supplier type
  interface SupplierType {
    id: string;
    label: string;
  }

  const handleSelectType = (typeObj: SupplierType): void => {
    setFormData({ ...formData, supplier_type: typeObj.id });
    setShowTypeDropdown(false);
    if (errors.supplier_type) {
      setErrors({ ...errors, supplier_type: false });
    }
  };

  // Get type label
  const getTypeLabel = (typeId: string): string => {
    const type = supplierTypes.find((t) => t.id === typeId);
    return type ? type.label : "Select supplier type";
  };

  // Validate form
  const validateForm = () => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = true;
      isValid = false;
    }

    if (!formData.supplier_type) {
      newErrors.supplier_type = true;
      isValid = false;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = true;
      isValid = false;
    } else if (!isValidSriLankanPhone(formData.phone)) {
      newErrors.phoneFormat = true;
      isValid = false;
    }

    // Email validation (only if email is provided)
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = true;
      isValid = false;
    }

    // Contact person name validation (only if contact person is provided)
    if (
      formData.contact_person &&
      !isValidContactName(formData.contact_person)
    ) {
      newErrors.contact_person = true;
      isValid = false;
    }

    if (!formData.address.trim()) {
      newErrors.address = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsSubmitting(true);

        // Call API to create supplier
        const result = await createSupplier(formData);

        // Show success message
        Alert.alert(
          "Success",
          `Supplier "${result.name}" has been added successfully`,
          [
            {
              text: "OK",
              onPress: () => router.push("../(suppliers)/supplier-list"),
            },
          ]
        );
      } catch (error: any) {
        // Show error message
        Alert.alert(
          "Error",
          error.message || "Failed to add supplier. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields correctly."
      );
    }
  };

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
        <Text style={styles.headerTitle}>Add New Supplier</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          alwaysBounceVertical={false}
        >
          {/* Introduction Section */}
          <View style={styles.introSection}>
            <View style={styles.iconContainer}>
              <MaterialIcons
                name="add-business"
                size={30}
                color={COLORS.light}
              />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>New Supplier</Text>
              <Text style={styles.introSubtitle}>
                Add a new supplier to your network
              </Text>
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Basic Information Section */}
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Supplier Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Supplier Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.name && styles.inputError,
                ]}
              >
                <MaterialIcons
                  name="business"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplier name"
                  value={formData.name}
                  onChangeText={(text) => handleChange("name", text)}
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>Supplier name is required</Text>
              )}
            </View>

            {/* Supplier Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Supplier Type <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputContainer,
                  errors.supplier_type && styles.inputError,
                ]}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <MaterialCommunityIcons
                  name="factory"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    formData.supplier_type ? styles.activeDropdownText : null,
                  ]}
                >
                  {getTypeLabel(formData.supplier_type)}
                </Text>
                <Ionicons
                  name={showTypeDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#ADB5BD"
                />
              </TouchableOpacity>
              {errors.supplier_type && (
                <Text style={styles.errorText}>Supplier type is required</Text>
              )}

              {/* Type Dropdown */}
              {showTypeDropdown && (
                <View style={styles.dropdown}>
                  {supplierTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectType(type)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          formData.supplier_type === type.id &&
                            styles.activeDropdownItemText,
                        ]}
                      >
                        {type.label}
                      </Text>
                      {formData.supplier_type === type.id && (
                        <AntDesign
                          name="check"
                          size={16}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Contact Information Section */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Contact Information
            </Text>

            {/* Contact Person */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Person</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.contact_person && styles.inputError,
                ]}
              >
                <Feather
                  name="user"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter contact person's name"
                  value={formData.contact_person}
                  onChangeText={(text) => handleChange("contact_person", text)}
                />
              </View>
              {errors.contact_person && (
                <Text style={styles.errorText}>
                  Only letters, spaces, and periods allowed
                </Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  (errors.phone || errors.phoneFormat) && styles.inputError,
                ]}
              >
                <Feather
                  name="phone"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number (e.g., 0771234567)"
                  value={formData.phone}
                  onChangeText={(text) => handleChange("phone", text)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>Phone number is required</Text>
              )}
              {errors.phoneFormat && (
                <Text style={styles.errorText}>
                  Invalid Sri Lankan phone number
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputError,
                ]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => handleChange("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>
                  Please enter a valid email address
                </Text>
              )}
            </View>

            {/* Address */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Address
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Address <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { height: 80, alignItems: "flex-start" },
                  errors.address && styles.inputError,
                ]}
              >
                <Feather
                  name="map-pin"
                  size={20}
                  color="#ADB5BD"
                  style={[styles.inputIcon, { marginTop: 10 }]}
                />
                <TextInput
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: "top", paddingTop: 10 },
                  ]}
                  placeholder="Enter full address"
                  value={formData.address}
                  onChangeText={(text) => handleChange("address", text)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              {errors.address && (
                <Text style={styles.errorText}>Address is required</Text>
              )}
            </View>

            {/* Additional Information */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Additional Information
            </Text>

            {/* Payment Terms */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Terms</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="payment"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Net 30, COD"
                  value={formData.payment_terms}
                  onChangeText={(text) => handleChange("payment_terms", text)}
                />
              </View>
            </View>

            {/* Preferred Supplier Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Preferred Supplier</Text>
                <Text style={styles.toggleDescription}>
                  Mark as preferred supplier for priority in ordering
                </Text>
              </View>
              <Switch
                value={formData.is_preferred}
                onValueChange={togglePreferred}
                trackColor={{ false: "#DEE2E6", true: `${COLORS.primary}80` }}
                thumbColor={formData.is_preferred ? COLORS.primary : "#ADB5BD"}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.light} size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Add Supplier</Text>
                  <AntDesign
                    name="arrowright"
                    size={20}
                    color={COLORS.light}
                    style={styles.submitButtonIcon}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingBottom: Platform.OS === "ios" ? 20 : 0, // Add padding for iOS devices
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
    marginBottom: 16, // Add margin at the bottom
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50, // Increased padding to ensure submit button is fully visible
  },
  introSection: {
    flexDirection: "row",
    alignItems: "center",
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
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24, // Add extra margin at the bottom
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  requiredStar: {
    color: "#E74C3C",
  },
  inputContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.05)",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.dark,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: "#ADB5BD",
  },
  activeDropdownText: {
    color: COLORS.dark,
  },
  dropdown: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  activeDropdownItemText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 4,
    marginLeft: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: "#6c757d",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 54,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16, // Added bottom margin
  },
  disabledButton: {
    backgroundColor: `${COLORS.primary}80`, // 50% opacity
  },
  submitButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  submitButtonIcon: {
    marginLeft: 4,
  },
});
