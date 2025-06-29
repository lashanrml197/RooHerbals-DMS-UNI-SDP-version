// app/(reports)/generate-daily-report.tsx

import {
  AntDesign,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { getDailySalesReport } from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define types for daily sales report data
interface DailySalesReport {
  reportDate: string;
  summary: {
    report_date: string;
    total_orders: number;
    total_sales: number;
    total_discounts: number;
  };
  paymentBreakdown: PaymentBreakdown[];
  salesRepBreakdown: SalesRepBreakdown[];
  productBreakdown: ProductBreakdown[];
  orderDetails: OrderDetail[];
}

interface PaymentBreakdown {
  payment_type: string;
  order_count: number;
  amount: number;
}

interface SalesRepBreakdown {
  sales_rep: string;
  order_count: number;
  total_sales: number;
}

interface ProductBreakdown {
  product_name: string;
  quantity_sold: number;
  total_sales: number;
}

interface OrderDetail {
  order_id: string;
  customer_name: string;
  area: string;
  order_date: string;
  total_amount: number;
  discount_amount: number;
  payment_type: string;
  payment_status: string;
  status: string;
}

export default function GenerateDailyReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<DailySalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch daily sales report data
  const fetchDailyReport = async (date: Date = new Date()) => {
    try {
      setLoading(true);
      setError(null);

      // Format date for API
      const formattedDate = date.toISOString().split("T")[0];

      const data = await getDailySalesReport(formattedDate);
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to fetch daily sales report:", err);
      setError(err.message || "Failed to load daily sales report");
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the daily sales report. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate additional insights
  const calculateInsights = () => {
    if (!reportData) return null;

    // Calculate average order value
    const avgOrderValue =
      reportData.summary.total_orders > 0
        ? reportData.summary.total_sales / reportData.summary.total_orders
        : 0;

    // Calculate discount percentage of total sales
    const discountPercentage =
      reportData.summary.total_sales > 0
        ? (reportData.summary.total_discounts /
            (reportData.summary.total_sales +
              reportData.summary.total_discounts)) *
          100
        : 0;

    // Find top-performing sales rep
    const topSalesRep =
      reportData.salesRepBreakdown.length > 0
        ? reportData.salesRepBreakdown.reduce((prev, current) =>
            prev.total_sales > current.total_sales ? prev : current
          )
        : null;

    // Calculate payment type distribution
    const totalPaymentAmount = reportData.paymentBreakdown.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const paymentDistribution = reportData.paymentBreakdown.map((payment) => ({
      payment_type: payment.payment_type,
      percentage:
        totalPaymentAmount > 0
          ? (payment.amount / totalPaymentAmount) * 100
          : 0,
    }));

    // Get credit percentage
    const creditPercentage =
      paymentDistribution.find((p) => p.payment_type === "credit")
        ?.percentage || 0;

    // Calculate total product sales
    const totalProductSales = reportData.productBreakdown.reduce(
      (sum, product) => sum + product.total_sales,
      0
    );

    return {
      avgOrderValue,
      discountPercentage,
      topSalesRep,
      paymentDistribution,
      creditPercentage,
      totalProductSales,
    };
  };

  // Change date handler
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      setSelectedDate(selectedDate);
      fetchDailyReport(selectedDate);
    }
  };

  // Generate PDF report
  const generatePdfReport = async () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format date for header
    const formattedReportDate = new Date(
      reportData.reportDate
    ).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate payment type breakdown chart data
    let paymentChartData = "";
    let paymentChartLabels = "";

    reportData.paymentBreakdown.forEach((payment) => {
      paymentChartData += `${payment.amount},`;
      paymentChartLabels += `'${
        payment.payment_type.charAt(0).toUpperCase() +
        payment.payment_type.slice(1)
      }',`;
    });

    // Remove trailing commas
    paymentChartData = paymentChartData.slice(0, -1);
    paymentChartLabels = paymentChartLabels.slice(0, -1);

    // Generate sales rep breakdown
    let salesRepHtml = "";
    reportData.salesRepBreakdown.forEach((salesRep, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      salesRepHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${salesRep.sales_rep}</td>
          <td>${salesRep.order_count}</td>
          <td>Rs. ${salesRep.total_sales.toLocaleString()} (Sri Lankan Rupees)</td>
          <td>${
            salesRep.order_count > 0
              ? "Rs. " +
                Math.round(
                  salesRep.total_sales / salesRep.order_count
                ).toLocaleString() +
                " (Sri Lankan Rupees)"
              : "-"
          }</td>
        </tr>
      `;
    });

    // Generate product breakdown
    let productHtml = "";
    reportData.productBreakdown.slice(0, 10).forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      productHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${product.product_name}</td>
          <td>${product.quantity_sold}</td>
          <td>Rs. ${product.total_sales.toLocaleString()} (Sri Lankan Rupees)</td>
          <td>${
            product.quantity_sold > 0
              ? "Rs. " +
                Math.round(
                  product.total_sales / product.quantity_sold
                ).toLocaleString() +
                " (Sri Lankan Rupees)"
              : "-"
          }</td>
        </tr>
      `;
    });

    // Generate order details
    let orderHtml = "";
    reportData.orderDetails.forEach((order, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const orderDate = new Date(order.order_date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Determine payment status color
      let statusColor = "#6c757d";
      if (order.payment_status === "paid") {
        statusColor = "#28a745";
      } else if (order.payment_status === "pending") {
        statusColor = "#ffc107";
      } else if (order.payment_status === "partial") {
        statusColor = "#fd7e14";
      }

      orderHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${order.order_id}</td>
          <td>${order.customer_name}</td>
          <td>${order.area}</td>
          <td>${orderDate}</td>
          <td>Rs. ${order.total_amount.toLocaleString()} (Sri Lankan Rupees)</td>
          <td>Rs. ${order.discount_amount.toLocaleString()} (Sri Lankan Rupees)</td>
          <td>${
            order.payment_type.charAt(0).toUpperCase() +
            order.payment_type.slice(1)
          }</td>
          <td style="color: ${statusColor}; font-weight: bold;">${
        order.payment_status.charAt(0).toUpperCase() +
        order.payment_status.slice(1)
      }</td>
        </tr>
      `;
    });

    // Create HTML content for PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Sales Report - Roo Herbals</title>
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
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #7DA453;
            }
            .header h2 {
              margin: 5px 0 0;
              font-size: 18px;
              color: #346491;
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
            .section h3 {
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
            .insight-detail {
              font-size: 12px;
              color: #777;
              margin: 5px 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 14px;
              table-layout: fixed;
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
              word-wrap: break-word;
            }
            .chart-container {
              width: 100%;
              height: 250px;
              margin: 20px 0;
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 15px;
            }
            .pie-chart {
              width: 400px;
              height: 300px;
              margin: 0 auto;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #777;
            }
            .text-success {
              color: #28a745;
            }
            .text-warning {
              color: #ffc107;
            }
            .text-danger {
              color: #dc3545;
            }
            canvas {
              max-width: 100%;
            }
            .currency-note {
              font-size: 12px;
              color: #666;
              font-style: italic;
              margin-top: 5px;
            }
            
            /* Responsive Table Styles */
            @media print {
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <div class="header">
            <h1>Roo Herbals Pvt Ltd</h1>
            <h2>Daily Sales Report</h2>
            <p>Date: ${formattedReportDate}</p>
            <p class="currency-note">All monetary values are in Sri Lankan Rupees (Rs.)</p>
          </div>
          
          <div class="section">
            <h3>Sales Summary</h3>
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Total Sales</p>
                <p class="insight-value">Rs. ${reportData.summary.total_sales.toLocaleString()}</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Orders</p>
                <p class="insight-value">${reportData.summary.total_orders}</p>
                <p class="insight-detail">Avg. Rs. ${Math.round(
                  insights.avgOrderValue
                ).toLocaleString()} per order</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Discounts</p>
                <p class="insight-value">Rs. ${reportData.summary.total_discounts.toLocaleString()}</p>
                <p class="insight-detail">${Math.round(
                  insights.discountPercentage
                )}% of gross sales</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Credit Sales</p>
                <p class="insight-value">${Math.round(
                  insights.creditPercentage
                )}%</p>
                <p class="insight-detail">of total sales</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3>Payment Breakdown</h3>
            <div class="chart-container">
              <canvas id="paymentChart" class="pie-chart"></canvas>
            </div>
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                const ctx = document.getElementById('paymentChart').getContext('2d');
                new Chart(ctx, {
                  type: 'pie',
                  data: {
                    labels: [${paymentChartLabels}],
                    datasets: [{
                      label: 'Payment Types',
                      data: [${paymentChartData}],
                      backgroundColor: [
                        '#4ECDC4',
                        '#FF6B6B',
                        '#FFD166',
                        '#118AB2'
                      ],
                      borderColor: '#ffffff',
                      borderWidth: 2
                    }]
                  },
                  options: {
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right',
                      },
                      title: {
                        display: true,
                        text: 'Payment Distribution'
                      }
                    }
                  }
                });
              });
            </script>
            
            <table style="margin-top: 30px;">
              <thead>
                <tr>
                  <th style="width: 25%">Payment Type</th>
                  <th style="width: 25%">Orders</th>
                  <th style="width: 25%">Amount</th>
                  <th style="width: 25%">% of Total</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.paymentBreakdown
                  .map((payment, index) => {
                    const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
                    const totalPaymentAmount =
                      reportData.paymentBreakdown.reduce(
                        (sum, p) => sum + p.amount,
                        0
                      );
                    const percentage =
                      totalPaymentAmount > 0
                        ? Math.round(
                            (payment.amount / totalPaymentAmount) * 100
                          )
                        : 0;

                    return `
                    <tr style="background-color: ${bgColor}">
                      <td>${
                        payment.payment_type.charAt(0).toUpperCase() +
                        payment.payment_type.slice(1)
                      }</td>
                      <td>${payment.order_count}</td>
                      <td>Rs. ${payment.amount.toLocaleString()}</td>
                      <td>${percentage}%</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Sales Representative Performance</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%">Sales Representative</th>
                  <th style="width: 20%">Orders</th>
                  <th style="width: 25%">Total Sales</th>
                  <th style="width: 25%">Avg. Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${salesRepHtml}
              </tbody>
            </table>
            
            ${
              insights.topSalesRep
                ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f0f5ea; border-left: 4px solid #7DA453;">
                <p style="margin: 0; font-weight: bold;">Top Performer: ${
                  insights.topSalesRep.sales_rep
                }</p>
                <p style="margin: 5px 0 0;">Generated Rs. ${insights.topSalesRep.total_sales.toLocaleString()} from ${
                    insights.topSalesRep.order_count
                  } orders.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h3>Top Selling Products</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%">Product</th>
                  <th style="width: 20%">Quantity</th>
                  <th style="width: 20%">Sales</th>
                  <th style="width: 20%">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                ${productHtml}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Order Details</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 12%">Order ID</th>
                  <th style="width: 16%">Customer</th>
                  <th style="width: 15%">Area</th>
                  <th style="width: 10%">Time</th>
                  <th style="width: 12%">Amount</th>
                  <th style="width: 12%">Discount</th>
                  <th style="width: 12%">Payment Type</th>
                  <th style="width: 11%">Status</th>
                </tr>
              </thead>
              <tbody>
                ${orderHtml}
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Roo Herbals Pvt Ltd | This report is confidential and intended for internal use only.</p>
            <p>For questions about this report, please contact the system administrator.</p>
            <p>All monetary values are in Sri Lankan Rupees (Rs.)</p>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  // Generate Excel/CSV data
  const generateExcelData = () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format date for report
    const formattedReportDate = new Date(
      reportData.reportDate
    ).toLocaleDateString();

    // Create workbook with multiple sheets

    // Sheet 1: Summary
    let summarySheet = "Roo Herbals - Daily Sales Report\n";
    summarySheet += `Report Date: ${formattedReportDate}\n`;
    summarySheet += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    summarySheet += "All monetary values are in Sri Lankan Rupees (Rs.)\n\n";

    summarySheet += "DAILY SALES SUMMARY\n\n";
    summarySheet += `Total Sales,${reportData.summary.total_sales}\n`;
    summarySheet += `Total Orders,${reportData.summary.total_orders}\n`;
    summarySheet += `Total Discounts,${reportData.summary.total_discounts}\n`;
    summarySheet += `Average Order Value,${Math.round(
      insights.avgOrderValue
    )}\n`;
    summarySheet += `Discount Percentage,${Math.round(
      insights.discountPercentage
    )}%\n\n`;

    // Sheet 2: Payment Breakdown
    let paymentSheet = "PAYMENT BREAKDOWN\n\n";
    paymentSheet += "Payment Type,Orders,Amount,% of Total\n";

    const totalPayments = reportData.paymentBreakdown.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    reportData.paymentBreakdown.forEach((payment) => {
      const percentage =
        totalPayments > 0
          ? Math.round((payment.amount / totalPayments) * 100)
          : 0;

      paymentSheet += `${payment.payment_type},${payment.order_count},${payment.amount},${percentage}%\n`;
    });

    // Sheet 3: Sales Rep Performance
    let salesRepSheet = "SALES REPRESENTATIVE PERFORMANCE\n\n";
    salesRepSheet +=
      "Sales Representative,Orders,Total Sales,Avg. Order Value\n";

    reportData.salesRepBreakdown.forEach((rep) => {
      const avgOrderValue =
        rep.order_count > 0 ? Math.round(rep.total_sales / rep.order_count) : 0;

      salesRepSheet += `${rep.sales_rep},${rep.order_count},${rep.total_sales},${avgOrderValue}\n`;
    });

    // Sheet 4: Product Performance
    let productSheet = "PRODUCT PERFORMANCE\n\n";
    productSheet += "Product Name,Quantity,Total Sales,Unit Price\n";

    reportData.productBreakdown.forEach((product) => {
      const unitPrice =
        product.quantity_sold > 0
          ? Math.round(product.total_sales / product.quantity_sold)
          : 0;

      productSheet += `${product.product_name.replace(/,/g, " ")},${
        product.quantity_sold
      },${product.total_sales},${unitPrice}\n`;
    });

    // Sheet 5: Order Details
    let orderSheet = "ORDER DETAILS\n\n";
    orderSheet +=
      "Order ID,Customer,Area,Time,Amount,Discount,Payment Type,Status\n";

    reportData.orderDetails.forEach((order) => {
      const orderTime = new Date(order.order_date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      orderSheet += `${order.order_id},${order.customer_name.replace(
        /,/g,
        " "
      )},${order.area},${orderTime},${order.total_amount},${
        order.discount_amount
      },${order.payment_type},${order.payment_status}\n`;
    });

    return {
      summarySheet,
      paymentSheet,
      salesRepSheet,
      productSheet,
      orderSheet,
    };
  };

  // Export report
  const handleExport = async (format: string) => {
    try {
      setExporting(true);

      if (format === "excel") {
        // Generate Excel/CSV report
        const excelData = generateExcelData();
        if (!excelData) {
          throw new Error("Failed to generate report data");
        }

        // Create a multi-sheet CSV file
        let csvContent = excelData.summarySheet + "\n\n";
        csvContent += excelData.paymentSheet + "\n\n";
        csvContent += excelData.salesRepSheet + "\n\n";
        csvContent += excelData.productSheet + "\n\n";
        csvContent += excelData.orderSheet;

        const filename = `roo_herbals_daily_sales_${
          reportData?.reportDate || new Date().toISOString().split("T")[0]
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

  // Format currency
  const formatCurrencyFn = (amount: number): string => {
    return `Rs. ${amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Get icon for payment type
  const getPaymentIcon = (paymentType: string) => {
    switch (paymentType.toLowerCase()) {
      case "cash":
        return (
          <FontAwesome5 name="money-bill-wave" size={20} color="#28A745" />
        );
      case "credit":
        return <AntDesign name="creditcard" size={20} color="#DC3545" />;
      case "cheque":
        return <FontAwesome5 name="money-check" size={20} color="#FFC107" />;
      case "bank":
        return <FontAwesome5 name="university" size={20} color="#17A2B8" />;
      default:
        return <MaterialIcons name="payment" size={20} color="#6C757D" />;
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDailyReport();
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
          <Text style={styles.headerTitle}>Daily Sales Report</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Generating daily sales report...
          </Text>
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
        <Text style={styles.headerTitle}>Daily Sales Report</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchDailyReport(selectedDate)}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Currency Note */}
      <View style={styles.currencyNote}>
        <MaterialIcons name="info-outline" size={16} color="#6C757D" />
        <Text style={styles.currencyNoteText}>
          All values are in Sri Lankan Rupees (Rs.)
        </Text>
      </View>

      {/* Date Selection */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Report Date:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <MaterialIcons
            name="calendar-today"
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>

      {/* Export Actions */}
      <View style={styles.exportContainer}>
        <Text style={styles.exportLabel}>Export Report:</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport("excel")}
            disabled={exporting || !reportData}
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
            disabled={exporting || !reportData}
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
          <Text style={styles.exportingText}>Preparing report...</Text>
        </View>
      )}

      {!reportData || !reportData.summary.total_orders ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={60}
            color="#ADB5BD"
          />
          <Text style={styles.emptyTitle}>No Sales Data</Text>
          <Text style={styles.emptyText}>
            There are no sales recorded for the selected date.
          </Text>
          <TouchableOpacity
            style={styles.changeDateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.changeDateButtonText}>Change Date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Sales Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <MaterialCommunityIcons
                  name="cash-register"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyFn(reportData.summary.total_sales)}
                </Text>
                <Text style={styles.summaryNoteText}>Sri Lankan Rupees</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIconContainer,
                  { backgroundColor: "#FF7675" },
                ]}
              >
                <Feather name="shopping-bag" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Orders</Text>
                <Text style={styles.summaryValue}>
                  {reportData.summary.total_orders}
                </Text>
                {insights && (
                  <Text style={styles.summarySubtext}>
                    Avg: {formatCurrencyFn(Math.round(insights.avgOrderValue))}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIconContainer,
                  { backgroundColor: "#FDCB6E" },
                ]}
              >
                <MaterialCommunityIcons name="sale" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Discounts</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyFn(reportData.summary.total_discounts)}
                </Text>
                {insights && (
                  <Text style={styles.summarySubtext}>
                    {Math.round(insights.discountPercentage)}% of gross
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Payment Breakdown */}
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>

          <View style={styles.paymentContainer}>
            {reportData.paymentBreakdown.map((payment) => {
              const totalPayments = reportData.paymentBreakdown.reduce(
                (sum, p) => sum + p.amount,
                0
              );

              // Calculate percentage with proper handling for small values
              const percentage =
                totalPayments > 0 ? (payment.amount / totalPayments) * 100 : 0;

              // Format percentage for display - show decimal places for small percentages
              const displayPercentage =
                percentage < 1 && percentage > 0
                  ? percentage.toFixed(1)
                  : Math.round(percentage);

              // Choose color based on payment type
              const getPaymentColor = (type: string) => {
                switch (type) {
                  case "cash":
                    return "#28A745";
                  case "credit":
                    return "#DC3545";
                  case "cheque":
                    return "#FFC107";
                  case "bank":
                    return "#17A2B8";
                  default:
                    return "#6C757D";
                }
              };

              return (
                <View key={payment.payment_type} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentIconContainer}>
                      {getPaymentIcon(payment.payment_type)}
                      <Text style={styles.paymentType}>
                        {payment.payment_type.charAt(0).toUpperCase() +
                          payment.payment_type.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.paymentAmountContainer}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrencyFn(payment.amount)}
                      </Text>
                      <Text style={styles.paymentPercentage}>
                        {typeof displayPercentage === "number"
                          ? displayPercentage === 0 && payment.amount > 0
                            ? "< 1%" // Show "< 1%" if percentage rounds to 0 but there are sales
                            : `${displayPercentage}%`
                          : `${displayPercentage}%`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentMetrics}>
                    <View style={styles.paymentMetric}>
                      <View style={styles.metricIcon}>
                        <Feather
                          name="shopping-bag"
                          size={16}
                          color="#6C757D"
                        />
                      </View>
                      <Text style={styles.metricText}>
                        {payment.order_count}{" "}
                        {payment.order_count === 1 ? "order" : "orders"}
                      </Text>
                    </View>

                    <View style={styles.paymentMetric}>
                      <View style={styles.metricIcon}>
                        <FontAwesome5
                          name="chart-pie"
                          size={14}
                          color="#6C757D"
                        />
                      </View>
                      <Text style={styles.metricText}>
                        {Math.round(percentage)}% of sales
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentBar}>
                    <View
                      style={[
                        styles.paymentBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getPaymentColor(
                            payment.payment_type
                          ),
                          borderTopRightRadius: percentage < 100 ? 3 : 0,
                          borderBottomRightRadius: percentage < 100 ? 3 : 0,
                        },
                      ]}
                    >
                      {percentage >= 15 && (
                        <Text style={styles.paymentBarText}>
                          {typeof displayPercentage === "number"
                            ? displayPercentage === 0 && payment.amount > 0
                              ? "< 1%"
                              : `${displayPercentage}%`
                            : `${displayPercentage}%`}
                        </Text>
                      )}
                    </View>
                    {percentage < 15 && (
                      <Text
                        style={[
                          styles.paymentBarTextOutside,
                          { color: getPaymentColor(payment.payment_type) },
                        ]}
                      >
                        {typeof displayPercentage === "number"
                          ? displayPercentage === 0 && payment.amount > 0
                            ? "< 1%"
                            : `${displayPercentage}%`
                          : `${displayPercentage}%`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Sales Rep Performance */}
          <Text style={styles.sectionTitle}>Sales Rep Performance</Text>

          {reportData.salesRepBreakdown.length > 0 ? (
            <View style={styles.salesRepContainer}>
              {reportData.salesRepBreakdown.map((rep, index) => {
                const totalSales = reportData.salesRepBreakdown.reduce(
                  (sum, r) => sum + r.total_sales,
                  0
                );

                // Calculate percentage with proper handling for small values
                const percentage =
                  totalSales > 0 ? (rep.total_sales / totalSales) * 100 : 0;

                // Format percentage for display - show decimal places for small percentages
                const displayPercentage =
                  percentage < 1 && percentage > 0
                    ? percentage.toFixed(1)
                    : Math.round(percentage);

                const isTopPerformer =
                  insights?.topSalesRep?.sales_rep === rep.sales_rep;

                // This section is only for sales rep data, not product data
                // No product percentage calculation needed here
                const totalSalesReps = reportData.salesRepBreakdown.reduce(
                  (sum, r) => sum + r.total_sales,
                  0
                );

                // Calculate rep percentage of total sales
                const repPercentage =
                  totalSalesReps > 0
                    ? Math.round((rep.total_sales / totalSalesReps) * 100)
                    : 0;

                // Format percentage for display
                const displayRepPercentage =
                  repPercentage < 1 && rep.total_sales > 0
                    ? "< 1%"
                    : `${repPercentage}%`;

                return (
                  <View
                    key={index}
                    style={[
                      styles.salesRepCard,
                      isTopPerformer && styles.topPerformerCard,
                    ]}
                  >
                    <View style={styles.salesRepHeader}>
                      <View style={styles.salesRepNameContainer}>
                        {isTopPerformer ? (
                          <View style={styles.topPerformerBadge}>
                            <MaterialIcons
                              name="star"
                              size={16}
                              color="#FFFFFF"
                            />
                          </View>
                        ) : (
                          <View style={styles.regularPerformerIcon}>
                            <Ionicons name="person" size={16} color="#6C757D" />
                          </View>
                        )}
                        <Text style={styles.salesRepName}>{rep.sales_rep}</Text>
                      </View>
                      <View style={styles.salesRepAmountContainer}>
                        <Text style={styles.salesRepAmount}>
                          {formatCurrencyFn(rep.total_sales)}
                        </Text>
                        <Text style={styles.salesRepPercentage}>
                          {typeof displayPercentage === "number"
                            ? displayPercentage === 0 && rep.total_sales > 0
                              ? "< 1%"
                              : `${displayPercentage}%`
                            : `${displayPercentage}%`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.salesRepMetrics}>
                      <View style={styles.salesRepMetric}>
                        <Feather
                          name="shopping-bag"
                          size={16}
                          color="#6C757D"
                        />
                        <Text style={styles.salesRepMetricText}>
                          {rep.order_count}{" "}
                          {rep.order_count === 1 ? "order" : "orders"}
                        </Text>
                      </View>

                      <View style={styles.salesRepMetric}>
                        <MaterialIcons
                          name="attach-money"
                          size={16}
                          color="#6C757D"
                        />
                        <Text style={styles.salesRepMetricText}>
                          Avg:{" "}
                          {formatCurrencyFn(
                            Math.round(
                              rep.total_sales / Math.max(rep.order_count, 1)
                            )
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.salesRepStats}>
                      <View style={styles.statItem}>
                        <View
                          style={[
                            styles.statCircle,
                            {
                              backgroundColor: isTopPerformer
                                ? "#28A745"
                                : "#6C757D",
                            },
                          ]}
                        >
                          <Text style={styles.statCircleText}>
                            {rep.order_count}
                          </Text>
                        </View>
                        <Text style={styles.statLabel}>Orders</Text>
                      </View>

                      <View style={styles.statItem}>
                        <View
                          style={[
                            styles.statCircle,
                            {
                              backgroundColor: isTopPerformer
                                ? "#007BFF"
                                : "#ADB5BD",
                            },
                          ]}
                        >
                          <Text style={styles.statCircleText}>
                            {typeof displayPercentage === "number"
                              ? displayPercentage === 0 && rep.total_sales > 0
                                ? "<1%"
                                : displayPercentage < 10
                                ? `${displayPercentage}%`
                                : `${displayPercentage}%`
                              : `${displayPercentage}%`}
                          </Text>
                        </View>
                        <Text style={styles.statLabel}>Share</Text>
                      </View>

                      <View style={styles.statItem}>
                        <View
                          style={[
                            styles.statCircle,
                            {
                              backgroundColor: isTopPerformer
                                ? "#17A2B8"
                                : "#6C757D",
                            },
                          ]}
                        >
                          <Text style={styles.statCircleText}>
                            {Math.round(
                              rep.total_sales /
                                Math.max(rep.order_count, 1) /
                                1000
                            )}
                            K
                          </Text>
                        </View>
                        <Text style={styles.statLabel}>Avg</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                No sales representative data available
              </Text>
            </View>
          )}

          {/* Top Products */}
          <Text style={styles.sectionTitle}>Top Products</Text>

          {reportData.productBreakdown.length > 0 ? (
            <View style={styles.productContainer}>
              {reportData.productBreakdown.slice(0, 5).map((product, index) => {
                return (
                  <View key={index} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <View style={styles.productNameContainer}>
                        <View style={styles.regularProductIcon}>
                          <MaterialIcons
                            name="inventory"
                            size={16}
                            color="#6C757D"
                          />
                        </View>
                        <Text style={styles.productName}>
                          {product.product_name}
                        </Text>
                      </View>
                      <View style={styles.productQuantityContainer}>
                        <MaterialCommunityIcons
                          name="package-variant"
                          size={16}
                          color="#6C757D"
                        />
                        <Text style={styles.productQuantity}>
                          {product.quantity_sold} units
                        </Text>
                      </View>
                    </View>

                    <View style={styles.productMetrics}>
                      <View style={styles.productMetric}>
                        <Text style={styles.productMetricLabel}>Total:</Text>
                        <Text style={styles.productMetricValue}>
                          {formatCurrencyFn(product.total_sales)}
                        </Text>
                      </View>

                      <View style={styles.productMetric}>
                        <Text style={styles.productMetricLabel}>Unit:</Text>
                        <Text style={styles.productMetricValue}>
                          {formatCurrencyFn(
                            Math.round(
                              product.total_sales /
                                Math.max(product.quantity_sold, 1)
                            )
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.productInfoBoxes}>
                      <View
                        style={[
                          styles.productInfoBox,
                          {
                            backgroundColor: "#f8f9fa",
                          },
                        ]}
                      >
                        <Text style={styles.productInfoBoxValue}>
                          {product.quantity_sold}
                        </Text>
                        <Text style={styles.productInfoBoxLabel}>
                          Units Sold
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.productInfoBox,
                          {
                            backgroundColor: "#f8f9fa",
                          },
                        ]}
                      >
                        <Text style={styles.productInfoBoxValue}>
                          {formatCurrencyFn(product.total_sales)}
                        </Text>
                        <Text style={styles.productInfoBoxLabel}>
                          Total Sales
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.productInfoBox,
                          {
                            backgroundColor: "#f8f9fa",
                          },
                        ]}
                      >
                        <Text style={styles.productInfoBoxValue}>
                          {formatCurrencyFn(
                            Math.round(
                              product.total_sales /
                                Math.max(product.quantity_sold, 1)
                            )
                          )}
                        </Text>
                        <Text style={styles.productInfoBoxLabel}>
                          Unit Price
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                No product data available
              </Text>
            </View>
          )}

          {/* Order Details */}
          <View style={styles.orderDetailsHeader}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <Text style={styles.orderCount}>
              {reportData.orderDetails.length}{" "}
              {reportData.orderDetails.length === 1 ? "order" : "orders"}
            </Text>
          </View>

          {reportData.orderDetails.length > 0 ? (
            <View style={styles.orderContainer}>
              {reportData.orderDetails.map((order, index) => {
                // Format the time
                const orderTime = new Date(order.order_date).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );

                // Determine payment status color and icon
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "paid":
                      return "#28A745";
                    case "pending":
                      return "#FFC107";
                    case "partial":
                      return "#FD7E14";
                    default:
                      return "#6C757D";
                  }
                };

                const getStatusIcon = (status: string) => {
                  switch (status) {
                    case "paid":
                      return (
                        <AntDesign
                          name="checkcircle"
                          size={16}
                          color="#28A745"
                        />
                      );
                    case "pending":
                      return (
                        <AntDesign
                          name="clockcircle"
                          size={16}
                          color="#FFC107"
                        />
                      );
                    case "partial":
                      return (
                        <MaterialIcons
                          name="timelapse"
                          size={16}
                          color="#FD7E14"
                        />
                      );
                    default:
                      return (
                        <AntDesign
                          name="questioncircle"
                          size={16}
                          color="#6C757D"
                        />
                      );
                  }
                };

                // Get payment type icon
                const getPaymentTypeIcon = (type: string) => {
                  switch (type) {
                    case "cash":
                      return (
                        <FontAwesome5
                          name="money-bill-wave"
                          size={16}
                          color="#28A745"
                        />
                      );
                    case "credit":
                      return (
                        <AntDesign
                          name="creditcard"
                          size={16}
                          color="#DC3545"
                        />
                      );
                    case "cheque":
                      return (
                        <FontAwesome5
                          name="money-check"
                          size={16}
                          color="#FFC107"
                        />
                      );
                    default:
                      return (
                        <MaterialIcons
                          name="payment"
                          size={16}
                          color="#6C757D"
                        />
                      );
                  }
                };

                return (
                  <View key={order.order_id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderIdContainer}>
                        <View style={styles.orderIdBadge}>
                          <Text style={styles.orderIdText}>
                            {order.order_id}
                          </Text>
                        </View>
                        <View style={styles.orderTimeContainer}>
                          <AntDesign
                            name="clockcircleo"
                            size={14}
                            color="#6C757D"
                          />
                          <Text style={styles.orderTime}>{orderTime}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.orderStatusBadge,
                          {
                            backgroundColor:
                              getStatusColor(order.payment_status) + "20",
                          },
                        ]}
                      >
                        {getStatusIcon(order.payment_status)}
                        <Text
                          style={[
                            styles.orderStatus,
                            { color: getStatusColor(order.payment_status) },
                          ]}
                        >
                          {order.payment_status.charAt(0).toUpperCase() +
                            order.payment_status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderDetails}>
                      <View style={styles.orderDetailItem}>
                        <View style={styles.orderDetailIcon}>
                          <MaterialIcons
                            name="store"
                            size={16}
                            color="#6C757D"
                          />
                        </View>
                        <Text style={styles.orderDetailText}>
                          {order.customer_name}
                        </Text>
                      </View>
                      <View style={styles.orderDetailItem}>
                        <View style={styles.orderDetailIcon}>
                          <MaterialIcons
                            name="location-on"
                            size={16}
                            color="#6C757D"
                          />
                        </View>
                        <Text style={styles.orderDetailText}>{order.area}</Text>
                      </View>
                    </View>

                    <View style={styles.orderFinancialsContainer}>
                      <View style={styles.orderFinancialBoxes}>
                        <View style={styles.orderFinancialBox}>
                          <Text style={styles.orderFinancialBoxLabel}>
                            Total
                          </Text>
                          <Text style={styles.orderFinancialBoxValue}>
                            {formatCurrencyFn(order.total_amount)}
                          </Text>
                        </View>

                        <View style={styles.orderFinancialBox}>
                          <Text style={styles.orderFinancialBoxLabel}>
                            Discount
                          </Text>
                          <Text style={styles.orderFinancialBoxValue}>
                            {formatCurrencyFn(order.discount_amount)}
                          </Text>
                        </View>

                        <View style={styles.orderFinancialBox}>
                          <Text style={styles.orderFinancialBoxLabel}>
                            Type
                          </Text>
                          <View style={styles.paymentTypeContainer}>
                            {getPaymentTypeIcon(order.payment_type)}
                            <Text style={styles.orderFinancialBoxValue}>
                              {order.payment_type.charAt(0).toUpperCase() +
                                order.payment_type.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                No order details available
              </Text>
            </View>
          )}

          {/* Spacer for bottom navigation */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
  currencyNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#FFF9DB",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8A1",
  },
  currencyNoteText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6C757D",
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  dateLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  dateButtonText: {
    fontSize: 14,
    color: COLORS.dark,
    marginRight: 8,
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90, // Extra padding for bottom navigation
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
  },
  changeDateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  changeDateButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "column",
    marginBottom: 24,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  summarySubtext: {
    fontSize: 12,
    color: "#ADB5BD",
    marginTop: 2,
  },
  summaryNoteText: {
    fontSize: 10,
    color: "#6C757D",
    marginTop: 2,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 8,
    marginBottom: 12,
  },
  paymentContainer: {
    marginBottom: 24,
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentIconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentType: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginLeft: 8,
  },
  paymentAmountContainer: {
    alignItems: "flex-end",
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  paymentPercentage: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 2,
  },
  paymentBar: {
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
    marginTop: 8,
    position: "relative",
  },
  paymentBarFill: {
    height: 6,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  paymentBarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    position: "absolute",
    right: 4,
  },
  paymentBarTextOutside: {
    fontSize: 10,
    fontWeight: "bold",
    position: "absolute",
    left: 8,
    top: -3,
  },
  paymentMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  paymentMetric: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  metricText: {
    fontSize: 12,
    color: "#6C757D",
  },
  salesRepContainer: {
    marginBottom: 24,
  },
  salesRepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topPerformerCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#28A745",
  },
  salesRepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  salesRepNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  topPerformerBadge: {
    backgroundColor: "#28A745",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  regularPerformerIcon: {
    backgroundColor: "#F8F9FA",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  salesRepAmountContainer: {
    alignItems: "flex-end",
  },
  salesRepAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  salesRepPercentage: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 2,
  },
  salesRepMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  salesRepMetric: {
    flexDirection: "row",
    alignItems: "center",
  },
  salesRepMetricText: {
    fontSize: 12,
    color: "#6C757D",
    marginLeft: 4,
  },
  salesRepStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statCircleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 10,
    color: "#6C757D",
  },
  productContainer: {
    marginBottom: 24,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topProductCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#17A2B8",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  topProductBadge: {
    backgroundColor: "#17A2B8",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  regularProductIcon: {
    backgroundColor: "#F8F9FA",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    flex: 1,
  },
  productQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  productQuantity: {
    fontSize: 12,
    color: "#6C757D",
    marginLeft: 4,
  },
  productMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productMetric: {
    alignItems: "flex-start",
  },
  productMetricLabel: {
    fontSize: 10,
    color: "#6C757D",
    marginBottom: 2,
  },
  productMetricValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  productInfoBoxes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productInfoBox: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    marginHorizontal: 2,
  },
  productInfoBoxValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 2,
  },
  productInfoBoxLabel: {
    fontSize: 10,
    color: "#6C757D",
  },
  orderDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  orderContainer: {
    marginBottom: 24,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIdBadge: {
    backgroundColor: "#E9ECEF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
  },
  orderTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  orderTime: {
    fontSize: 12,
    color: "#6C757D",
    marginLeft: 4,
  },
  orderStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  orderDetailIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  orderDetailText: {
    fontSize: 14,
    color: "#495057",
  },
  orderFinancialsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    paddingTop: 12,
  },
  orderFinancialBoxes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderFinancialBox: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  orderFinancialBoxLabel: {
    fontSize: 10,
    color: "#6C757D",
    marginBottom: 2,
  },
  orderFinancialBoxValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  paymentTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emptySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptySectionText: {
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
