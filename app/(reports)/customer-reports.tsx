// app/(reports)/customer-reports.tsx

import {
  Feather,
  FontAwesome5,
  Ionicons,
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
import { ProgressBar } from "react-native-paper";
import { getCustomerReports } from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define types for customer reports data
interface CustomerReport {
  topCustomers: TopCustomer[];
  creditCustomers: CreditCustomer[];
  customerAcquisition: CustomerAcquisition[];
  salesByArea: SalesByArea[];
}

interface TopCustomer {
  customer_id: string;
  name: string;
  area: string;
  order_count: number;
  total_spent: number;
}

interface CreditCustomer {
  customer_id: string;
  name: string;
  credit_balance: number;
  credit_limit: number;
  credit_usage_percent: number;
}

interface CustomerAcquisition {
  month: string;
  new_customers: number;
}

interface SalesByArea {
  area: string;
  customer_count: number;
  order_count: number;
  total_sales: number;
}

export default function CustomerReports() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<CustomerReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Helper function to format currency
  const formatCurrencyFn = (amount: any): string => {
    // Handle various falsy values or NaN
    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      isNaN(Number(amount))
    ) {
      return "Rs. 0";
    }

    // Convert to number if it's a string
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;

    // Round and format with no decimals
    return `Rs. ${Math.round(numericAmount).toLocaleString("en-US")}`;
  };

  // Helper function to format month
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString("default", { month: "short", year: "numeric" });
  };

  // Calculate business insights based on report data
  const calculateInsights = () => {
    if (!reportData) return null;

    // Calculate average order value for top customers
    const topCustomersAvgOrder =
      reportData.topCustomers.length > 0
        ? reportData.topCustomers.reduce(
            (sum, customer) =>
              sum + customer.total_spent / Math.max(customer.order_count, 1),
            0
          ) / reportData.topCustomers.length
        : 0;

    // Find customer with highest credit risk (highest usage %)
    const highestCreditRisk =
      reportData.creditCustomers.length > 0
        ? reportData.creditCustomers.reduce((prev, current) =>
            prev.credit_usage_percent > current.credit_usage_percent
              ? prev
              : current
          )
        : null;

    // Calculate customer growth rate (comparing last two months)
    let customerGrowthRate = 0;
    if (reportData.customerAcquisition.length >= 2) {
      const lastMonth =
        reportData.customerAcquisition[
          reportData.customerAcquisition.length - 1
        ];
      const previousMonth =
        reportData.customerAcquisition[
          reportData.customerAcquisition.length - 2
        ];

      if (previousMonth.new_customers > 0) {
        customerGrowthRate =
          ((lastMonth.new_customers - previousMonth.new_customers) /
            previousMonth.new_customers) *
          100;
      }
    }

    // Find best performing area
    const bestArea =
      reportData.salesByArea.length > 0
        ? reportData.salesByArea.reduce((prev, current) =>
            prev.total_sales > current.total_sales ? prev : current
          )
        : null;

    // Find worst performing area
    const worstArea =
      reportData.salesByArea.length > 0
        ? reportData.salesByArea.reduce((prev, current) =>
            prev.total_sales < current.total_sales ? prev : current
          )
        : null;

    // Calculate average credit utilization
    const avgCreditUtilization =
      reportData.creditCustomers.length > 0
        ? reportData.creditCustomers.reduce(
            (sum, customer) => sum + customer.credit_usage_percent,
            0
          ) / reportData.creditCustomers.length
        : 0;

    // Calculate total outstanding credit
    const totalOutstandingCredit = reportData.creditCustomers.reduce(
      (sum, customer) => sum + customer.credit_balance,
      0
    );

    return {
      topCustomersAvgOrder,
      highestCreditRisk,
      customerGrowthRate,
      bestArea,
      worstArea,
      avgCreditUtilization,
      totalOutstandingCredit,
    };
  };

  // Fetch customer reports data
  const fetchCustomerReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerReports();
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to fetch customer reports:", err);
      setError(err.message || "Failed to load customer reports");
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the customer report data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Generate comprehensive PDF report
  const generatePdfReport = async () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format date for report title
    const today = new Date();
    const formattedDate = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;

    // Generate top customers table
    let topCustomersHtml = "";
    reportData.topCustomers.slice(0, 10).forEach((customer, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      topCustomersHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${index + 1}</td>
          <td>${customer.name}</td>
          <td>${customer.area}</td>
          <td>${customer.order_count}</td>
          <td>Rs. ${customer.total_spent.toLocaleString()}</td>
          <td>Rs. ${Math.round(
            customer.total_spent / Math.max(customer.order_count, 1)
          ).toLocaleString()}</td>
        </tr>
      `;
    });

    // Generate credit customers table
    let creditCustomersHtml = "";
    reportData.creditCustomers.slice(0, 10).forEach((customer, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const usageColor =
        customer.credit_usage_percent > 80
          ? "#dc3545"
          : customer.credit_usage_percent > 60
          ? "#fd7e14"
          : "#28a745";

      creditCustomersHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${customer.name}</td>
          <td>Rs. ${customer.credit_balance.toLocaleString()}</td>
          <td>Rs. ${customer.credit_limit.toLocaleString()}</td>
          <td style="color: ${usageColor}; font-weight: bold;">${
        customer.credit_usage_percent
      }%</td>
        </tr>
      `;
    });

    // Generate sales by area table
    let salesByAreaHtml = "";
    const totalSalesAllAreas = reportData.salesByArea.reduce(
      (sum, current) => sum + current.total_sales,
      0
    );

    reportData.salesByArea.forEach((areaData, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const percentage =
        totalSalesAllAreas > 0
          ? Math.round((areaData.total_sales / totalSalesAllAreas) * 100)
          : 0;

      salesByAreaHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${areaData.area || "Unknown"}</td>
          <td>${areaData.customer_count}</td>
          <td>${areaData.order_count}</td>
          <td>Rs. ${areaData.total_sales.toLocaleString()}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });

    // Generate customer acquisition chart
    let acquisitionData = "";
    let acquisitionLabels = "";

    reportData.customerAcquisition.slice(-6).forEach((item) => {
      acquisitionData += `${item.new_customers},`;
      acquisitionLabels += `'${formatMonth(item.month)}',`;
    });

    // Remove trailing commas
    acquisitionData = acquisitionData.slice(0, -1);
    acquisitionLabels = acquisitionLabels.slice(0, -1);

    // Create the HTML template for the PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Customer Insights Report - Roo Herbals</title>
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
            .risk-high {
              color: #dc3545;
              font-weight: bold;
            }
            .risk-medium {
              color: #fd7e14;
              font-weight: bold;
            }
            .risk-low {
              color: #28a745;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #777;
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
            canvas {
              max-width: 100%;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <div class="header">
            <h1>Roo Herbals Pvt Ltd</h1>
            <h2>Customer Insights Report</h2>
            <p>Generated on: ${formattedDate}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive analysis of customer performance, credit usage, and sales distribution across different areas. Use these insights to optimize customer relationships and improve business strategies.</p>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Total Customers with Credit</p>
                <p class="insight-value">${
                  reportData.creditCustomers.length
                }</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Outstanding Credit</p>
                <p class="insight-value">Rs. ${insights.totalOutstandingCredit.toLocaleString()}</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Avg. Credit Utilization</p>
                <p class="insight-value">${Math.round(
                  insights.avgCreditUtilization
                )}%</p>
                <p class="insight-trend ${
                  insights.avgCreditUtilization > 70 ? "trend-down" : "trend-up"
                }">
                  ${
                    insights.avgCreditUtilization > 70
                      ? "⚠️ High Risk"
                      : "✓ Healthy"
                  }
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Customer Growth Rate</p>
                <p class="insight-value">${Math.round(
                  insights.customerGrowthRate
                )}%</p>
                <p class="insight-trend ${
                  insights.customerGrowthRate >= 0 ? "trend-up" : "trend-down"
                }">
                  ${
                    insights.customerGrowthRate >= 0 ? "↑" : "↓"
                  } Month-over-Month
                </p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Top Performing Customers</h2>
            <p>These customers represent your highest revenue generators. Special attention should be given to maintain and grow these relationships.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer Name</th>
                  <th>Area</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Avg. Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${topCustomersHtml}
              </tbody>
            </table>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Avg. Order Value (Top Customers)</p>
                <p class="insight-value">Rs. ${Math.round(
                  insights.topCustomersAvgOrder
                ).toLocaleString()}</p>
              </div>
                <div class="insight-card">
                <p class="insight-title">Best Performing Area</p>
                <p class="insight-value">${insights.bestArea?.area || "N/A"}</p>
                <p class="insight-trend trend-up">Rs. ${
                  insights.bestArea?.total_sales
                    ? insights.bestArea.total_sales.toLocaleString()
                    : 0
                }</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Customer Credit Management</h2>
            <p>Monitoring credit usage helps identify potential risks and maintain healthy cash flow.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Credit Balance</th>
                  <th>Credit Limit</th>
                  <th>Usage %</th>
                </tr>
              </thead>
              <tbody>
                ${creditCustomersHtml}
              </tbody>
            </table>
            
            ${
              insights.highestCreditRisk
                ? `
              <div class="recommendations">                <h3>Credit Risk Alert</h3>
                <p><strong>${
                  insights.highestCreditRisk.name
                }</strong> has a credit usage of <span class="risk-high">${Math.round(
                    parseFloat(
                      insights.highestCreditRisk.credit_usage_percent.toString()
                    )
                  )}%</span> (Rs. ${parseFloat(
                    insights.highestCreditRisk.credit_balance.toString()
                  ).toLocaleString()} of Rs. ${parseFloat(
                    insights.highestCreditRisk.credit_limit.toString()
                  ).toLocaleString()}).</p>
                <p>Recommended action: Follow up with this customer for payment collection to reduce credit exposure.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Sales by Geographic Area</h2>
            <p>Understanding area performance helps optimize sales territory management and resource allocation.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Customers</th>
                  <th>Orders</th>
                  <th>Total Sales</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                ${salesByAreaHtml}
              </tbody>
            </table>
            
            <div class="recommendations">
              <h3>Area Performance Insights</h3>
              <ul>                <li><strong>Best performing area:</strong> ${
                insights.bestArea?.area || "N/A"
              } with Rs. ${
      (insights.bestArea?.total_sales &&
        insights.bestArea.total_sales.toLocaleString()) ||
      0
    } in sales.</li>
                <li><strong>Opportunity area:</strong> ${
                  insights.worstArea?.area || "N/A"
                } with only Rs. ${
      (insights.worstArea?.total_sales &&
        insights.worstArea.total_sales.toLocaleString()) ||
      0
    } in sales has potential for growth.</li>
              </ul>
              <p>Consider reallocating resources to boost performance in underperforming areas or investigate reasons for low sales.</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Recommendations & Action Points</h2>
            <ul>
              <li>Implement a loyalty program for top customers to maintain their business relationship.</li>
              <li>Follow up with customers having high credit usage to reduce outstanding balances.</li>
              <li>Explore opportunities to increase customer acquisition in ${
                insights.worstArea?.area || "underperforming areas"
              }.</li>
              <li>Consider special promotions for customers with low ordering frequency to increase engagement.</li>
              <li>Develop targeted marketing strategies for areas with high customer concentration but low sales.</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Roo Herbals Pvt Ltd | This report is confidential and intended for internal use only.</p>
            <p>For questions about this report, please contact the system administrator.</p>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  // Generate Excel/CSV report data
  const generateExcelData = () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Create workbook with multiple sheets

    // Sheet 1: Executive Summary
    let summarySheet = "Roo Herbals - Customer Insights Report\n";
    summarySheet += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    summarySheet += "EXECUTIVE SUMMARY\n\n";
    summarySheet += `Total Customers with Credit,${reportData.creditCustomers.length}\n`;
    summarySheet += `Outstanding Credit,Rs. ${Math.round(
      insights.totalOutstandingCredit
    ).toLocaleString()}\n`;
    summarySheet += `Average Credit Utilization,${Math.round(
      insights.avgCreditUtilization
    )}%\n`;
    summarySheet += `Customer Growth Rate,${Math.round(
      insights.customerGrowthRate
    )}%\n\n`;

    summarySheet += "KEY METRICS\n\n";
    summarySheet += `Average Order Value (Top Customers),Rs. ${Math.round(
      insights.topCustomersAvgOrder
    ).toLocaleString()}\n`;
    summarySheet += `Best Performing Area,${
      insights.bestArea?.area || "N/A"
    },Rs. ${
      insights.bestArea?.total_sales
        ? Math.round(insights.bestArea.total_sales).toLocaleString()
        : 0
    }\n`;
    summarySheet += `Worst Performing Area,${
      insights.worstArea?.area || "N/A"
    },Rs. ${
      insights.worstArea?.total_sales
        ? Math.round(insights.worstArea.total_sales).toLocaleString()
        : 0
    }\n\n`;

    // Sheet 2: Top Customers
    let topCustomersSheet = "TOP PERFORMING CUSTOMERS\n\n";
    topCustomersSheet +=
      "Rank,Customer Name,Area,Orders,Total Spent,Avg Order Value\n";

    reportData.topCustomers.forEach((customer, index) => {
      const avgOrderValue = Math.round(
        customer.total_spent / Math.max(customer.order_count, 1)
      );
      topCustomersSheet += `${index + 1},${customer.name.replace(/,/g, " ")},${
        customer.area
      },${customer.order_count},Rs. ${parseFloat(
        customer.total_spent.toString()
      ).toLocaleString()},Rs. ${avgOrderValue.toLocaleString()}\n`;
    });

    // Sheet 3: Credit Management
    let creditSheet = "CUSTOMER CREDIT MANAGEMENT\n\n";
    creditSheet +=
      "Customer Name,Credit Balance,Credit Limit,Usage %,Risk Level\n";

    reportData.creditCustomers.forEach((customer) => {
      const riskLevel =
        customer.credit_usage_percent > 80
          ? "High"
          : customer.credit_usage_percent > 60
          ? "Medium"
          : "Low";
      creditSheet += `${customer.name.replace(/,/g, " ")},Rs. ${parseFloat(
        customer.credit_balance.toString()
      ).toLocaleString()},Rs. ${parseFloat(
        customer.credit_limit.toString()
      ).toLocaleString()},${Math.round(
        parseFloat(customer.credit_usage_percent.toString())
      )}%,${riskLevel}\n`;
    });

    // Sheet 4: Customer Acquisition
    let acquisitionSheet = "CUSTOMER ACQUISITION TREND\n\n";
    acquisitionSheet += "Month,New Customers\n";

    reportData.customerAcquisition.forEach((item) => {
      acquisitionSheet += `${formatMonth(item.month)},${item.new_customers}\n`;
    });

    // Sheet 5: Sales by Area
    let areaSheet = "SALES BY GEOGRAPHIC AREA\n\n";
    areaSheet += "Area,Customers,Orders,Total Sales,% of Total\n";

    const totalSalesAllAreas = reportData.salesByArea.reduce(
      (sum, current) => sum + current.total_sales,
      0
    );

    reportData.salesByArea.forEach((areaData) => {
      const percentage =
        totalSalesAllAreas > 0
          ? Math.round((areaData.total_sales / totalSalesAllAreas) * 100)
          : 0;
      areaSheet += `${areaData.area || "Unknown"},${areaData.customer_count},${
        areaData.order_count
      },Rs. ${parseFloat(
        areaData.total_sales.toString()
      ).toLocaleString()},${percentage}%\n`;
    });

    // Sheet 6: Recommendations
    let recommendationsSheet = "RECOMMENDATIONS & ACTION POINTS\n\n";
    recommendationsSheet +=
      "1,Implement a loyalty program for top customers to maintain their business relationship.\n";
    recommendationsSheet +=
      "2,Follow up with customers having high credit usage to reduce outstanding balances.\n";
    recommendationsSheet += `3,Explore opportunities to increase customer acquisition in ${
      insights.worstArea?.area || "underperforming areas"
    }.\n`;
    recommendationsSheet +=
      "4,Consider special promotions for customers with low ordering frequency to increase engagement.\n";
    recommendationsSheet +=
      "5,Develop targeted marketing strategies for areas with high customer concentration but low sales.\n";

    return {
      summarySheet,
      topCustomersSheet,
      creditSheet,
      acquisitionSheet,
      areaSheet,
      recommendationsSheet,
    };
  };

  // Export customer data
  const handleExport = async (format: string) => {
    try {
      setExporting(true);

      if (format === "excel") {
        // Generate Excel report
        const excelData = generateExcelData();
        if (!excelData) {
          throw new Error("Failed to generate report data");
        }

        // Create a multi-sheet CSV file
        let csvContent = excelData.summarySheet + "\n\n";
        csvContent += excelData.topCustomersSheet + "\n\n";
        csvContent += excelData.creditSheet + "\n\n";
        csvContent += excelData.acquisitionSheet + "\n\n";
        csvContent += excelData.areaSheet + "\n\n";
        csvContent += excelData.recommendationsSheet;

        const filename = `roo_herbals_customer_insights_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        const filePath = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(filePath, csvContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            "Sharing not available",
            "Sharing is not available on this device"
          );
        }
      } else if (format === "pdf") {
        // Generate PDF report
        const html = await generatePdfReport();
        if (!html) {
          throw new Error("Failed to generate PDF content");
        }

        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

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

  useEffect(() => {
    fetchCustomerReports();
  }, []);

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
          <Text style={styles.headerTitle}>Customer Reports</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customer reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate insights for display
  const insights = calculateInsights();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Reports</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCustomerReports}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
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
              <Text style={styles.insightLabel}>Avg. Order Value</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(Math.round(insights.topCustomersAvgOrder))}
              </Text>
              <Text style={styles.insightDescription}>Top customers</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Credit Utilization</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.avgCreditUtilization > 70
                    ? styles.negativeValue
                    : styles.positiveValue,
                ]}
              >
                {Math.round(insights.avgCreditUtilization)}%
              </Text>
              <Text style={styles.insightDescription}>Average usage</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>New Customers</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.customerGrowthRate >= 0
                    ? styles.positiveValue
                    : styles.negativeValue,
                ]}
              >
                {Math.round(insights.customerGrowthRate)}%
              </Text>
              <Text style={styles.insightDescription}>Monthly growth</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Outstanding</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(insights.totalOutstandingCredit)}
              </Text>
              <Text style={styles.insightDescription}>Total credit</Text>
            </View>
          </View>
        )}

        {/* Top Customers Section */}
        <Text style={styles.sectionTitle}>Top Customers</Text>

        {reportData?.topCustomers && reportData.topCustomers.length > 0 ? (
          <View style={styles.cardContainer}>
            {reportData.topCustomers.slice(0, 5).map((customer, index) => (
              <View key={customer.customer_id} style={styles.customerCard}>
                <View style={styles.customerRankContainer}>
                  <Text style={styles.customerRank}>{index + 1}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerArea}>{customer.area}</Text>
                  <View style={styles.customerStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statText}>
                        {formatCurrencyFn(customer.total_spent)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Feather name="shopping-bag" size={14} color="#6c757d" />
                      <Text style={styles.statText}>
                        {customer.order_count} orders
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="account-off"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No customer data available</Text>
          </View>
        )}

        {/* Credit Customers Section */}
        <Text style={styles.sectionTitle}>Credit Usage</Text>

        {reportData?.creditCustomers &&
        reportData.creditCustomers.length > 0 ? (
          <View style={styles.cardContainer}>
            {reportData.creditCustomers.slice(0, 5).map((customer) => (
              <View key={customer.customer_id} style={styles.creditCard}>
                <View style={styles.creditCardHeader}>
                  <Text style={styles.creditCustomerName}>{customer.name}</Text>
                  <Text
                    style={[
                      styles.creditPercentage,
                      {
                        color:
                          customer.credit_usage_percent > 80
                            ? "#F40F02"
                            : customer.credit_usage_percent > 50
                            ? "#FFA500"
                            : "#28A745",
                      },
                    ]}
                  >
                    {customer.credit_usage_percent}%
                  </Text>
                </View>

                <ProgressBar
                  progress={customer.credit_usage_percent / 100}
                  color={
                    customer.credit_usage_percent > 80
                      ? "#F40F02"
                      : customer.credit_usage_percent > 50
                      ? "#FFA500"
                      : "#28A745"
                  }
                  style={styles.progressBar}
                />

                <View style={styles.creditDetails}>
                  <Text style={styles.creditLabel}>
                    Balance:
                    <Text style={styles.creditValue}>
                      {" "}
                      {formatCurrencyFn(customer.credit_balance)}
                    </Text>
                  </Text>
                  <Text style={styles.creditLabel}>
                    Limit:
                    <Text style={styles.creditValue}>
                      {" "}
                      {formatCurrencyFn(customer.credit_limit)}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="credit-card-off"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No credit data available</Text>
          </View>
        )}

        {/* Sales by Area Section */}
        <Text style={styles.sectionTitle}>Sales by Area</Text>

        {reportData?.salesByArea && reportData.salesByArea.length > 0 ? (
          <View style={styles.areaContainer}>
            {reportData.salesByArea.map((areaData) => {
              const totalSalesAllAreas = reportData.salesByArea.reduce(
                (sum, current) => sum + current.total_sales,
                0
              );
              const percentage =
                totalSalesAllAreas > 0
                  ? Math.round(
                      (areaData.total_sales / totalSalesAllAreas) * 100
                    )
                  : 0;

              return (
                <View key={areaData.area} style={styles.areaCard}>
                  <View style={styles.areaHeader}>
                    <Text style={styles.areaName}>
                      {areaData.area || "Unknown Area"}
                    </Text>
                    <Text style={styles.areaPercentage}>{percentage}%</Text>
                  </View>

                  <View style={styles.areaProgressContainer}>
                    <View
                      style={[styles.areaProgress, { width: `${percentage}%` }]}
                    />
                  </View>

                  <View style={styles.areaDetails}>
                    <View style={styles.areaDetailItem}>
                      <Text style={styles.areaDetailText}>
                        {formatCurrencyFn(
                          parseFloat(areaData.total_sales.toString())
                        )}
                      </Text>
                    </View>
                    <View style={styles.areaDetailItem}>
                      <FontAwesome5 name="store" size={14} color="#6c757d" />
                      <Text style={styles.areaDetailText}>
                        {areaData.customer_count} customers
                      </Text>
                    </View>
                    <View style={styles.areaDetailItem}>
                      <Feather name="shopping-bag" size={14} color="#6c757d" />
                      <Text style={styles.areaDetailText}>
                        {areaData.order_count} orders
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={40} color="#ADB5BD" />
            <Text style={styles.emptyText}>No area data available</Text>
          </View>
        )}

        {/* Recommendations Section */}
        {insights && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Recommendations</Text>

            <View style={styles.recommendationCard}>
              {insights.highestCreditRisk &&
                insights.highestCreditRisk.credit_usage_percent > 70 && (
                  <View style={styles.recommendation}>
                    <View
                      style={[
                        styles.recommendationIcon,
                        { backgroundColor: "#F8D7DA" },
                      ]}
                    >
                      <MaterialIcons
                        name="priority-high"
                        size={20}
                        color="#DC3545"
                      />
                    </View>
                    <View style={styles.recommendationContent}>
                      <Text style={styles.recommendationTitle}>
                        Follow up on high credit balances
                      </Text>
                      <Text style={styles.recommendationText}>
                        <Text style={{ fontWeight: "bold" }}>
                          {insights.highestCreditRisk.name}
                        </Text>
                        {" has reached "}
                        {insights.highestCreditRisk.credit_usage_percent}
                        {"% of their credit limit."}
                      </Text>
                    </View>
                  </View>
                )}

              {insights.avgCreditUtilization > 60 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#FFF3CD" },
                    ]}
                  >
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={20}
                      color="#FFC107"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Review credit policies
                    </Text>
                    <Text style={styles.recommendationText}>
                      {"Average credit utilization is "}
                      {Math.round(insights.avgCreditUtilization)}
                      {"%, consider reviewing payment terms."}
                    </Text>
                  </View>
                </View>
              )}

              {insights.worstArea && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D1ECF1" },
                    ]}
                  >
                    <MaterialIcons
                      name="location-on"
                      size={20}
                      color="#17A2B8"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Focus on underperforming area
                    </Text>
                    <Text style={styles.recommendationText}>
                      {insights.worstArea.area}
                      {" is showing the lowest sales performance at "}
                      {formatCurrencyFn(
                        parseFloat(insights.worstArea.total_sales.toString())
                      )}
                      {"."}
                    </Text>
                  </View>
                </View>
              )}

              {insights.customerGrowthRate < 0 && (
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
                      Boost customer acquisition
                    </Text>
                    <Text style={styles.recommendationText}>
                      {"Customer growth rate is "}
                      {Math.round(insights.customerGrowthRate)}
                      {"%. Consider promotional campaigns."}
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
                  <MaterialIcons name="star" size={20} color="#28A745" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>
                    Reward top customers
                  </Text>
                  <Text style={styles.recommendationText}>
                    Implement a loyalty program for top 5 customers to increase
                    retention.
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
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
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
  customerRankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerRank: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 2,
  },
  customerArea: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
  },
  customerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 4,
  },
  creditCard: {
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
  creditCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  creditCustomerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  creditPercentage: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E9ECEF",
    marginBottom: 8,
  },
  creditDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  creditLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  creditValue: {
    fontWeight: "500",
    color: COLORS.dark,
  },
  areaContainer: {
    marginBottom: 16,
  },
  areaCard: {
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
  areaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  areaName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  areaPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  areaProgressContainer: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    marginBottom: 12,
  },
  areaProgress: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  areaDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  areaDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  areaDetailText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 4,
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
