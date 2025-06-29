import {
  Feather,
  FontAwesome5,
  Ionicons,
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import custom hook for authentication context
import { addDriver } from "../services/driverApi"; // Import API function for adding a driver
import { COLORS } from "../theme/colors"; // Import color constants for styling

// Define the structure for form validation errors
interface FormErrors {
  username?: string;
  password?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  area?: string;
  [key: string]: string | undefined; // Allow for dynamic keys
}

// Main component for the "Add Driver" screen
export default function AddDriverScreen() {
  const { hasPermission } = useAuth(); // Get the permission check function from the authentication context

  // Effect hook to check user permissions when the component mounts
  useEffect(() => {
    // Check if the user has the 'manage_drivers' permission
    if (!hasPermission("manage_drivers")) {
      // If not, show a permission denied alert and navigate back to the previous screen
      Alert.alert(
        "Permission Denied",
        "You don't have permission to add drivers.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]); // Dependency array ensures this effect runs if the hasPermission function changes

  // State to hold the form data for the new driver
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    area: "",
  });

  // State for UI feedback, such as loading indicators and error messages
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  // Handles changes in form input fields
  const handleChange = (field: string, value: string) => {
    let processedValue = value;

    // Sanitize phone number input to allow only digits
    if (field === "phone") {
      processedValue = value.replace(/[^0-9]/g, "");
    }

    // Update the form data state with the new value
    setFormData({
      ...formData,
      [field]: processedValue,
    });

    // Clear any existing error for the field being edited
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: undefined,
      });
    }
  };

  // Validates a Sri Lankan phone number format
  const isValidSriLankanPhone = (phoneNumber: string): boolean => {
    // A list of valid mobile and landline prefixes in Sri Lanka
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

    // Check if the phone number is 10 digits and starts with '0'
    if (!/^0\\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check if the number starts with a valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Validates the email format using a regular expression
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validates the username format, allowing only alphanumeric characters and underscores
  const validateUsername = (username: string): boolean => {
    const re = /^[a-zA-Z0-9_]+$/;
    return re.test(username);
  };

  // Validates the name format, allowing only alphabetic characters, spaces, and periods
  const validateName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Validates the entire form before submission
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Username validation checks
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else if (formData.username.trim().length < 4) {
      newErrors.username = "Username must be at least 4 characters";
      isValid = false;
    } else if (!validateUsername(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
      isValid = false;
    }

    // Password validation checks
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.trim().length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Full name validation checks
    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
      isValid = false;
    } else if (!validateName(formData.full_name)) {
      newErrors.full_name =
        "Full name can only contain letters, spaces, and periods";
      isValid = false;
    }

    // Phone number validation (optional field)
    if (formData.phone && !isValidSriLankanPhone(formData.phone)) {
      newErrors.phone = "Invalid Sri Lankan phone number format";
      isValid = false;
    }

    // Email validation (optional field)
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
      isValid = false;
    }

    // Set the errors state with any validation errors found
    setErrors(newErrors);
    return isValid;
  };

  // Handles the form submission process
  const handleSubmit = async () => {
    // If the form is invalid, stop the submission
    if (!validateForm()) {
      return;
    }

    setLoading(true); // Show a loading indicator

    try {
      // Call the API to add the new driver
      const response = await addDriver(formData);
      console.log("Driver added successfully:", response);

      // Show a success alert with options to view the driver list or add another driver
      Alert.alert(
        "Success",
        "Driver registered successfully!",
        [
          {
            text: "View Drivers",
            onPress: () => router.push("../(drivers)/driver-list"),
          },
          {
            text: "Add Another",
            onPress: () => {
              // Reset the form to its initial state for a new entry
              setFormData({
                username: "",
                password: "",
                full_name: "",
                email: "",
                phone: "",
                address: "",
                area: "",
              });
              setErrors({}); // Clear any previous error messages
            },
          },
        ],
        { cancelable: false } // The user must choose an option
      );
    } catch (error: any) {
      console.error("Error adding driver:", error);
      // Show an error alert if the API call fails
      Alert.alert(
        "Error",
        error?.message || "Failed to register driver. Please try again."
      );
    } finally {
      setLoading(false); // Hide the loading indicator
    }
  };

  // Render the component's UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header section with a back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Driver</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Keyboard avoiding view to prevent the keyboard from covering input fields */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction card with a brief description of the screen */}
          <View style={styles.introCard}>
            <View style={styles.introIconContainer}>
              <FontAwesome5 name="user-plus" size={24} color={COLORS.light} />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Driver Registration</Text>
              <Text style={styles.introText}>
                Register a new lorry driver with their login credentials and
                contact details.
              </Text>
            </View>
          </View>

          {/* Form Section for Login Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Login Information</Text>
            <Text style={styles.sectionSubtitle}>
              Create account credentials for the driver
            </Text>

            {/* Username Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Username <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.username ? styles.inputError : null, // Apply error style if there's an error
                ]}
              >
                <Feather
                  name="user"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Username"
                  value={formData.username}
                  onChangeText={(value) => handleChange("username", value)}
                  autoCapitalize="none"
                />
              </View>
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>

            {/* Password Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.password ? styles.inputError : null,
                ]}
              >
                <Feather
                  name="lock"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  value={formData.password}
                  onChangeText={(value) => handleChange("password", value)}
                  secureTextEntry={!showPassword} // Hide or show password based on state
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)} // Toggle password visibility
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color="#6c757d"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>
          </View>

          {/* Form Section for Personal Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>
              Driver&apos;s personal and contact details
            </Text>

            {/* Full Name Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.full_name ? styles.inputError : null,
                ]}
              >
                <Feather
                  name="user"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  value={formData.full_name}
                  onChangeText={(value) => handleChange("full_name", value)}
                />
              </View>
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              )}
            </View>

            {/* Email Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.email ? styles.inputError : null,
                ]}
              >
                <Feather
                  name="mail"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email Address"
                  value={formData.email}
                  onChangeText={(value) => handleChange("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Phone Number Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.phone ? styles.inputError : null,
                ]}
              >
                <Feather
                  name="phone"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Phone Number (e.g., 0771234567)"
                  value={formData.phone}
                  onChangeText={(value) => handleChange("phone", value)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>
          </View>

          {/* Form Section for Location Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionSubtitle}>
              Driver&apos;s address and assigned area
            </Text>

            {/* Address Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <View
                style={[
                  styles.textInputContainer,
                  styles.textAreaContainer,
                  errors.address ? styles.inputError : null,
                ]}
              >
                <Feather
                  name="map-pin"
                  size={18}
                  color="#6c757d"
                  style={[styles.inputIcon, { paddingTop: 12 }]}
                />
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Full Address"
                  value={formData.address}
                  onChangeText={(value) => handleChange("address", value)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            {/* Assigned Area Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Assigned Area</Text>
              <View
                style={[
                  styles.textInputContainer,
                  errors.area ? styles.inputError : null,
                ]}
              >
                <Feather
                  name="map"
                  size={18}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Service Area (e.g. Monaragala)"
                  value={formData.area}
                  onChangeText={(value) => handleChange("area", value)}
                />
              </View>
              {errors.area && (
                <Text style={styles.errorText}>{errors.area}</Text>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading} // Disable button while loading
          >
            {loading ? (
              <ActivityIndicator color={COLORS.light} /> // Show loading spinner
            ) : (
              <>
                <Text style={styles.submitButtonText}>Register Driver</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color={COLORS.light}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Note indicating required fields */}
          <Text style={styles.noteText}>
            Fields marked with <Text style={styles.requiredStar}>*</Text> are
            required
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// StyleSheet for styling the component
const styles = StyleSheet.create({
  // Main container for the screen
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Wrapper to handle keyboard appearance
  keyboardAvoidingView: {
    flex: 1,
  },
  // Scrollable container for the form
  container: {
    flex: 1,
  },
  // Inner content container with padding
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  // Header style
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight! + 16 : 16, // Adjust for Android status bar
  },
  // Back button in the header
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  // Header title text
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.light,
  },
  // Placeholder for right side of header to balance title
  headerRight: {
    width: 40,
  },
  // Style for the introductory card
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
  // Icon container within the intro card
  introIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  // Text container within the intro card
  introTextContainer: {
    flex: 1,
  },
  // Title text in the intro card
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  // Descriptive text in the intro card
  introText: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
  // Style for each form section
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
  // Container for each input field
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
  // The actual text input field
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  // Style for multi-line text area container
  textAreaContainer: {
    alignItems: "flex-start",
  },
  // Style for the multi-line text area
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  // Toggle button for password visibility
  passwordToggle: {
    padding: 12,
  },
  // Style for an input field with a validation error
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "rgba(231, 76, 60, 0.05)", // Light red background to indicate error
  },
  // Text to display validation errors
  errorText: {
    fontSize: 12,
    color: "#E74C3C",
    marginTop: 4,
    marginLeft: 4,
  },
  // Style for the required field indicator (*)
  requiredStar: {
    color: "#E74C3C",
    fontWeight: "bold",
  },
  // Style for the main submit button
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Text inside the submit button
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.light,
    marginRight: 8,
  },
  // Note text at the bottom of the form
  noteText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
});
