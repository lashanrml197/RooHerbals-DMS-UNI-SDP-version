import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { addVehicle } from "../services/driverApi";
import { COLORS } from "../theme/colors";

interface FormErrors {
  name?: string;
  registration_number?: string;
  vehicle_type?: string;
  capacity?: string;
  [key: string]: string | undefined;
}

export default function AddVehicleScreen() {
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    registration_number: "",
    vehicle_type: "",
    capacity: "",
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    let processedValue = value;

    // For registration number, auto-format and convert to uppercase
    if (field === "registration_number") {
      // Remove all non-alphanumeric characters except dash
      processedValue = value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();

      // Auto-insert dash if needed
      if (!value.includes("-") && processedValue.length > 1) {
        // Check if we should add a dash (after 2 or 3 letters)
        const lettersPart = processedValue.match(/^[A-Z]+/);
        if (
          lettersPart &&
          (lettersPart[0].length === 2 || lettersPart[0].length === 3) &&
          processedValue.length > lettersPart[0].length &&
          !processedValue.includes("-")
        ) {
          // Insert dash after letters part
          processedValue =
            processedValue.slice(0, lettersPart[0].length) +
            "-" +
            processedValue.slice(lettersPart[0].length);
        }
      }
    }

    // For capacity, apply formatting rules
    if (field === "capacity") {
      // Allow numbers, decimal points, spaces, and letters (for units like kg, tons)
      processedValue = value.replace(/[^0-9.\sa-zA-Z]/g, "");
    }

    setFormData({
      ...formData,
      [field]: processedValue,
    });

    // Clear error when user types
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: undefined,
      });
    }

    // Perform real-time validation for registration number
    if (field === "registration_number" && processedValue) {
      if (!validateRegistrationNumber(processedValue)) {
        setErrors((prev) => ({
          ...prev,
          registration_number: "Format should be XX-0000 or XXX-0000",
        }));
      }
    }

    // Validate name if not empty
    if (field === "name" && processedValue && processedValue.length < 3) {
      setErrors((prev) => ({
        ...prev,
        name: "Name must be at least 3 characters",
      }));
    }

    // Validate capacity format
    if (field === "capacity" && processedValue) {
      if (!validateCapacity(processedValue)) {
        setErrors((prev) => ({
          ...prev,
          capacity:
            "Format should include numbers and units (e.g., 2500kg, 3.5 tons)",
        }));
      }
    }

    // Validate vehicle type if not empty
    if (field === "vehicle_type" && processedValue) {
      if (!/^[A-Za-z0-9\s-]+$/.test(processedValue)) {
        setErrors((prev) => ({
          ...prev,
          vehicle_type:
            "Only alphanumeric characters, spaces and hyphens allowed",
        }));
      }
    }
  };

  // Validate registration number format
  const validateRegistrationNumber = (reg: string): boolean => {
    // Validation for Sri Lankan vehicle registration
    // e.g., AB-1234, ABC-1234, LA-2453
    const re = /^[A-Z]{1,3}-\d{4}$/;
    return re.test(reg.toUpperCase());
  };

  // Validate vehicle name
  const validateVehicleName = (name: string): boolean => {
    // Name should be at least 3 characters long and contain only allowed characters
    return name.trim().length >= 3 && /^[A-Za-z0-9\s.#-]+$/.test(name);
  };

  // Validate capacity format
  const validateCapacity = (capacity: string): boolean => {
    // Capacity should have numbers followed by units
    // e.g., 2500kg, 3.5 tons, 4000 kg, 2.5 tons
    const re = /^(\d+\.?\d*)\s*([a-zA-Z]+)$/;
    return re.test(capacity);
  };

  // Validate vehicle type
  const validateVehicleType = (type: string): boolean => {
    // Vehicle type should only contain letters, numbers, spaces and hyphens
    return !type || /^[A-Za-z0-9\s-]+$/.test(type);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = "Vehicle name is required";
      isValid = false;
    } else if (!validateVehicleName(formData.name)) {
      newErrors.name =
        "Vehicle name must be at least 3 characters and contain only letters, numbers, spaces, and special characters (.#-)";
      isValid = false;
    }

    if (!formData.registration_number.trim()) {
      newErrors.registration_number = "Registration number is required";
      isValid = false;
    } else if (!validateRegistrationNumber(formData.registration_number)) {
      newErrors.registration_number =
        "Invalid registration number format (should be XX-0000 or XXX-0000)";
      isValid = false;
    }

    // Optional fields validation
    if (formData.vehicle_type && !validateVehicleType(formData.vehicle_type)) {
      newErrors.vehicle_type =
        "Vehicle type can only contain letters, numbers, spaces and hyphens";
      isValid = false;
    }

    if (formData.capacity && !validateCapacity(formData.capacity)) {
      newErrors.capacity =
        "Capacity should include numbers and units (e.g., 2500kg, 3.5 tons)";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      // Show the first error in an alert for better UX
      const firstError = Object.values(errors).find(
        (error) => error !== undefined
      );
      if (firstError) {
        Alert.alert("Validation Error", firstError);
      }
      return;
    }

    setLoading(true);

    try {
      // Convert registration to uppercase
      const formattedData = {
        ...formData,
        registration_number: formData.registration_number.toUpperCase(),
      };

      const response = await addVehicle(formattedData);
      console.log("Vehicle added successfully:", response);

      Alert.alert(
        "Success",
        "Vehicle registered successfully!",
        [
          {
            text: "View Vehicles",
            onPress: () => router.push("../(drivers)/vehicle-list"),
          },
          {
            text: "Add Another",
            onPress: () => {
              // Reset form for new input
              setFormData({
                name: "",
                registration_number: "",
                vehicle_type: "",
                capacity: "",
              });
              // Also reset errors
              setErrors({});
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error("Error adding vehicle:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to register vehicle. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Suggested vehicle types for placeholder
  const vehicleTypePlaceholder = "e.g., Isuzu, Tata, Ashok Leyland";

  // Suggested capacity formats for placeholder
  const capacityPlaceholder = "e.g., 2500kg, 3.5tons";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Vehicle</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction Card */}
          <View style={styles.introCard}>
            <View style={styles.introIconContainer}>
              <MaterialCommunityIcons
                name="truck-plus"
                size={24}
                color={COLORS.light}
              />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Vehicle Registration</Text>
              <Text style={styles.introText}>
                Register a new delivery vehicle with its details for use in the
                delivery system.
              </Text>
            </View>
          </View>

          {/* Form Section: Vehicle Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <Text style={styles.sectionSubtitle}>
              Basic details about the vehicle
            </Text>

            {/* Vehicle Name Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Vehicle Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.name ? styles.inputError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="truck"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Lorry #L-2453"
                  value={formData.name}
                  onChangeText={(value) => handleChange("name", value)}
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
              <Text style={styles.helperText}>
                Give the vehicle a unique name for easy identification
              </Text>
            </View>

            {/* Registration Number Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Registration Number <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.registration_number ? styles.inputError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="card-account-details"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., LA-2453"
                  value={formData.registration_number}
                  onChangeText={(value) =>
                    handleChange("registration_number", value)
                  }
                  autoCapitalize="characters"
                />
              </View>
              {errors.registration_number && (
                <Text style={styles.errorText}>
                  {errors.registration_number}
                </Text>
              )}
              <Text style={styles.helperText}>
                Format: XX-0000 or XXX-0000 (e.g., LA-2453, ABC-1234)
              </Text>
            </View>
          </View>

          {/* Form Section: Specifications */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <Text style={styles.sectionSubtitle}>
              Additional details about the vehicle
            </Text>

            {/* Vehicle Type Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Vehicle Type</Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.vehicle_type ? styles.inputError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="truck-cargo-container"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={vehicleTypePlaceholder}
                  value={formData.vehicle_type}
                  onChangeText={(value) => handleChange("vehicle_type", value)}
                />
              </View>
              {errors.vehicle_type && (
                <Text style={styles.errorText}>{errors.vehicle_type}</Text>
              )}
            </View>

            {/* Capacity Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Capacity</Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.capacity ? styles.inputError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="weight"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={capacityPlaceholder}
                  value={formData.capacity}
                  onChangeText={(value) => handleChange("capacity", value)}
                />
              </View>
              {errors.capacity && (
                <Text style={styles.errorText}>{errors.capacity}</Text>
              )}
              <Text style={styles.helperText}>
                Format: number followed by unit (e.g., 2500kg, 3.5tons)
              </Text>
            </View>
          </View>

          {/* Vehicle Status Note */}
          <View style={styles.noteCard}>
            <MaterialIcons name="info" size={20} color={COLORS.primary} />
            <Text style={styles.noteText}>
              New vehicles are automatically set to &quot;Available&quot; status
              when registered.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.light} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Register Vehicle</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color={COLORS.light}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Required Fields Note */}
          <Text style={styles.requiredFieldsNote}>
            Fields marked with <Text style={styles.requiredStar}>*</Text> are
            required
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Ensures content is displayed within the safe area boundaries of the device
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Adjusts the view to prevent the keyboard from covering input fields
  keyboardAvoidingView: {
    flex: 1,
  },
  // Main container for the scrollable content
  container: {
    flex: 1,
  },
  // Styling for the content within the ScrollView, including padding
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  // Header section styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight! + 16 : 16,
  },
  // Back button touchable area
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  // Header title text style
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.light,
  },
  // Right side of the header, used for alignment
  headerRight: {
    width: 40,
  },
  // Introductory card with a shadow and border
  introCard: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  // Container for the icon in the intro card
  introIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  // Container for the text content in the intro card
  introTextContainer: {
    flex: 1,
  },
  // Title text style within the intro card
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  // Descriptive text style within the intro card
  introText: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
  // Styling for form sections
  formSection: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  // Title for each form section
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  // Subtitle for each form section
  sectionSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 16,
  },
  // Container for each input field, providing vertical spacing
  inputContainer: {
    marginBottom: 16,
  },
  // Label for each input field
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  // Container for the text input and its icon
  textInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
  },
  // Icon within the text input container
  inputIcon: {
    paddingHorizontal: 12,
  },
  // The actual text input field style
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  // Style for an input field with a validation error
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "rgba(231, 76, 60, 0.05)",
  },
  // Text style for displaying validation error messages
  errorText: {
    fontSize: 12,
    color: "#E74C3C",
    marginTop: 4,
    marginLeft: 4,
  },
  // Helper text style for providing hints below input fields
  helperText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
    marginLeft: 4,
  },
  // Style for the red asterisk indicating a required field
  requiredStar: {
    color: "#E74C3C",
    fontWeight: "bold",
  },
  // Informational note card style
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  // Text style within the note card
  noteText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: 10,
    lineHeight: 20,
  },
  // Submit button style
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Text style for the submit button
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.light,
    marginRight: 8,
  },
  // Note at the bottom of the screen explaining the required fields
  requiredFieldsNote: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
});
