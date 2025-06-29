// app/(reports)/commission-reports.tsx

// Import necessary components and libraries
import {
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
// Import API functions and color constants
import {
  getCommissionReports,
  getCurrentMonth,
  getCurrentYear,
  getMonthOptions,
  getYearOptions,
} from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define TypeScript interfaces for the commission report data structures
interface CommissionReport {
  repCommissions: RepCommission[];
  commissionHistory: CommissionHistory[];
}

interface RepCommission {
  user_id: string;
  full_name: string;
  commission_rate: number;
  total_sales: number;
  commission_amount: number;
}

interface CommissionHistory {
  month: number;
  year: number;
  rep_count: number;
  total_sales: number;
  total_commission: number;
  avg_commission_rate: number;
}

// Define the main component for the Commission Reports screen
export default function CommissionReports() {
  // State to manage loading indicator for data fetching
  const [loading, setLoading] = useState(true);
  // State to manage loading indicator for file exporting
  const [exporting, setExporting] = useState(false);
  // State to store the fetched commission report data
  const [reportData, setReportData] = useState<CommissionReport | null>(null);

  // State for the month dropdown picker
  const [monthOpen, setMonthOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(getCurrentMonth());
  const [monthItems, setMonthItems] = useState(getMonthOptions());

  // State for the year dropdown picker
  const [yearOpen, setYearOpen] = useState(false);
  const [yearValue, setYearValue] = useState(getCurrentYear());
  const [yearItems, setYearItems] = useState(getYearOptions());
  // Helper function to get the name of a month from its number
  const getMonthName = (monthNum: number): string => {
    if (!monthNum || monthNum < 1 || monthNum > 12) return "Unknown";
    const monthNames = [
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
    return monthNames[monthNum - 1];
  };

  // Helper function to format a number as currency (Sri Lankan Rupees)
  const formatCurrencyFn = (amount: number): string => {
    return `Rs. ${amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Function to calculate business insights from the report data
  const calculateInsights = () => {
    if (!reportData) return null;

    // Determine the top-performing sales representative based on commission amount
    const topPerformer =
      reportData.repCommissions.length > 0
        ? reportData.repCommissions.reduce(
            (prev, current) =>
              prev.commission_amount > current.commission_amount
                ? prev
                : current,
            reportData.repCommissions[0]
          )
        : null;

    // Filter for sales reps who have made sales
    const salesRepsWithSales = reportData.repCommissions.filter(
      (rep) => rep.total_sales > 0
    );

    // Determine the underperforming sales representative
    const underPerformer =
      salesRepsWithSales.length > 0
        ? salesRepsWithSales.reduce(
            (prev, current) =>
              prev.commission_amount < current.commission_amount
                ? prev
                : current,
            salesRepsWithSales[0]
          )
        : null;

    // Calculate the average commission amount per representative
    const avgCommissionAmount =
      reportData.repCommissions.length > 0
        ? reportData.repCommissions.reduce(
            (sum, rep) => sum + rep.commission_amount,
            0
          ) / reportData.repCommissions.length
        : 0;

    // Calculate the commission trend by comparing with the previous month
    let commissionTrend = 0;
    if (reportData.commissionHistory.length >= 2) {
      const currentMonth = reportData.commissionHistory[0];
      const previousMonth = reportData.commissionHistory[1];

      if (previousMonth.total_commission > 0) {
        commissionTrend =
          ((currentMonth.total_commission - previousMonth.total_commission) /
            previousMonth.total_commission) *
          100;
      }
    }

    // Calculate the total commissions paid over the available history
    const annualCommissionsPaid = reportData.commissionHistory.reduce(
      (sum, month) => sum + month.total_commission,
      0
    );

    // Calculate commission as a percentage of total sales for the current month
    const commissionPercentageOfSales =
      reportData.commissionHistory.length > 0
        ? (reportData.commissionHistory[0].total_commission /
            Math.max(reportData.commissionHistory[0].total_sales, 1)) *
          100
        : 0;

    // Return all calculated insights
    return {
      topPerformer,
      underPerformer,
      avgCommissionAmount,
      commissionTrend,
      annualCommissionsPaid,
      commissionPercentageOfSales,
    };
  };
  // Asynchronous function to fetch commission reports from the API
  const fetchCommissionReports = async () => {
    try {
      setLoading(true);
      console.log("Fetching with filters:", {
        month: monthValue,
        year: yearValue,
      });
      // Call the API with the selected month and year
      const data = await getCommissionReports({
        month: monthValue,
        year: yearValue,
      });
      console.log("Received data:", data);
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to fetch commission reports:", err);
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the commission report data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to generate a comprehensive PDF report from the data
  const generatePdfReport = async () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format the current date for the report header
    const today = new Date();
    const formattedDate = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;

    // Generate HTML for the sales rep commissions table
    let repCommissionsHtml = "";
    reportData.repCommissions.forEach((rep, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      repCommissionsHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${rep.full_name}</td>
          <td>${rep.commission_rate}%</td>
          <td>Rs. ${rep.total_sales.toLocaleString()}</td>
          <td>Rs. ${rep.commission_amount.toLocaleString()}</td>
          <td>${(
            (rep.commission_amount / Math.max(rep.total_sales, 1)) *
            100
          ).toFixed(2)}%</td>
        </tr>
      `;
    });

    // Generate HTML for the commission history table
    let commissionHistoryHtml = "";
    reportData.commissionHistory.forEach((history, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const monthName = getMonthName(history.month);

      commissionHistoryHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${monthName} ${history.year}</td>
          <td>${history.rep_count}</td>
          <td>Rs. ${history.total_sales.toLocaleString()}</td>
          <td>Rs. ${history.total_commission.toLocaleString()}</td>
          <td>${history.avg_commission_rate}%</td>
        </tr>
      `;
    });

    // Prepare data for the commission history chart
    let historyLabels = "";
    let historySalesData = "";
    let historyCommissionData = "";

    if (reportData.commissionHistory.length > 0) {
      reportData.commissionHistory
        .slice()
        .reverse()
        .forEach((history) => {
          const monthName = getMonthName(history.month);
          historyLabels += `'${monthName.substring(0, 3)}',`;
          historySalesData += `${history.total_sales},`;
          historyCommissionData += `${history.total_commission},`;
        });

      // Remove trailing commas from chart data strings
      historyLabels = historyLabels.slice(0, -1);
      historySalesData = historySalesData.slice(0, -1);
      historyCommissionData = historyCommissionData.slice(0, -1);
    }

    // The complete HTML structure for the PDF report
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sales Commission Report - Roo Herbals</title>
          <style>
            body {
              font-family: 'Helvetica', Arial, sans-serif;
              padding: 40px;
              color: #333;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              color: #7DA453;
            }
            .header img {
              max-width: 150px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #7DA453;
            }
            .header p {
              margin: 5px 0 0;
              color: #777;
              font-size: 14px;
            }
            .section {
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
            }
            .section h2 {
              color: #346491;
              font-size: 18px;
              margin-top: 0;
              margin-bottom: 15px;
            }
            .insights-container {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 20px;
            }
            .insight-card {
              flex: 1;
              min-width: 200px;
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 15px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .insight-title {
              font-size: 14px;
              color: #666;
              margin: 0 0 5px 0;
            }
            .insight-value {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin: 0;
            }
            .insight-trend {
              font-size: 12px;
              margin: 5px 0 0;
            }
            .trend-up {
              color: #28a745;
            }
            .trend-down {
              color: #dc3545;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 14px;
            }
            th {
              background-color: #7DA453;
              color: white;
              text-align: left;
              padding: 10px;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #ddd;
            }
            .chart {
              width: 100%;
              height: 250px;
              margin: 20px 0;
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 15px;
            }
            .top-performer {
              background-color: #f0f5ea;
              border-left: 4px solid #7DA453;
              padding: 15px;
              margin: 20px 0;
            }
            .top-performer h3 {
              margin-top: 0;
              color: #7DA453;
            }
            .recommendations {
              background-color: #f0f5ea;
              border-left: 4px solid #7DA453;
              padding: 15px;
              margin: 20px 0;
            }
            .recommendations h3 {
              margin-top: 0;
              color: #7DA453;
            }
            .recommendations ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #777;
            }
            canvas {
              max-width: 100%;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <!-- Report Header -->
          <div class="header">
            <h1>Roo Herbals Pvt Ltd</h1>
            <h2>Sales Commission Report</h2>
            <p>Period: ${getMonthName(monthValue)} ${yearValue}</p>
            <p>Generated on: ${formattedDate}</p>
          </div>
          
          <!-- Executive Summary Section -->
          <div class="section">
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive analysis of sales representatives' performance and commission payouts. Use these insights to motivate your sales team and optimize commission structures.</p>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Total Commissions</p>
                <p class="insight-value">Rs. ${Math.round(
                  insights.annualCommissionsPaid
                ).toLocaleString()}</p>
                <p class="insight-subtitle">Last 4 months</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Commission Trend</p>
                <p class="insight-value">${Math.round(
                  insights.commissionTrend
                )}%</p>
                <p class="insight-trend ${
                  insights.commissionTrend >= 0 ? "trend-up" : "trend-down"
                }">
                  ${insights.commissionTrend >= 0 ? "↑" : "↓"} Month-over-Month
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Avg. Commission / Rep</p>
                <p class="insight-value">Rs. ${Math.round(
                  insights.avgCommissionAmount
                ).toLocaleString()}</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Commission Rate</p>
                <p class="insight-value">${
                  Math.round(insights.commissionPercentageOfSales * 100) / 100
                }%</p>
                <p class="insight-subtitle">of total sales</p>
              </div>
            </div>
          </div>
          
          <!-- Top Performer Section -->
          ${
            insights.topPerformer
              ? `
            <div class="top-performer">
              <h3>Top Performer: ${insights.topPerformer.full_name}</h3>
              <p>Generated <strong>Rs. ${insights.topPerformer.total_sales.toLocaleString()}</strong> in sales with a commission of <strong>Rs. ${insights.topPerformer.commission_amount.toLocaleString()}</strong> at a rate of <strong>${
                  insights.topPerformer.commission_rate
                }%</strong>.</p>
              <p>This represents ${
                reportData.repCommissions.length > 0
                  ? (
                      (insights.topPerformer.commission_amount /
                        Math.max(insights.annualCommissionsPaid, 1)) *
                      100
                    ).toFixed(1)
                  : 0
              }% of the total commissions paid this period.</p>
            </div>
          `
              : ""
          }
          
          <!-- Sales Representatives Performance Table -->
          <div class="section">
            <h2>Sales Representatives Performance</h2>
            <p>Individual performance of each sales representative showing their sales achievement and resulting commission.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Sales Representative</th>
                  <th>Commission Rate</th>
                  <th>Total Sales</th>
                  <th>Commission Amount</th>
                  <th>% of Sales</th>
                </tr>
              </thead>
              <tbody>
                ${repCommissionsHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Commission History Section with Chart -->
          <div class="section">
            <h2>Commission History</h2>
            <p>Historical data showing sales performance and commission payouts over the last few months.</p>
            
            <div class="chart">
              <canvas id="commissionChart"></canvas>
            </div>
            <script>
              // This script generates the chart in the PDF, requires JS execution support
              document.addEventListener('DOMContentLoaded', function() {
                const ctx = document.getElementById('commissionChart').getContext('2d');
                new Chart(ctx, {
                  type: 'bar',
                  data: {
                    labels: [${historyLabels}],
                    datasets: [
                      {
                        label: 'Sales',
                        data: [${historySalesData}],
                        backgroundColor: 'rgba(52, 100, 145, 0.7)',
                        borderColor: 'rgba(52, 100, 145, 1)',
                        borderWidth: 1,
                        order: 1
                      },
                      {
                        label: 'Commission',
                        data: [${historyCommissionData}],
                        backgroundColor: 'rgba(125, 164, 83, 0.7)',
                        borderColor: 'rgba(125, 164, 83, 1)',
                        borderWidth: 1,
                        type: 'line',
                        order: 0
                      }
                    ]
                  },
                  options: {
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }
                });
              });
            </script>
            
            <!-- Commission History Table -->
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Sales Reps</th>
                  <th>Total Sales</th>
                  <th>Total Commission</th>
                  <th>Avg. Commission Rate</th>
                </tr>
              </thead>
              <tbody>
                ${commissionHistoryHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Recommendations Section -->
          <div class="section">
            <h2>Recommendations & Action Points</h2>
            <ul>
              ${
                insights.commissionTrend < 0
                  ? `
                <li>
                  <strong>Address declining trend:</strong> Commission payouts show a ${Math.abs(
                    Math.round(insights.commissionTrend)
                  )}% decrease compared to previous month. 
                  Review sales targets and provide additional support where needed.
                </li>
              `
                  : ""
              }
              
              ${
                insights.topPerformer
                  ? `
                <li>
                  <strong>Recognize top performers:</strong> Acknowledge ${insights.topPerformer.full_name}'s outstanding performance and consider sharing their 
                  successful strategies with the rest of the team.
                </li>
              `
                  : ""
              }
              
              ${
                insights.underPerformer && insights.topPerformer
                  ? `
                <li>
                  <strong>Support underperforming reps:</strong> Consider providing additional training and support to ${
                    insights.underPerformer.full_name
                  } 
                  who generated Rs. ${insights.underPerformer.total_sales.toLocaleString()} in sales, significantly below the top performer.
                </li>
              `
                  : ""
              }
              
              <li>
                <strong>Review commission structure:</strong> The average commission rate is ${
                  reportData.commissionHistory.length > 0
                    ? reportData.commissionHistory[0].avg_commission_rate
                    : 0
                }%. 
                Evaluate if this rate continues to provide adequate motivation while remaining cost-effective.
              </li>
              
              <li>
                <strong>Plan for seasonality:</strong> Analyze commission trends across months to identify seasonal patterns and prepare 
                for potential fluctuations in commission payouts.
              </li>
            </ul>
          </div>
          
          <!-- Report Footer -->
          <div class="footer">
            <p>© ${new Date().getFullYear()} Roo Herbals Pvt Ltd | This report is confidential and intended for internal use only.</p>
            <p>For questions about this report, please contact the system administrator.</p>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  // Function to generate data formatted for a CSV/Excel file
  const generateExcelData = () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Sheet 1: Executive Summary
    let summarySheet = "Roo Herbals - Sales Commission Report\n";
    summarySheet += `Period: ${getMonthName(monthValue)} ${yearValue}\n`;
    summarySheet += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    summarySheet += "EXECUTIVE SUMMARY\n\n";
    summarySheet += `Total Commissions (Last 4 months),Rs. ${Math.round(
      insights.annualCommissionsPaid
    ).toLocaleString()}\n`;
    summarySheet += `Commission Trend,${Math.round(
      insights.commissionTrend
    )}%\n`;
    summarySheet += `Average Commission per Rep,Rs. ${Math.round(
      insights.avgCommissionAmount
    ).toLocaleString()}\n`;
    summarySheet += `Commission as % of Sales,${
      Math.round(insights.commissionPercentageOfSales * 100) / 100
    }%\n\n`;

    if (insights.topPerformer) {
      summarySheet += "TOP PERFORMER\n\n";
      summarySheet += `Name,${insights.topPerformer.full_name}\n`;
      summarySheet += `Total Sales,Rs. ${insights.topPerformer.total_sales.toLocaleString()}\n`;
      summarySheet += `Commission Amount,Rs. ${insights.topPerformer.commission_amount.toLocaleString()}\n`;
      summarySheet += `Commission Rate,${insights.topPerformer.commission_rate}%\n\n`;
    }

    // Sheet 2: Sales Representatives Performance
    let repsSheet = "SALES REPRESENTATIVES PERFORMANCE\n\n";
    repsSheet +=
      "Sales Representative,Commission Rate,Total Sales,Commission Amount,% of Sales\n";

    reportData.repCommissions.forEach((rep) => {
      const percentOfSales = (
        (rep.commission_amount / Math.max(rep.total_sales, 1)) *
        100
      ).toFixed(2);
      repsSheet += `${rep.full_name},${
        rep.commission_rate
      }%,Rs. ${rep.total_sales.toLocaleString()},Rs. ${rep.commission_amount.toLocaleString()},${percentOfSales}%\n`;
    });

    // Sheet 3: Commission History
    let historySheet = "COMMISSION HISTORY\n\n";
    historySheet +=
      "Month,Year,Sales Reps,Total Sales,Total Commission,Avg. Commission Rate\n";

    reportData.commissionHistory.forEach((history) => {
      const monthName = getMonthName(history.month);
      historySheet += `${monthName},${history.year},${
        history.rep_count
      },Rs. ${history.total_sales.toLocaleString()},Rs. ${history.total_commission.toLocaleString()},${
        history.avg_commission_rate
      }%\n`;
    });

    // Sheet 4: Recommendations
    let recommendationsSheet = "RECOMMENDATIONS & ACTION POINTS\n\n";

    if (insights.commissionTrend < 0) {
      recommendationsSheet += `1,Address declining trend: Commission payouts show a ${Math.abs(
        Math.round(insights.commissionTrend)
      )}% decrease compared to previous month. Review sales targets and provide additional support.\n`;
    } else {
      recommendationsSheet += `1,Maintain positive momentum: Commission payouts have increased by ${Math.round(
        insights.commissionTrend
      )}% compared to previous month.\n`;
    }

    if (insights.topPerformer) {
      recommendationsSheet += `2,Recognize top performers: Acknowledge ${insights.topPerformer.full_name}'s outstanding performance and consider sharing their successful strategies.\n`;
    }

    if (insights.underPerformer && insights.topPerformer) {
      recommendationsSheet += `3,Support underperforming reps: Consider providing additional training to ${insights.underPerformer.full_name} who generated significantly less sales than top performers.\n`;
    }

    recommendationsSheet += `4,Review commission structure: The average commission rate is ${
      reportData.commissionHistory.length > 0
        ? reportData.commissionHistory[0].avg_commission_rate
        : 0
    }%. Evaluate if this rate provides adequate motivation.\n`;
    recommendationsSheet += `5,Plan for seasonality: Analyze commission trends across months to identify seasonal patterns and prepare for fluctuations.\n`;

    // Return each sheet's content as a separate string
    return {
      summarySheet,
      repsSheet,
      historySheet,
      recommendationsSheet,
    };
  };

  // Function to handle exporting the report as either PDF or Excel/CSV
  const handleExport = async (format: string) => {
    try {
      setExporting(true);

      if (format === "excel") {
        // Generate data for the Excel/CSV file
        const excelData = generateExcelData();
        if (!excelData) {
          throw new Error("Failed to generate report data");
        }

        // Combine all sheets into a single CSV string
        let csvContent = excelData.summarySheet + "\n\n";
        csvContent += excelData.repsSheet + "\n\n";
        csvContent += excelData.historySheet + "\n\n";
        csvContent += excelData.recommendationsSheet;

        // Define the filename and path for the CSV file
        const filename = `roo_herbals_commission_report_${getMonthName(
          monthValue
        )}_${yearValue}.csv`;
        const filePath = `${FileSystem.documentDirectory}${filename}`;

        // Write the CSV content to the file system
        await FileSystem.writeAsStringAsync(filePath, csvContent);

        // Use the Sharing API to share the generated file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            "Sharing not available",
            "Sharing is not available on this device"
          );
        }
      } else if (format === "pdf") {
        // Generate the HTML content for the PDF
        const html = await generatePdfReport();
        if (!html) {
          throw new Error("Failed to generate PDF content");
        }

        // Use the Print API to create a PDF file from the HTML
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        // Use the Sharing API to share the generated PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert(
            "Sharing not available",
            "Sharing is not available on this device"
          );
        }
      }
    } catch (err: any) {
      console.error(`Error exporting ${format}:`, err);
      Alert.alert("Export Failed", err.message || `Failed to export ${format}`);
    } finally {
      setExporting(false);
    }
  };
  // useEffect hook to fetch data when the component mounts or when month/year values change
  useEffect(() => {
    fetchCommissionReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthValue, yearValue]);

  // Display a loading indicator while data is being fetched
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commission Reports</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading commission reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate insights for rendering in the UI
  const insights = calculateInsights();

  // Main component render method
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {/* Header with back button, title, and refresh button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commission Reports</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCommissionReports}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>
      {/* Period selection dropdowns for month and year */}
      <View style={styles.periodContainer}>
        <Text style={styles.periodLabel}>Select Period:</Text>
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdown}>
            <DropDownPicker
              open={monthOpen}
              value={monthValue}
              items={monthItems}
              setOpen={setMonthOpen}
              setValue={(value) => {
                setMonthValue(value);
                // Close dropdown after selection
                setMonthOpen(false);
              }}
              setItems={setMonthItems}
              placeholder="Month"
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownListStyle}
              textStyle={styles.dropdownTextStyle}
              zIndex={3000}
              zIndexInverse={1000}
            />
          </View>
          <View style={styles.dropdown}>
            <DropDownPicker
              open={yearOpen}
              value={yearValue}
              items={yearItems}
              setOpen={setYearOpen}
              setValue={(value) => {
                setYearValue(value);
                // Close dropdown after selection
                setYearOpen(false);
              }}
              setItems={setYearItems}
              placeholder="Year"
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownListStyle}
              textStyle={styles.dropdownTextStyle}
              zIndex={2000}
              zIndexInverse={2000}
            />
          </View>
        </View>
      </View>
      {/* Export Actions */}
      <View style={styles.exportContainer}>
        <Text style={styles.exportLabel}>Export Insights Report:</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport("excel")}
            disabled={exporting}
          >
            <MaterialCommunityIcons
              name="microsoft-excel"
              size={22}
              color="#217346"
            />
            <Text style={styles.exportButtonText}>Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport("pdf")}
            disabled={exporting}
          >
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={22}
              color="#F40F02"
            />
            <Text style={styles.exportButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Show an overlay with a loading indicator when exporting */}
      {exporting && (
        <View style={styles.exportingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.exportingText}>
            Preparing comprehensive report...
          </Text>
        </View>
      )}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics Section */}
        {insights && (
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Total Commissions</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(
                  reportData?.commissionHistory[0]?.total_commission || 0
                )}
              </Text>
              <Text style={styles.insightDescription}>This month</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Commission Trend</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.commissionTrend >= 0
                    ? styles.positiveValue
                    : styles.negativeValue,
                ]}
              >
                {Math.round(insights.commissionTrend)}%
              </Text>
              <Text style={styles.insightDescription}>Month-over-month</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Avg. Per Rep</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(insights.avgCommissionAmount)}
              </Text>
              <Text style={styles.insightDescription}>This month</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Sales Reps</Text>
              <Text style={styles.insightValue}>
                {reportData?.repCommissions.length || 0}
              </Text>
              <Text style={styles.insightDescription}>Active reps</Text>
            </View>
          </View>
        )}

        {/* Top Performer Section */}
        {insights?.topPerformer && (
          <View style={styles.topPerformerContainer}>
            <View style={styles.topPerformerHeader}>
              <MaterialCommunityIcons name="medal" size={24} color="#FFD700" />
              <Text style={styles.topPerformerTitle}>Top Performer</Text>
            </View>

            <Text style={styles.topPerformerName}>
              {insights.topPerformer.full_name}
            </Text>

            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {formatCurrencyFn(insights.topPerformer.total_sales)}
                </Text>
                <Text style={styles.performanceStatLabel}>Total Sales</Text>
              </View>

              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {formatCurrencyFn(insights.topPerformer.commission_amount)}
                </Text>
                <Text style={styles.performanceStatLabel}>Commission</Text>
              </View>

              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {insights.topPerformer.commission_rate}%
                </Text>
                <Text style={styles.performanceStatLabel}>Rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sales Representatives Section */}
        <Text style={styles.sectionTitle}>Sales Representatives</Text>

        {reportData?.repCommissions && reportData.repCommissions.length > 0 ? (
          <View style={styles.cardContainer}>
            {reportData.repCommissions.map((rep, index) => {
              // Calculate performance relative to top performer
              const topSales =
                reportData.repCommissions.length > 0
                  ? Math.max(
                      ...reportData.repCommissions.map((r) => r.total_sales),
                      1
                    )
                  : 1;
              const salesPercentage =
                topSales > 0 ? (rep.total_sales / topSales) * 100 : 0;

              return (
                <View key={rep.user_id} style={styles.repCard}>
                  <View style={styles.repDetails}>
                    <Text style={styles.repName}>{rep.full_name}</Text>
                    <Text style={styles.repCommissionRate}>
                      {rep.commission_rate}% commission rate
                    </Text>
                  </View>

                  <View style={styles.repPerformance}>
                    <View style={styles.repStat}>
                      <Text style={styles.repStatLabel}>Sales</Text>
                      <Text style={styles.repStatValue}>
                        {formatCurrencyFn(rep.total_sales)}
                      </Text>
                    </View>

                    <View style={styles.repStat}>
                      <Text style={styles.repStatLabel}>Commission</Text>
                      <Text style={styles.repStatValue}>
                        {formatCurrencyFn(rep.commission_amount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.repProgressContainer}>
                    <View
                      style={[
                        styles.repProgress,
                        { width: `${Math.max(salesPercentage, 5)}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="account-off"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>
              No sales representatives data available
            </Text>
          </View>
        )}

        {/* Commission History Section */}
        <Text style={styles.sectionTitle}>Commission History</Text>

        {reportData?.commissionHistory &&
        reportData.commissionHistory.length > 0 ? (
          <View style={styles.historyContainer}>
            {reportData.commissionHistory.map((history, index) => {
              const monthName = getMonthName(history.month);

              return (
                <View
                  key={`${history.month}-${history.year}`}
                  style={styles.historyCard}
                >
                  <View style={styles.historyPeriod}>
                    <Text style={styles.historyMonth}>{monthName}</Text>
                    <Text style={styles.historyYear}>{history.year}</Text>
                  </View>

                  <View style={styles.historySummary}>
                    <View style={styles.historyItem}>
                      <Text style={styles.historyLabel}>Sales</Text>
                      <Text style={styles.historyValue}>
                        {formatCurrencyFn(history.total_sales)}
                      </Text>
                    </View>

                    <View style={styles.historyItem}>
                      <Text style={styles.historyLabel}>Commission</Text>
                      <Text style={styles.historyValue}>
                        {formatCurrencyFn(history.total_commission)}
                      </Text>
                    </View>

                    <View style={styles.historyItem}>
                      <Text style={styles.historyLabel}>Reps</Text>
                      <Text style={styles.historyValue}>
                        {history.rep_count}
                      </Text>
                    </View>

                    <View style={styles.historyItem}>
                      <Text style={styles.historyLabel}>Avg. Rate</Text>
                      <Text style={styles.historyValue}>
                        {history.avg_commission_rate}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={40} color="#ADB5BD" />
            <Text style={styles.emptyText}>
              No commission history available
            </Text>
          </View>
        )}

        {/* Recommendations Section */}
        {insights && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Recommendations</Text>

            <View style={styles.recommendationCard}>
              {insights.commissionTrend < 0 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#F8D7DA" },
                    ]}
                  >
                    <MaterialIcons
                      name="trending-down"
                      size={20}
                      color="#DC3545"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Address declining trend
                    </Text>
                    <Text style={styles.recommendationText}>
                      Commission payouts show a{" "}
                      {Math.abs(Math.round(insights.commissionTrend))}% decrease
                      compared to previous month. Review sales targets and
                      provide additional support.
                    </Text>
                  </View>
                </View>
              )}

              {insights.commissionTrend >= 0 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D4EDDA" },
                    ]}
                  >
                    <MaterialIcons
                      name="trending-up"
                      size={20}
                      color="#28A745"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Maintain positive momentum
                    </Text>
                    <Text style={styles.recommendationText}>
                      Commission payouts have increased by{" "}
                      {Math.round(insights.commissionTrend)}% compared to
                      previous month. Recognize and reinforce successful sales
                      strategies.
                    </Text>
                  </View>
                </View>
              )}

              {insights.topPerformer && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#FFF3CD" },
                    ]}
                  >
                    <FontAwesome5 name="star" size={18} color="#FFC107" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Recognize top performers
                    </Text>
                    <Text style={styles.recommendationText}>
                      Acknowledge {insights.topPerformer.full_name}&apos;s
                      outstanding performance and consider sharing their
                      successful strategies with the team.
                    </Text>
                  </View>
                </View>
              )}

              {insights.underPerformer && insights.topPerformer && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D1ECF1" },
                    ]}
                  >
                    <MaterialIcons name="people" size={20} color="#17A2B8" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Support underperforming reps
                    </Text>
                    <Text style={styles.recommendationText}>
                      Consider providing additional training to{" "}
                      {insights.underPerformer.full_name} who generated
                      significantly less sales than top performers.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.recommendation}>
                <View
                  style={[
                    styles.recommendationIcon,
                    { backgroundColor: "#D4EDDA" },
                  ]}
                >
                  <MaterialIcons name="settings" size={20} color="#28A745" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>
                    Review commission structure
                  </Text>
                  <Text style={styles.recommendationText}>
                    The average commission rate is{" "}
                    {reportData?.commissionHistory &&
                    reportData.commissionHistory.length > 0
                      ? reportData.commissionHistory[0].avg_commission_rate
                      : 0}
                    %. Evaluate if this rate continues to provide adequate
                    motivation while remaining cost-effective.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Spacer for bottom navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

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
    paddingVertical: 15,
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  headerTitle: {
    color: COLORS.light,
    fontSize: 18,
    fontWeight: "700",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  periodContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    zIndex: 4000,
  },
  periodLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  dropdownContainer: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    justifyContent: "flex-end",
  },
  dropdown: {
    width: 120,
    zIndex: 5000,
  },
  dropdownStyle: {
    borderColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
    minHeight: 38,
  },
  dropdownListStyle: {
    borderColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  dropdownTextStyle: {
    fontSize: 14,
    color: "#495057",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90, // Extra padding for bottom navigation
  },
  exportContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  exportLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  exportButtons: {
    flexDirection: "row",
    gap: 10,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  exportButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
  },
  exportingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#FFF9DB",
  },
  exportingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6c757d",
  },
  insightsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  insightCard: {
    width: (width - 40) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  positiveValue: {
    color: "#28A745",
  },
  negativeValue: {
    color: "#DC3545",
  },
  insightDescription: {
    fontSize: 12,
    color: "#ADB5BD",
  },
  topPerformerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  topPerformerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  topPerformerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginLeft: 8,
  },
  topPerformerName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 12,
  },
  performanceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  performanceStat: {
    alignItems: "center",
  },
  performanceStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  performanceStatLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
  },
  cardContainer: {
    marginBottom: 16,
  },
  repCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  repDetails: {
    marginBottom: 8,
  },
  repName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  repCommissionRate: {
    fontSize: 14,
    color: "#6c757d",
  },
  repPerformance: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  repStat: {
    alignItems: "flex-start",
  },
  repStatLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  repStatValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  repProgressContainer: {
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
  },
  repProgress: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  historyContainer: {
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyPeriod: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  historyMonth: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  historyYear: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 4,
  },
  historySummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  historyItem: {
    width: "48%",
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  historyValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  recommendationsContainer: {
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendation: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  bottomSpacer: {
    height: 30,
  },
});
