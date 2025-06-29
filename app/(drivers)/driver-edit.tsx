// Import necessary components and libraries
import { AntDesign, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { getDriverById, updateDriver } from "../services/driverApi";
import { COLORS } from "../theme/colors";

// Define the structure for the driver form data
interface DriverFormData {
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  is_active: boolean;
}

// Define the structure for form validation errors
interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  area?: string;
  [key: string]: string | undefined;
}

// Main component for editing a driver's details
export default function DriverEditScreen() {
  // Get route parameters, specifically the driver's ID
  const params = useLocalSearchParams();
  const { id } = params;

  // State variables for managing component logic
  const [isNewDriver, setIsNewDriver] = useState(false); // Flag for new vs. existing driver
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  const [submitting, setSubmitting] = useState(false); // Loading state for form submission
  const [error, setError] = useState<string | null>(null); // Error message state
  // Form data state
  const [formData, setFormData] = useState<DriverFormData>({
    full_name: "",
    email: null,
    phone: null,
    address: null,
    area: null,
    is_active: true,
  });
  const [errors, setErrors] = useState<FormErrors>({}); // Form validation errors
  const [driverUsername, setDriverUsername] = useState<string>(""); // To store the driver's username

  // Fetches the driver's data from the API using the ID
  const fetchDriverData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getDriverById(id as string);
      // Populate the form with the fetched data
      setFormData({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        area: data.area,
        is_active: data.is_active,
      });
      setDriverUsername(data.username);
    } catch (err: any) {
      console.error("Error fetching driver data:", err);
      setError(
        err.message || "Could not load driver details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Determine if this is a new driver or editing an existing one based on the ID parameter
  useEffect(() => {
    if (!id || id === "new") {
      setIsNewDriver(true);
      setLoading(false);
    } else {
      // If an ID is present, fetch the existing driver's data
      fetchDriverData();
    }
  }, [id, fetchDriverData]);

  // Validates a Sri Lankan phone number format
  const isValidSriLankanPhone = (phoneNumber: string): boolean => {
    // A list of valid prefixes for Sri Lankan mobile and landline numbers
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

    // Check if the number is 10 digits long and starts with 0
    if (!/^0\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check if the number starts with a valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Validates an email address using a regular expression
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validates that the name contains only letters, spaces, and periods
  const isValidName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Handles changes to form inputs and performs validation as the user types
  const handleInputChange = (
    field: keyof DriverFormData,
    value: string | boolean
  ) => {
    // Handle boolean values from the switch input
    if (typeof value === "boolean") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      return;
    }

    // For the phone field, allow only numeric characters
    if (field === "phone") {
      const numericValue = value.replace(/[^0-9]/g, "");

      setFormData((prev) => ({
        ...prev,
        [field]: numericValue || null,
      }));

      // Validate the phone number as the user types
      if (numericValue) {
        if (!isValidSriLankanPhone(numericValue)) {
          setErrors((prev) => ({
            ...prev,
            phone: "Invalid Sri Lankan phone number format",
          }));
        } else {
          // Clear the error if the phone number becomes valid
          setErrors((prev) => ({
            ...prev,
            phone: undefined,
          }));
        }
      } else {
        // Clear the error if the field is empty (it's optional)
        setErrors((prev) => ({
          ...prev,
          phone: undefined,
        }));
      }
      return;
    }

    // Handle other string-based input fields
    const stringValue = value as string;
    setFormData((prev) => ({
      ...prev,
      [field]: stringValue || null,
    }));

    // Clear any existing error for the field being edited
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Perform real-time validation for email and full name fields
    if (field === "email" && stringValue) {
      if (!isValidEmail(stringValue)) {
        setErrors((prev) => ({
          ...prev,
          email: "Invalid email format",
        }));
      }
    }

    if (field === "full_name") {
      if (!stringValue.trim()) {
        setErrors((prev) => ({
          ...prev,
          full_name: "Full name is required",
        }));
      } else if (!isValidName(stringValue)) {
        setErrors((prev) => ({
          ...prev,
          full_name: "Full name can only contain letters, spaces, and periods",
        }));
      }
    }
  };

  // Validates the entire form before submission
  const validateForm = () => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validate that the full name is not empty and has a valid format
    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
      isValid = false;
    } else if (!isValidName(formData.full_name)) {
      newErrors.full_name =
        "Full name can only contain letters, spaces, and periods";
      isValid = false;
    }

    // Validate email format if an email is provided
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = "Invalid email format";
      isValid = false;
    }

    // Validate phone number format if a phone number is provided
    if (formData.phone && !isValidSriLankanPhone(formData.phone)) {
      newErrors.phone = "Invalid Sri Lankan phone number format";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handles the form submission process
  const handleSubmit = async () => {
    // If the form is not valid, show an alert with the first error
    if (!validateForm()) {
      const firstError = Object.values(errors).find(
        (error) => error !== undefined
      );
      if (firstError) {
        Alert.alert("Validation Error", firstError);
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Call the API to update the driver's data
      await updateDriver(id as string, formData);
      Alert.alert("Success", "Driver updated successfully", [
        {
          text: "OK",
          onPress: () => router.back(), // Go back to the previous screen on success
        },
      ]);
    } catch (err: any) {
      console.error("Error updating driver:", err);
      Alert.alert("Error", err.message || "Failed to update driver");
    } finally {
      setSubmitting(false);
    }
  };

  // Display a loading indicator while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isNewDriver ? "Add Driver" : "Edit Driver"}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Loading Spinner */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading driver details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main component render
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isNewDriver ? "Add Driver" : "Edit Driver"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Form container */}
          <View style={styles.formContainer}>
            {/* Display driver's username if editing an existing driver */}
            {!isNewDriver && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>{driverUsername}</Text>
              </View>
            )}

            {/* Full Name Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.full_name ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(text) => handleInputChange("full_name", text)}
                  placeholder="Enter full name"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              )}
            </View>

            {/* Email Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.email || ""}
                  onChangeText={(text) => handleInputChange("email", text)}
                  placeholder="Enter email address"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Phone Number Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.phone ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.phone || ""}
                  onChangeText={(text) => handleInputChange("phone", text)}
                  placeholder="Enter phone number (e.g., 0771234567)"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Address Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.address ? styles.inputError : null,
                  { minHeight: 80 }, // Custom height for multiline input
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    { textAlignVertical: "top", paddingVertical: 10 },
                  ]}
                  value={formData.address || ""}
                  onChangeText={(text) => handleInputChange("address", text)}
                  placeholder="Enter address"
                  placeholderTextColor="#A0A0A0"
                  multiline
                  numberOfLines={4}
                />
              </View>
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            {/* Area/Region Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area / Region</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.area ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.area || ""}
                  onChangeText={(text) => handleInputChange("area", text)}
                  placeholder="Enter area or region"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              {errors.area && (
                <Text style={styles.errorText}>{errors.area}</Text>
              )}
            </View>

            {/* Driver Status Switch */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Driver Status</Text>
              <View style={styles.switchWrapper}>
                <Text
                  style={[
                    styles.switchText,
                    !formData.is_active && styles.activeText,
                  ]}
                >
                  Inactive
                </Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) =>
                    handleInputChange("is_active", value)
                  }
                  trackColor={{ false: "#e0e0e0", true: COLORS.primary }}
                  thumbColor={formData.is_active ? "#fff" : "#fff"}
                  ios_backgroundColor="#e0e0e0"
                  style={{ marginHorizontal: 10 }}
                />
                <Text
                  style={[
                    styles.switchText,
                    formData.is_active && styles.activeText,
                  ]}
                >
                  Active
                </Text>
              </View>
            </View>

            {/* Display any submission errors */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer at the bottom to prevent content from being hidden by the keyboard */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// Styles for the component
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
  container: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#E74C3C",
    fontWeight: "bold",
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "rgba(231, 76, 60, 0.05)", // Light red background to indicate error
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  errorText: {
    fontSize: 12,
    color: "#E74C3C",
    marginTop: 4,
    marginLeft: 4,
  },
  switchContainer: {
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  switchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  switchText: {
    fontSize: 14,
    color: "#6c757d",
  },
  activeText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#6c757d",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
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
});
