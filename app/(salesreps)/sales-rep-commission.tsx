// Import UI components and icons from Expo and React Native
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
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import API services for sales rep operations
import {
  calculateCommission,
  getAllSalesReps,
  getSalesRepCommissions,
  updateCommissionStatus,
} from "../services/salesRepApi";
// Import application theme colors
import { COLORS } from "../theme/colors";

// TypeScript interfaces for data structure
interface SalesRep {
  user_id: string;
  full_name: string;
  area: string;
  commission_rate: number;
  is_active: boolean;
}

interface Commission {
  commission_id: string;
  sales_rep_id: string;
  month: number;
  year: number;
  total_sales: number;
  commission_rate: number;
  amount: number;
  status: string;
  payment_date: string | null;
  sales_rep_name?: string; // Added for display purposes
}

// Main component for managing sales representative commissions
export default function SalesRepCommissionScreen() {
  // State for loading indicator
  const [loading, setLoading] = useState(true);
  // State for commission data
  const [commissions, setCommissions] = useState<Commission[]>([]);
  // State for sales reps data
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  // State for filtering commissions by status
  const [selectedStatus, setSelectedStatus] = useState("all");
  // State for tracking currently processing commission
  const [processingCommissionId, setProcessingCommissionId] = useState<
    string | null
  >(null);
  // State for calculate commission modal visibility
  const [isCalculateModalVisible, setIsCalculateModalVisible] = useState(false);
  // State for month selection in calculator
  const [calculatingForMonth, setCalculatingForMonth] = useState(
    new Date().getMonth() + 1
  ); // Current month
  // State for year selection in calculator
  const [calculatingForYear, setCalculatingForYear] = useState(
    new Date().getFullYear()
  );
  // State for calculation in progress indicator
  const [calculating, setCalculating] = useState(false);

  // Load data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  // Function to fetch all sales rep and commission data
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch sales reps from API
      const salesRepsData = await getAllSalesReps();
      setSalesReps(salesRepsData);

      // Fetch all commissions - declaring variable for type safety
      const _commissionsData: Commission[] = []; // Unused but kept for type definition

      // Fetch commissions for all sales reps concurrently using Promise.all
      // Create array of promises to fetch commissions for each sales rep
      const commissionPromises = salesRepsData.map(async (rep: SalesRep) => {
        // Get commissions for this specific sales rep
        const repCommissions = await getSalesRepCommissions(rep.user_id);
        // Add sales rep name to each commission for easier display in UI
        return repCommissions.map((comm: Commission) => ({
          ...comm,
          sales_rep_name: rep.full_name,
        }));
      });

      // Wait for all commission fetching to complete (parallel processing)
      const allCommissionsArrays = await Promise.all(commissionPromises);

      // Flatten the array of arrays into a single array of all commissions
      const commissionsFlattened = allCommissionsArrays.flat();

      // Sort commissions by newest first for display
      commissionsFlattened.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setCommissions(commissionsFlattened);
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching commission data:", error);
      Alert.alert("Error", error?.message || "Failed to load commission data");
      setLoading(false);
    }
  };

  // Handle approving or paying a specific commission
  const handleCommissionAction = async (
    commission: Commission,
    action: "approve" | "pay"
  ) => {
    try {
      // Set processing state to show loading indicator
      setProcessingCommissionId(commission.commission_id);

      // Call the API to update commission status based on action type
      await updateCommissionStatus(
        commission.sales_rep_id,
        commission.commission_id,
        action === "approve" ? "approved" : "paid", // Set status based on action
        action === "pay" ? new Date().toISOString() : undefined // Add payment date only when paying
      );

      // Update the local state after successful API call to reflect changes immediately
      const updatedCommissions = commissions.map((c) => {
        // Find the commission we just updated
        if (c.commission_id === commission.commission_id) {
          return {
            ...c, // Keep all existing properties
            status: action === "approve" ? "approved" : "paid", // Update status
            payment_date:
              action === "pay" ? new Date().toISOString() : c.payment_date, // Set payment date if paid
          };
        }
        return c; // Return other commissions unchanged
      });

      setCommissions(updatedCommissions);
      setProcessingCommissionId(null);

      Alert.alert(
        "Success",
        `Commission ${action === "approve" ? "approved" : "paid"} successfully`
      );
    } catch (error: any) {
      console.error(`Error ${action}ing commission:`, error);
      Alert.alert("Error", error?.message || `Failed to ${action} commission`);
      setProcessingCommissionId(null);
    }
  };

  // Function to handle bulk approval of all calculated commissions
  const handleApproveAll = () => {
    // Confirm user wants to approve all commissions with dialog
    Alert.alert(
      "Approve All Commissions",
      "Are you sure you want to approve all calculated commissions?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve All",
          onPress: async () => {
            try {
              setLoading(true);

              // Get all calculated commissions
              const calculatedCommissions = commissions.filter(
                (c) => c.status === "calculated"
              );

              if (calculatedCommissions.length === 0) {
                Alert.alert("Info", "No calculated commissions to approve");
                setLoading(false);
                return;
              }

              // Loop through commissions and update their status via API
              const updatedCommissions = [...commissions];

              for (const comm of calculatedCommissions) {
                await updateCommissionStatus(
                  comm.sales_rep_id,
                  comm.commission_id,
                  "approved"
                );

                // Update local state with the updated commission
                const index = updatedCommissions.findIndex(
                  (c) => c.commission_id === comm.commission_id
                );
                if (index !== -1) {
                  updatedCommissions[index] = {
                    ...updatedCommissions[index],
                    status: "approved",
                  };
                }
              }

              setCommissions(updatedCommissions);
              setLoading(false);

              Alert.alert(
                "Success",
                `${calculatedCommissions.length} commissions approved successfully`
              );
            } catch (error: any) {
              console.error("Error approving all commissions:", error);
              Alert.alert(
                "Error",
                error?.message || "Failed to approve all commissions"
              );
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePayAll = () => {
    Alert.alert(
      "Pay All Commissions",
      "Are you sure you want to mark all approved commissions as paid?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay All",
          onPress: async () => {
            try {
              setLoading(true);

              // Get all approved commissions
              const approvedCommissions = commissions.filter(
                (c) => c.status === "approved"
              );
              if (approvedCommissions.length === 0) {
                Alert.alert("Info", "No approved commissions to pay");
                setLoading(false);
                return;
              }

              // Loop through commissions and update their status via API
              const updatedCommissions = [...commissions];
              const paymentDate = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD

              for (const comm of approvedCommissions) {
                await updateCommissionStatus(
                  comm.sales_rep_id,
                  comm.commission_id,
                  "paid",
                  paymentDate
                );

                // Update local state with the updated commission
                const index = updatedCommissions.findIndex(
                  (c) => c.commission_id === comm.commission_id
                );
                if (index !== -1) {
                  updatedCommissions[index] = {
                    ...updatedCommissions[index],
                    status: "paid",
                    payment_date: paymentDate,
                  };
                }
              }

              setCommissions(updatedCommissions);
              setLoading(false);

              Alert.alert(
                "Success",
                `${approvedCommissions.length} commissions paid successfully`
              );
            } catch (error: any) {
              console.error("Error paying all commissions:", error);
              Alert.alert(
                "Error",
                error?.message || "Failed to pay all commissions"
              );
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Function to calculate commissions for selected month/year for all active sales reps
  const handleCalculateCommission = async () => {
    try {
      // Show loading state while calculating
      setCalculating(true);

      // Validate month and year (for reference, not directly used)
      const currentDate = new Date();
      // Note: These variables are kept for potential future validation
      const _currentMonth = currentDate.getMonth() + 1; // Underscore prefix indicates unused
      const _currentYear = currentDate.getFullYear();

      // Calculate the last day of the selected month to check if month has ended
      const lastDayOfSelectedMonth = new Date(
        calculatingForYear,
        calculatingForMonth,
        0
      ).getDate();
      // Create date object for end of the selected month (23:59:59 on last day)
      const endOfSelectedMonth = new Date(
        calculatingForYear,
        calculatingForMonth - 1, // JS months are 0-indexed, our state is 1-indexed
        lastDayOfSelectedMonth,
        23,
        59,
        59
      );

      // Check if the month has ended yet (business rule: can't calculate for current/future months)
      if (endOfSelectedMonth > currentDate) {
        // Show error alert if trying to calculate for a month that hasn't ended
        Alert.alert(
          "Invalid Period",
          "Commission can only be calculated after the month has ended"
        );
        setCalculating(false);
        return;
      }

      // Check if commissions already exist for this period to prevent duplication
      const existingCommissions = commissions.filter(
        (c) => c.month === calculatingForMonth && c.year === calculatingForYear
      );

      // Don't allow recalculation if commissions already exist for this period
      if (existingCommissions.length > 0) {
        // Get unique list of sales rep names who already have commissions for this period
        const salesRepNames = existingCommissions
          .map((c) => c.sales_rep_name)
          .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
          .join(", ");

        Alert.alert(
          "Commission Already Exists",
          `Commissions for ${getMonthName(
            calculatingForMonth
          )} ${calculatingForYear} already exist for: ${salesRepNames}`
        );
        setCalculating(false);
        return;
      }

      // Get only active sales reps - inactive reps don't get commissions
      const activeSalesReps = salesReps.filter((rep) => rep.is_active);

      // Stop if there are no active sales reps
      if (activeSalesReps.length === 0) {
        Alert.alert(
          "No Active Sales Reps",
          "There are no active sales representatives to calculate commissions for."
        );
        setCalculating(false);
        return;
      }

      // Calculate commissions for all active sales reps
      const newCommissionsData: Commission[] = []; // Will store successful calculations
      const skippedReps: string[] = []; // Track reps with no sales (normal business case)
      const failedReps: string[] = []; // Track reps where calculation failed due to errors

      // Loop through each active sales rep and calculate their commission
      for (const rep of activeSalesReps) {
        try {
          // Call API to calculate commission for this rep and period
          const response = await calculateCommission(
            rep.user_id,
            calculatingForMonth,
            calculatingForYear
          );
          // If we got a valid commission response, add it to our results
          if (response && response.commission) {
            newCommissionsData.push({
              ...response.commission,
              sales_rep_name: rep.full_name, // Add name for UI display
            });
          }
        } catch (error: any) {
          // Handle expected business exceptions without crashing
          if (error && error.noSales) {
            // Rep had no sales for this period - track but don't alert
            skippedReps.push(rep.full_name);
          } else if (error && error.monthNotEnded) {
            // Double-check month ended validation (should have been caught earlier)
            Alert.alert(
              "Month Not Ended",
              "Commission can only be calculated after the month has ended"
            );
            setCalculating(false);
            return;
          } else {
            // For unexpected errors, log details but continue with other reps
            console.error(
              `Failed to calculate commission for ${rep.full_name}:`,
              error
            );
            // Track failed calculations for reporting to user
            failedReps.push(rep.full_name);
          }
        }
      } // End of sales rep loop

      // Add newly calculated commissions to the state to update UI
      if (newCommissionsData.length > 0) {
        // Add new commissions at the beginning of the list
        setCommissions((prev) => [...newCommissionsData, ...prev]);
      }

      // Reset UI state
      setCalculating(false);
      setIsCalculateModalVisible(false); // Close the modal

      // Prepare message parts for the summary alert
      // Success message showing how many commissions were calculated
      const successPart =
        newCommissionsData.length > 0
          ? `${
              newCommissionsData.length
            } commissions calculated for ${getMonthName(
              calculatingForMonth
            )} ${calculatingForYear}`
          : `No commissions calculated for ${getMonthName(
              calculatingForMonth
            )} ${calculatingForYear}`;

      // Message about reps with no sales (normal business case)
      const skippedPart =
        skippedReps.length > 0
          ? `\n\n${skippedReps.length} rep${
              skippedReps.length > 1 ? "s" : ""
            } had no sales:\n${skippedReps.join(", ")}`
          : "";

      // Message about reps with calculation errors (abnormal case)
      const failedPart =
        failedReps.length > 0
          ? `\n\n${failedReps.length} rep${
              failedReps.length > 1 ? "s" : ""
            } failed due to errors:\n${failedReps.join(", ")}`
          : "";

      // Determine an appropriate title based on results
      let alertTitle = "Commission Calculation Results";
      if (
        newCommissionsData.length > 0 &&
        skippedReps.length === 0 &&
        failedReps.length === 0
      ) {
        alertTitle = "Success";
      } else if (
        newCommissionsData.length === 0 &&
        (skippedReps.length > 0 || failedReps.length > 0)
      ) {
        alertTitle = "No Commissions Calculated";
      }

      Alert.alert(alertTitle, successPart + skippedPart + failedPart);
    } catch (error: any) {
      console.error("Error calculating commissions:", error);
      Alert.alert("Error", error?.message || "Failed to calculate commissions");
      setCalculating(false);
      setIsCalculateModalVisible(false);
    }
  };

  // Utility function to format currency values with proper formatting
  const formatCurrency = (amount: number | undefined | null) => {
    // Check if amount is undefined, null, or NaN and provide a default value
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "Rs. 0.00";
    }
    return `Rs. ${amount.toLocaleString()}`; // Add thousand separators
  };

  // Utility function to format date strings in a consistent way
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(); // Format date according to user's locale
    } catch (error) {
      return "Invalid Date"; // Fallback for parsing errors
    }
  };

  // Utility function to convert month number to month name
  const getMonthName = (month: number) => {
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
    // Ensure month is between 1 and 12 with bounds checking
    const validMonth = Math.max(1, Math.min(12, month));
    return months[validMonth - 1]; // Adjust for 0-based array index
  };

  // Utility function to get appropriate color for each commission status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#4ECDC4"; // Green - completed payment
      case "approved":
        return "#FDCB6E"; // Yellow - ready for payment
      case "calculated":
        return "#A29BFE"; // Purple - pending approval
      default:
        return "#ADB5BD"; // Gray - fallback for unknown statuses
    }
  };

  // Filter commissions based on selected status tab
  const filteredCommissions =
    selectedStatus === "all"
      ? commissions // Show all commissions
      : commissions.filter((c) => c.status === selectedStatus); // Filter by status

  // Group commissions by month and year for organized display in UI
  const groupedCommissions: { [key: string]: Commission[] } = {};

  // Group each commission by its month/year combination
  filteredCommissions.forEach((commission) => {
    // Create a key in format "YYYY-MM" for grouping
    const key = `${commission.year}-${commission.month}`;
    // Initialize the array for this month/year if it doesn't exist
    if (!groupedCommissions[key]) {
      groupedCommissions[key] = [];
    }
    // Add this commission to its month/year group
    groupedCommissions[key].push(commission);
  });

  // Get groups sorted by newest first for display
  const commissionGroups = Object.keys(groupedCommissions)
    // Sort by year first, then by month (both descending)
    .sort((a, b) => {
      const [yearA, monthA] = a.split("-").map(Number);
      const [yearB, monthB] = b.split("-").map(Number);

      if (yearA !== yearB) return yearB - yearA; // Sort by year desc
      return monthB - monthA; // Then by month desc
    })
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return {
        id: key,
        title: `${getMonthName(month)} ${year}`,
        commissions: groupedCommissions[key],
      };
    });

  // Show loading screen while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commission Management</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading commission data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commission Management</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsCalculateModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>
            {commissions.filter((c) => c.status === "calculated").length}
          </Text>
          <Text style={styles.statsLabel}>Pending Approval</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>
            {commissions.filter((c) => c.status === "approved").length}
          </Text>
          <Text style={styles.statsLabel}>Ready to Pay</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>
            {commissions.filter((c) => c.status === "paid").length}
          </Text>
          <Text style={styles.statsLabel}>Paid</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedStatus === "all" ? styles.activeFilterTab : null,
            ]}
            onPress={() => setSelectedStatus("all")}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === "all" ? styles.activeFilterTabText : null,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedStatus === "calculated" ? styles.activeFilterTab : null,
            ]}
            onPress={() => setSelectedStatus("calculated")}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === "calculated"
                  ? styles.activeFilterTabText
                  : null,
              ]}
            >
              Pending Approval
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedStatus === "approved" ? styles.activeFilterTab : null,
            ]}
            onPress={() => setSelectedStatus("approved")}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === "approved"
                  ? styles.activeFilterTabText
                  : null,
              ]}
            >
              Ready to Pay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedStatus === "paid" ? styles.activeFilterTab : null,
            ]}
            onPress={() => setSelectedStatus("paid")}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === "paid" ? styles.activeFilterTabText : null,
              ]}
            >
              Paid
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Batch Action Buttons */}
      <View style={styles.batchActionsContainer}>
        {selectedStatus === "calculated" && (
          <TouchableOpacity
            style={styles.batchActionButton}
            onPress={handleApproveAll}
          >
            <MaterialIcons name="check-circle" size={16} color={COLORS.light} />
            <Text style={styles.batchActionText}>Approve All</Text>
          </TouchableOpacity>
        )}

        {selectedStatus === "approved" && (
          <TouchableOpacity
            style={styles.batchActionButton}
            onPress={handlePayAll}
          >
            <MaterialIcons name="payments" size={16} color={COLORS.light} />
            <Text style={styles.batchActionText}>Pay All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Commissions List */}
      <ScrollView style={styles.scrollContainer}>
        {commissionGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="cash-remove"
              size={60}
              color="#CED4DA"
            />
            <Text style={styles.emptyTitle}>No Commissions Found</Text>
            <Text style={styles.emptyMessage}>
              {selectedStatus === "all"
                ? "There are no commissions in the system yet."
                : `There are no ${selectedStatus} commissions.`}
            </Text>
            {selectedStatus !== "all" && (
              <TouchableOpacity
                style={styles.showAllButton}
                onPress={() => setSelectedStatus("all")}
              >
                <Text style={styles.showAllButtonText}>
                  Show All Commissions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          commissionGroups.map((group) => (
            <View key={group.id} style={styles.commissionGroup}>
              <View style={styles.commissionGroupHeader}>
                <Text style={styles.commissionGroupTitle}>{group.title}</Text>
                <Text style={styles.commissionGroupCount}>
                  {group.commissions.length} commission
                  {group.commissions.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {group.commissions.map((commission) => (
                <View
                  key={commission.commission_id}
                  style={styles.commissionCard}
                >
                  <View style={styles.commissionHeader}>
                    <View style={styles.commissionHeaderLeft}>
                      <Text style={styles.salesRepName}>
                        {commission.sales_rep_name || "Unknown Sales Rep"}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: getStatusColor(
                              commission.status || ""
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {(commission.status || "Unknown")
                            .charAt(0)
                            .toUpperCase() +
                            (commission.status || "Unknown").slice(1)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() =>
                        router.push({
                          pathname: "../(salesreps)/sales-rep-detail",
                          params: { salesRepId: commission.sales_rep_id },
                        })
                      }
                    >
                      <Text style={styles.detailsButtonText}>Details</Text>
                      <MaterialIcons
                        name="arrow-forward-ios"
                        size={12}
                        color={COLORS.secondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.commissionDetails}>
                    <View style={styles.commissionDetail}>
                      <Text style={styles.detailLabel}>Total Sales:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(commission?.total_sales)}
                      </Text>
                    </View>

                    <View style={styles.commissionDetail}>
                      <Text style={styles.detailLabel}>Commission Rate:</Text>
                      <Text style={styles.detailValue}>
                        {commission?.commission_rate || 0}%
                      </Text>
                    </View>

                    <View style={styles.commissionDetail}>
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={[styles.detailValue, styles.amountText]}>
                        {formatCurrency(commission?.amount)}
                      </Text>
                    </View>

                    {commission?.status === "paid" &&
                      commission?.payment_date && (
                        <View style={styles.commissionDetail}>
                          <Text style={styles.detailLabel}>Payment Date:</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(commission.payment_date)}
                          </Text>
                        </View>
                      )}
                  </View>

                  <View style={styles.commissionActions}>
                    {commission.status === "calculated" && (
                      <TouchableOpacity
                        style={styles.commissionAction}
                        disabled={
                          processingCommissionId === commission.commission_id
                        }
                        onPress={() =>
                          handleCommissionAction(commission, "approve")
                        }
                      >
                        {processingCommissionId === commission.commission_id ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.light}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={COLORS.light}
                            />
                            <Text style={styles.commissionActionText}>
                              Approve
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {commission.status === "approved" && (
                      <TouchableOpacity
                        style={styles.commissionAction}
                        disabled={
                          processingCommissionId === commission.commission_id
                        }
                        onPress={() =>
                          handleCommissionAction(commission, "pay")
                        }
                      >
                        {processingCommissionId === commission.commission_id ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.light}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="payments"
                              size={16}
                              color={COLORS.light}
                            />
                            <Text style={styles.commissionActionText}>
                              Mark as Paid
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Bottom spacing for nav bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Calculate Commission Modal */}
      <Modal
        visible={isCalculateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCalculateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculate Commission</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsCalculateModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Select a month and year to calculate commissions for all active
                sales representatives.
              </Text>

              <View style={styles.periodSelector}>
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Month</Text>
                  <View style={styles.selector}>
                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() =>
                        setCalculatingForMonth((prev) => Math.max(1, prev - 1))
                      }
                    >
                      <Feather name="minus" size={20} color={COLORS.dark} />
                    </TouchableOpacity>

                    <Text style={styles.selectorValue}>
                      {getMonthName(calculatingForMonth)}
                    </Text>

                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() =>
                        setCalculatingForMonth((prev) => Math.min(12, prev + 1))
                      }
                    >
                      <Feather name="plus" size={20} color={COLORS.dark} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Year</Text>
                  <View style={styles.selector}>
                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() => setCalculatingForYear((prev) => prev - 1)}
                    >
                      <Feather name="minus" size={20} color={COLORS.dark} />
                    </TouchableOpacity>

                    <Text style={styles.selectorValue}>
                      {calculatingForYear}
                    </Text>

                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() => setCalculatingForYear((prev) => prev + 1)}
                    >
                      <Feather name="plus" size={20} color={COLORS.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsCalculateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calculateButton}
                onPress={handleCalculateCommission}
                disabled={calculating}
              >
                {calculating ? (
                  <ActivityIndicator size="small" color={COLORS.light} />
                ) : (
                  <Text style={styles.calculateButtonText}>Calculate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
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
  actionButton: {
    width: 24,
    alignItems: "flex-end",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  statsCard: {
    flex: 1,
    alignItems: "center",
    padding: 10,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
  },
  statsLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 5,
  },
  filterContainer: {
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  filterTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#F0F0F0",
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  activeFilterTabText: {
    color: COLORS.light,
    fontWeight: "600",
  },
  batchActionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  batchActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  batchActionText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  commissionGroup: {
    marginBottom: 15,
  },
  commissionGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  commissionGroupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  commissionGroupCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  commissionCard: {
    backgroundColor: COLORS.light,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  commissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  commissionHeaderLeft: {
    flex: 1,
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  statusText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "600",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsButtonText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "600",
    marginRight: 2,
  },
  commissionDetails: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  commissionDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  amountText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  commissionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 15,
  },
  commissionAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  commissionActionText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 15,
  },
  showAllButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  showAllButtonText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 70,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  modalCloseButton: {},
  modalContent: {
    padding: 15,
  },
  modalText: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 15,
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  selectorContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  selectorLabel: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 8,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  selectorButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "600",
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  calculateButtonText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
  },
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
