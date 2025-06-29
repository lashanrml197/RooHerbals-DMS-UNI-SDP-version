// Import necessary modules from React, React Native, and Expo
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Import the API function for testing password hash and color constants
import { testPasswordHash } from "../services/api";
import { COLORS } from "../theme/colors";

// Define the structure for the password test result object
interface PasswordTestResult {
  original: string;
  hashed: string;
  verified: boolean;
}

// Define the main component for the password test screen
export default function PasswordTestScreen() {
  // State to hold the password input by the user
  const [password, setPassword] = useState("");
  // State to store the result of the password hash test
  const [testResult, setTestResult] = useState<PasswordTestResult | null>(null);
  // State to manage the loading indicator
  const [loading, setLoading] = useState(false);
  // State to hold any error messages
  const [error, setError] = useState<string | null>(null);

  // Function to handle the password test process
  const handleTest = async () => {
    // Prevent function execution if password is not entered
    if (!password) return;

    try {
      // Set loading state to true and clear previous errors
      setLoading(true);
      setError(null);
      // Call the API to test the password hash
      const result = await testPasswordHash(password);
      // Store the test result
      setTestResult(result);
    } catch (err: unknown) {
      // Set an error message if the API call fails
      setError(
        err instanceof Error ? err.message : "Failed to test password hashing"
      );
    } finally {
      // Set loading state to false once the process is complete
      setLoading(false);
    }
  };

  // Render the UI for the component
  return (
    <View style={styles.container}>
      {/* Configure the status bar style */}
      <StatusBar style="light" />

      {/* Header section with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Password Hash Test</Text>
        {/* Empty view for spacing */}
        <View style={{ width: 70 }} />
      </View>

      {/* Main content area with scrolling */}
      <ScrollView style={styles.content}>
        {/* Label for the password input */}
        <Text style={styles.label}>Enter password to test:</Text>
        {/* Text input for the user to enter a password */}
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter a password"
          secureTextEntry
        />

        {/* Button to trigger the password test */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleTest}
          disabled={loading || !password}
        >
          {/* Show loading indicator or button text based on loading state */}
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Password Hash</Text>
          )}
        </TouchableOpacity>

        {/* Display error message if an error occurs */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Display the test results if available */}
        {testResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Test Results:</Text>

            {/* Display the original password */}
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Original Password:</Text>
              <Text style={styles.resultValue}>{testResult.original}</Text>
            </View>

            {/* Display the hashed password */}
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Hashed Password:</Text>
              <Text style={styles.hashValue}>{testResult.hashed}</Text>
            </View>

            {/* Display the verification status */}
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Verification:</Text>
              <Text
                style={[
                  styles.verificationValue,
                  { color: testResult.verified ? "#2ecc71" : "#e74c3c" },
                ]}
              >
                {testResult.verified ? "SUCCESS" : "FAILED"}
              </Text>
            </View>

            {/* Informational text about bcrypt hashing */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                The hashed password starts with &quot;$2b$&quot; which indicates
                it&apos;s using bcrypt with a cost factor of 10. Each time you
                hit test, you&apos;ll get a different hash even for the same
                password - this is due to the random salt that bcrypt generates
                for each hash.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Define the styles for the component using StyleSheet
const styles = StyleSheet.create({
  // Style for the main container view
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  // Style for the header section
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  // Style for the title text in the header
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  // Style for the back button
  backButton: {
    width: 70,
  },
  // Style for the back button text
  backButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  // Style for the main content area
  content: {
    flex: 1,
    padding: 16,
  },
  // Style for the labels above input fields
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  // Style for the text input fields
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  // Style for the main action button
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  // Style for the text inside the button
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Style for the container of error messages
  errorContainer: {
    backgroundColor: "#fdedeb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  // Style for the error text
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
  },
  // Style for the container of test results
  resultContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  // Style for the title of the results section
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: COLORS.primary,
  },
  // Style for each row in the results display
  resultRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  // Style for the labels in the results (e.g., "Original Password")
  resultLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: "#666",
  },
  // Style for the values in the results
  resultValue: {
    fontSize: 16,
    color: "#333",
  },
  // Style for the hashed password value, using a monospace font
  hashValue: {
    fontSize: 14,
    color: "#333",
    fontFamily: "monospace",
  },
  // Style for the verification status text
  verificationValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // Style for the informational text container
  infoContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  // Style for the informational text
  infoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
});
