import {
  AntDesign,
  Feather,
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getSalesReports,
} from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define types for sales reports data
interface SalesReport {
  salesByDate: SalesByDate[];
  salesByProduct: SalesByProduct[];
  salesByRep: SalesByRep[];
  salesByPaymentType: SalesByPaymentType[];
}

interface SalesByDate {
  date: string;
  total_sales: number;
  order_count: number;
}

interface SalesByProduct {
  product_id: string;
  name: string;
  total_quantity: number;
  total_sales: number;
}

interface SalesByRep {
  user_id: string;
  full_name: string;
  order_count: number;
  total_sales: number;
}

interface SalesByPaymentType {
  payment_type: string;
  order_count: number;
  total_sales: number;
}

interface FilterOptions {
  startDate: string;
  endDate: string;
  salesRepId: string | null;
  productId: string | null;
  area: string | null;
}

export default function SalesReports() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize filter options with current month
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
    salesRepId: null,
    productId: null,
    area: null,
  });

  // Format currency with improved handling of different data types
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

    // Round and format with no decimals - use "Rs." for Sri Lankan Rupee
    return `Rs. ${Math.round(numericAmount).toLocaleString("en-US")}`;
  };

  // Format date
  const formatDateFn = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate sales insights with improved type handling
  const calculateInsights = () => {
    if (!reportData) return null;

    // Calculate total sales - ensure numeric conversion
    const totalSales = reportData.salesByDate.reduce(
      (sum, day) => sum + (parseFloat(day.total_sales as any) || 0),
      0
    );

    // Calculate total orders - ensure numeric conversion
    const totalOrders = reportData.salesByDate.reduce(
      (sum, day) => sum + (parseInt(day.order_count as any) || 0),
      0
    );

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calculate daily averages
    const daysCount = reportData.salesByDate.length;
    const avgDailySales = daysCount > 0 ? totalSales / daysCount : 0;
    const avgDailyOrders = daysCount > 0 ? totalOrders / daysCount : 0;

    // Identify best selling product
    const bestSellingProduct =
      reportData.salesByProduct.length > 0
        ? reportData.salesByProduct[0]
        : null;

    // Identify best performing sales rep
    const bestPerformingSalesRep =
      reportData.salesByRep.length > 0 ? reportData.salesByRep[0] : null;

    // Get cash vs credit breakdown
    const cashSales = reportData.salesByPaymentType.find(
      (p) => p.payment_type === "cash"
    );
    const creditSales = reportData.salesByPaymentType.find(
      (p) => p.payment_type === "credit"
    );
    const chequeSales = reportData.salesByPaymentType.find(
      (p) => p.payment_type === "cheque"
    );

    // Calculate percentages
    const cashPercentage =
      totalSales > 0 && cashSales
        ? (parseFloat(cashSales.total_sales as any) / totalSales) * 100
        : 0;
    const creditPercentage =
      totalSales > 0 && creditSales
        ? (parseFloat(creditSales.total_sales as any) / totalSales) * 100
        : 0;
    const chequePercentage =
      totalSales > 0 && chequeSales
        ? (parseFloat(chequeSales.total_sales as any) / totalSales) * 100
        : 0;

    // Calculate sales trends
    let salesTrend = 0;
    if (reportData.salesByDate.length >= 2) {
      // Sort dates to ensure oldest first
      const sortedDates = [...reportData.salesByDate].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Split into two halves
      const halfLength = Math.floor(sortedDates.length / 2);
      const firstHalf = sortedDates.slice(0, halfLength);
      const secondHalf = sortedDates.slice(halfLength);

      // Calculate the average sales for each half
      const firstHalfAvg =
        firstHalf.reduce(
          (sum, day) => sum + (parseFloat(day.total_sales as any) || 0),
          0
        ) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce(
          (sum, day) => sum + (parseFloat(day.total_sales as any) || 0),
          0
        ) / secondHalf.length;

      // Calculate the percentage trend
      if (firstHalfAvg > 0) {
        salesTrend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      } else if (secondHalfAvg > 0) {
        salesTrend = 100; // If first half had zero sales but second half had sales
      }
    }

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      avgDailySales,
      avgDailyOrders,
      bestSellingProduct,
      bestPerformingSalesRep,
      salesTrend,
      cashSales,
      creditSales,
      chequeSales,
      cashPercentage,
      creditPercentage,
      chequePercentage,
      dateRange: {
        startDate:
          reportData.salesByDate.length > 0
            ? reportData.salesByDate[0].date
            : filterOptions.startDate,
        endDate:
          reportData.salesByDate.length > 0
            ? reportData.salesByDate[reportData.salesByDate.length - 1].date
            : filterOptions.endDate,
      },
    };
  };

  // Fetch sales reports data
  const fetchSalesReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getSalesReports(filterOptions);
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to fetch sales reports:", err);
      setError(err.message || "Failed to load sales report data");
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the sales report data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle filter visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Apply filters
  const applyFilters = () => {
    fetchSalesReports();
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterOptions({
      startDate: getFirstDayOfMonth(),
      endDate: getLastDayOfMonth(),
      salesRepId: null,
      productId: null,
      area: null,
    });
    setShowFilters(false);
    fetchSalesReports();
  };

  // Generate comprehensive PDF report
  const generatePdfReport = async () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format date for report title
    const today = new Date();
    const formattedDate = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;

    // Generate sales by date table
    let salesByDateHtml = "";
    const sortedSalesByDate = [...reportData.salesByDate].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedSalesByDate.forEach((dayData, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      salesByDateHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${formatDateFn(dayData.date)}</td>
          <td>${dayData.order_count}</td>
          <td>Rs. ${dayData.total_sales.toLocaleString()}</td>
          <td>Rs. ${Math.round(
            dayData.total_sales / Math.max(dayData.order_count, 1)
          ).toLocaleString()}</td>
        </tr>
      `;
    });

    // Generate sales by product table
    let salesByProductHtml = "";
    reportData.salesByProduct.forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      salesByProductHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${product.name}</td>
          <td>${product.total_quantity}</td>
          <td>Rs. ${product.total_sales.toLocaleString()}</td>
          <td>Rs. ${Math.round(
            product.total_sales / Math.max(product.total_quantity, 1)
          ).toLocaleString()}</td>
        </tr>
      `;
    });

    // Generate sales by rep table
    let salesByRepHtml = "";
    reportData.salesByRep.forEach((rep, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      salesByRepHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${rep.full_name}</td>
          <td>${rep.order_count}</td>
          <td>Rs. ${rep.total_sales.toLocaleString()}</td>
          <td>Rs. ${Math.round(
            rep.total_sales / Math.max(rep.order_count, 1)
          ).toLocaleString()}</td>
        </tr>
      `;
    });

    // Generate payment type table
    let paymentTypeHtml = "";
    reportData.salesByPaymentType.forEach((payment, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const paymentTypeFormatted =
        payment.payment_type.charAt(0).toUpperCase() +
        payment.payment_type.slice(1);
      const percentage =
        insights.totalSales > 0
          ? Math.round((payment.total_sales / insights.totalSales) * 100)
          : 0;

      paymentTypeHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${paymentTypeFormatted}</td>
          <td>${payment.order_count}</td>
          <td>Rs. ${payment.total_sales.toLocaleString()}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });

    // Generate daily sales chart data
    let salesDates = "";
    let salesValues = "";
    let ordersValues = "";

    const chartData = [...reportData.salesByDate].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    chartData.forEach((day) => {
      salesDates += `'${formatDateFn(day.date)}',`;
      salesValues += `${day.total_sales},`;
      ordersValues += `${day.order_count},`;
    });

    // Remove trailing commas
    salesDates = salesDates.slice(0, -1);
    salesValues = salesValues.slice(0, -1);
    ordersValues = ordersValues.slice(0, -1);

    // Create the HTML template for the PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sales Performance Report - Roo Herbals</title>
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
            .payment-distribution {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
            }
            .payment-card {
              flex: 1;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 8px;
              margin-right: 10px;
              text-align: center;
            }
            .payment-card:last-child {
              margin-right: 0;
            }
            .payment-card h3 {
              margin-top: 0;
              color: #346491;
            }
            .cash {
              border-top: 4px solid #28a745;
            }
            .credit {
              border-top: 4px solid #dc3545;
            }
            .cheque {
              border-top: 4px solid #fd7e14;
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
          <div class="header">
            <h1>Roo Herbals Pvt Ltd</h1>
            <h2>Sales Performance Report</h2>
            <p>Period: ${formatDateFn(
              insights.dateRange.startDate
            )} to ${formatDateFn(insights.dateRange.endDate)}</p>
            <p>Generated on: ${formattedDate}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <p>This report provides an analysis of sales performance during the selected period. Use these insights to identify trends, optimize product offerings, and improve sales strategies.</p>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Total Sales</p>
                <p class="insight-value">Rs. ${insights.totalSales.toLocaleString()}</p>
                <p class="insight-trend ${
                  insights.salesTrend >= 0 ? "trend-up" : "trend-down"
                }">
                  ${insights.salesTrend >= 0 ? "↑" : "↓"} ${Math.abs(
      Math.round(insights.salesTrend)
    )}% trend
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Total Orders</p>
                <p class="insight-value">${insights.totalOrders}</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Avg. Order Value</p>
                <p class="insight-value">Rs. ${Math.round(
                  insights.avgOrderValue
                ).toLocaleString()}</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Avg. Daily Sales</p>
                <p class="insight-value">Rs. ${Math.round(
                  insights.avgDailySales
                ).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Sales Trends</h2>
            <p>Analysis of payment preferences helps optimize financial planning and cash flow management.</p>
            
            <h3>Payment Distribution</h3>
            <div class="payment-distribution">
              <div class="payment-card cash">
                <h3>Cash</h3>
                <p>Rs. ${
                  insights.cashSales
                    ? insights.cashSales.total_sales.toLocaleString()
                    : "0"
                }</p>
                <p>${Math.round(insights.cashPercentage)}% of sales</p>
              </div>
              
              <div class="payment-card credit">
                <h3>Credit</h3>
                <p>Rs. ${
                  insights.creditSales
                    ? insights.creditSales.total_sales.toLocaleString()
                    : "0"
                }</p>
                <p>${Math.round(insights.creditPercentage)}% of sales</p>
              </div>
              
              <div class="payment-card cheque">
                <h3>Cheque</h3>
                <p>Rs. ${
                  insights.chequeSales
                    ? insights.chequeSales.total_sales.toLocaleString()
                    : "0"
                }</p>
                <p>${Math.round(insights.chequePercentage)}% of sales</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Top Performing Products</h2>
            <p>Analysis of product sales helps identify best sellers and opportunities for growth.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Total Sales</th>
                  <th>Avg. Unit Price</th>
                </tr>
              </thead>
              <tbody>
                ${salesByProductHtml}
              </tbody>
            </table>
            
            ${
              insights.bestSellingProduct
                ? `
              <div class="recommendations">
                <h3>Product Insights</h3>
                <p><strong>${
                  insights.bestSellingProduct.name
                }</strong> is your top selling product with ${
                    insights.bestSellingProduct.total_quantity
                  } units sold, generating Rs. ${insights.bestSellingProduct.total_sales.toLocaleString()} in revenue.</p>
                <p>Ensure adequate inventory levels for this high-demand product to prevent stockouts.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Sales Representative Performance</h2>
            <p>Evaluating individual sales rep performance helps identify strengths and areas for coaching.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Sales Representative</th>
                  <th>Orders</th>
                  <th>Total Sales</th>
                  <th>Avg. Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${salesByRepHtml}
              </tbody>
            </table>
            
            ${
              insights.bestPerformingSalesRep
                ? `
              <div class="recommendations">
                <h3>Sales Team Insights</h3>
                <p><strong>${
                  insights.bestPerformingSalesRep.full_name
                }</strong> is the top performer with Rs. ${insights.bestPerformingSalesRep.total_sales.toLocaleString()} in sales from ${
                    insights.bestPerformingSalesRep.order_count
                  } orders.</p>
                <p>Consider having top performers share their strategies with the rest of the team to improve overall performance.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Payment Type Analysis</h2>
            <p>Understanding payment preferences helps optimize financial planning and cash flow management.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Payment Type</th>
                  <th>Orders</th>
                  <th>Total Amount</th>
                  <th>% of Sales</th>
                </tr>
              </thead>
              <tbody>
                ${paymentTypeHtml}
              </tbody>
            </table>
            
            ${
              insights.creditPercentage > 50
                ? `
              <div class="recommendations">
                <h3>Payment Risk Alert</h3>
                <p>Credit sales represent <strong>${Math.round(
                  insights.creditPercentage
                )}%</strong> of your total sales, which may impact cash flow.</p>
                <p>Consider implementing incentives for cash payments or stricter credit management policies.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Daily Sales Breakdown</h2>
            <p>Detailed view of sales performance by day helps identify patterns and exceptional days.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th>Total Sales</th>
                  <th>Avg. Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${salesByDateHtml}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Recommendations & Action Points</h2>
            <ul>
              ${
                insights.salesTrend < 0
                  ? `<li>Sales are trending down by ${Math.abs(
                      Math.round(insights.salesTrend)
                    )}%. Consider promotional activities to boost sales.</li>`
                  : `<li>Sales are trending up by ${Math.round(
                      insights.salesTrend
                    )}%. Capitalize on this momentum with targeted marketing.</li>`
              }
              ${
                insights.bestSellingProduct
                  ? `<li>Focus inventory management on "${insights.bestSellingProduct.name}" to ensure availability of your best-selling product.</li>`
                  : ""
              }
              ${
                insights.creditPercentage > 40
                  ? `<li>Credit sales at ${Math.round(
                      insights.creditPercentage
                    )}% are high. Review credit policies to improve cash flow.</li>`
                  : ""
              }
              <li>Analyze sales patterns by day of week to optimize staffing and inventory planning.</li>
              <li>Consider implementing a loyalty program to increase repeat business and average order value.</li>
              ${
                reportData.salesByRep.length > 1
                  ? `<li>Evaluate performance difference between top and bottom sales representatives to identify training opportunities.</li>`
                  : ""
              }
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
    let summarySheet = "Roo Herbals - Sales Performance Report\n";
    summarySheet += `Period: ${formatDateFn(
      insights.dateRange.startDate
    )} to ${formatDateFn(insights.dateRange.endDate)}\n`;
    summarySheet += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    summarySheet += "EXECUTIVE SUMMARY\n\n";
    summarySheet += `Total Sales,Rs. ${insights.totalSales.toLocaleString()}\n`;
    summarySheet += `Total Orders,${insights.totalOrders}\n`;
    summarySheet += `Average Order Value,Rs. ${Math.round(
      insights.avgOrderValue
    ).toLocaleString()}\n`;
    summarySheet += `Average Daily Sales,Rs. ${Math.round(
      insights.avgDailySales
    ).toLocaleString()}\n`;
    summarySheet += `Average Daily Orders,${Math.round(
      insights.avgDailyOrders
    ).toLocaleString()}\n`;
    summarySheet += `Sales Trend,${Math.round(insights.salesTrend)}%\n\n`;

    summarySheet += "PAYMENT DISTRIBUTION\n\n";
    summarySheet += `Cash,Rs. ${
      insights.cashSales ? insights.cashSales.total_sales.toLocaleString() : "0"
    },${Math.round(insights.cashPercentage)}%\n`;
    summarySheet += `Credit,Rs. ${
      insights.creditSales
        ? insights.creditSales.total_sales.toLocaleString()
        : "0"
    },${Math.round(insights.creditPercentage)}%\n`;
    summarySheet += `Cheque,Rs. ${
      insights.chequeSales
        ? insights.chequeSales.total_sales.toLocaleString()
        : "0"
    },${Math.round(insights.chequePercentage)}%\n\n`;

    // Sheet 2: Product Sales
    let productSheet = "PRODUCT SALES\n\n";
    productSheet +=
      "Product Name,Quantity Sold,Total Sales,Average Unit Price\n";

    reportData.salesByProduct.forEach((product) => {
      const avgUnitPrice = Math.round(
        product.total_sales / Math.max(product.total_quantity, 1)
      );
      productSheet += `${product.name.replace(/,/g, " ")},${
        product.total_quantity
      },${product.total_sales},${avgUnitPrice}\n`;
    });

    // Sheet 3: Sales Rep Performance
    let repSheet = "SALES REPRESENTATIVE PERFORMANCE\n\n";
    repSheet += "Name,Orders,Total Sales,Average Order Value\n";

    reportData.salesByRep.forEach((rep) => {
      const avgOrderValue = Math.round(
        rep.total_sales / Math.max(rep.order_count, 1)
      );
      repSheet += `${rep.full_name.replace(/,/g, " ")},${rep.order_count},${
        rep.total_sales
      },${avgOrderValue}\n`;
    });

    // Sheet 4: Daily Sales
    let dailySheet = "DAILY SALES\n\n";
    dailySheet += "Date,Orders,Total Sales,Average Order Value\n";

    const sortedSalesByDate = [...reportData.salesByDate].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedSalesByDate.forEach((day) => {
      const avgOrderValue = Math.round(
        day.total_sales / Math.max(day.order_count, 1)
      );
      dailySheet += `${formatDateFn(day.date)},${day.order_count},${
        day.total_sales
      },${avgOrderValue}\n`;
    });

    // Sheet 5: Payment Types
    let paymentSheet = "PAYMENT TYPE ANALYSIS\n\n";
    paymentSheet += "Payment Type,Orders,Total Amount,% of Sales\n";

    reportData.salesByPaymentType.forEach((payment) => {
      const paymentTypeFormatted =
        payment.payment_type.charAt(0).toUpperCase() +
        payment.payment_type.slice(1);
      const percentage =
        insights.totalSales > 0
          ? Math.round((payment.total_sales / insights.totalSales) * 100)
          : 0;

      paymentSheet += `${paymentTypeFormatted},${payment.order_count},${payment.total_sales},${percentage}%\n`;
    });

    // Sheet 6: Recommendations
    let recommendationsSheet = "RECOMMENDATIONS & ACTION POINTS\n\n";

    if (insights.salesTrend < 0) {
      recommendationsSheet += `1,Sales are trending down by ${Math.abs(
        Math.round(insights.salesTrend)
      )}%. Consider promotional activities to boost sales.\n`;
    } else {
      recommendationsSheet += `1,Sales are trending up by ${Math.round(
        insights.salesTrend
      )}%. Capitalize on this momentum with targeted marketing.\n`;
    }

    if (insights.bestSellingProduct) {
      recommendationsSheet += `2,Focus inventory management on "${insights.bestSellingProduct.name}" to ensure availability of your best-selling product.\n`;
    }

    if (insights.creditPercentage > 40) {
      recommendationsSheet += `3,Credit sales at ${Math.round(
        insights.creditPercentage
      )}% are high. Review credit policies to improve cash flow.\n`;
    }

    recommendationsSheet += `4,Analyze sales patterns by day of week to optimize staffing and inventory planning.\n`;
    recommendationsSheet += `5,Consider implementing a loyalty program to increase repeat business and average order value.\n`;

    if (reportData.salesByRep.length > 1) {
      recommendationsSheet += `6,Evaluate performance difference between top and bottom sales representatives to identify training opportunities.\n`;
    }

    return {
      summarySheet,
      productSheet,
      repSheet,
      dailySheet,
      paymentSheet,
      recommendationsSheet,
    };
  };

  // Export sales data
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
        csvContent += excelData.productSheet + "\n\n";
        csvContent += excelData.repSheet + "\n\n";
        csvContent += excelData.dailySheet + "\n\n";
        csvContent += excelData.paymentSheet + "\n\n";
        csvContent += excelData.recommendationsSheet;

        const filename = `roo_herbals_sales_performance_${
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
    fetchSalesReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The fetchSalesReports function uses filterOptions which would cause
  // an infinite loop if we include it in the dependencies

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
          <Text style={styles.headerTitle}>Sales Reports</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading sales reports...</Text>
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
        <Text style={styles.headerTitle}>Sales Reports</Text>
        <TouchableOpacity style={styles.filterButton} onPress={toggleFilters}>
          <Feather name="filter" size={22} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Sales Data</Text>
            <TouchableOpacity onPress={toggleFilters}>
              <AntDesign name="close" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={styles.dateInput}
                value={filterOptions.startDate}
                onChangeText={(text) =>
                  setFilterOptions({ ...filterOptions, startDate: text })
                }
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.dateRangeSeparator}>to</Text>
              <TextInput
                style={styles.dateInput}
                value={filterOptions.endDate}
                onChangeText={(text) =>
                  setFilterOptions({ ...filterOptions, endDate: text })
                }
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.filterActionButton, styles.resetButton]}
              onPress={resetFilters}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterActionButton, styles.applyButton]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Export Actions */}
      <View style={styles.exportContainer}>
        <Text style={styles.exportLabel}>Export Performance Report:</Text>
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
        {/* Date Range Display */}
        <View style={styles.dateRangeDisplay}>
          <Text style={styles.dateRangeText}>
            {formatDateFn(filterOptions.startDate)} to{" "}
            {formatDateFn(filterOptions.endDate)}
          </Text>
        </View>

        {/* Key Metrics Section */}
        {insights && (
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Total Sales</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(insights.totalSales)}
              </Text>
              <View style={styles.insightTrendContainer}>
                {insights.salesTrend >= 0 ? (
                  <MaterialIcons name="trending-up" size={16} color="#28A745" />
                ) : (
                  <MaterialIcons
                    name="trending-down"
                    size={16}
                    color="#DC3545"
                  />
                )}
                <Text
                  style={[
                    styles.insightTrend,
                    insights.salesTrend >= 0
                      ? styles.positiveValue
                      : styles.negativeValue,
                  ]}
                >
                  {Math.abs(Math.round(insights.salesTrend))}%{" "}
                  {insights.salesTrend >= 0 ? "increase" : "decrease"}
                </Text>
              </View>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Orders</Text>
              <Text style={styles.insightValue}>{insights.totalOrders}</Text>
              <Text style={styles.insightSubtext}>
                {Math.round(insights.avgDailyOrders)} orders/day
              </Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Avg. Order</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(Math.round(insights.avgOrderValue))}
              </Text>
              <Text style={styles.insightSubtext}>per transaction</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Daily Avg.</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(Math.round(insights.avgDailySales))}
              </Text>
              <Text style={styles.insightSubtext}>revenue/day</Text>
            </View>
          </View>
        )}

        {/* Payment Type Breakdown */}
        <Text style={styles.sectionTitle}>Payment Distribution</Text>
        {reportData?.salesByPaymentType &&
        reportData.salesByPaymentType.length > 0 ? (
          <View style={styles.paymentTypeContainer}>
            {reportData.salesByPaymentType.map((payment) => {
              const paymentTypeFormatted =
                payment.payment_type.charAt(0).toUpperCase() +
                payment.payment_type.slice(1);

              // Ensure proper numeric conversion
              const paymentTotal = parseFloat(payment.total_sales as any) || 0;
              const orderCount = parseInt(payment.order_count as any) || 0;

              // Calculate percentage against the total (make sure total is not 0)
              const insightsTotalSales = insights?.totalSales || 0;
              const percentage =
                insightsTotalSales > 0
                  ? (paymentTotal / insightsTotalSales) * 100
                  : 0;

              let paymentColor = "#28A745"; // Default green for cash
              let paymentIcon = null;

              if (payment.payment_type === "cash") {
                paymentIcon = (
                  <MaterialCommunityIcons
                    name="cash"
                    size={20}
                    color="#28A745"
                  />
                );
              } else if (payment.payment_type === "credit") {
                paymentColor = "#DC3545"; // Red for credit
                paymentIcon = (
                  <MaterialIcons name="credit-card" size={20} color="#DC3545" />
                );
              } else if (payment.payment_type === "cheque") {
                paymentColor = "#FD7E14"; // Orange for cheque
                paymentIcon = (
                  <MaterialCommunityIcons
                    name="checkbox-marked-circle-outline"
                    size={20}
                    color="#FD7E14"
                  />
                );
              }

              return (
                <View key={payment.payment_type} style={styles.paymentTypeCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentTitleContainer}>
                      {paymentIcon && (
                        <View style={styles.paymentIconContainer}>
                          {paymentIcon}
                        </View>
                      )}
                      <Text style={styles.paymentTitle}>
                        {paymentTypeFormatted}
                      </Text>
                      <Text style={styles.paymentPercentage}>
                        {Math.round(percentage)}% of total
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.paymentAmount}>
                    {formatCurrencyFn(paymentTotal)}
                  </Text>

                  <View style={styles.paymentProgressContainer}>
                    <View
                      style={[
                        styles.paymentProgress,
                        {
                          width: `${percentage}%`,
                          backgroundColor: paymentColor,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.orderCount}>
                    {orderCount} orders (
                    {Math.round(
                      (orderCount / (insights?.totalOrders || 1)) * 100
                    )}
                    % of total)
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="credit-card-multiple"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No payment data available</Text>
          </View>
        )}

        {/* Top Products */}
        <Text style={styles.sectionTitle}>Top Products</Text>
        {reportData?.salesByProduct && reportData.salesByProduct.length > 0 ? (
          <View style={styles.productsContainer}>
            {reportData.salesByProduct.slice(0, 5).map((product, index) => {
              // Calculate product percentage of total sales
              const productSales = parseFloat(product.total_sales as any) || 0;
              const totalSales = insights?.totalSales || 0;
              const salesPercentage =
                totalSales > 0 ? (productSales / totalSales) * 100 : 0;

              return (
                <View key={product.product_id} style={styles.productCard}>
                  <View
                    style={[
                      styles.productRankContainer,
                      index === 0 ? styles.topProduct : {},
                    ]}
                  >
                    <Text style={styles.productRank}>{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.productStats}>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons
                          name="package-variant"
                          size={16}
                          color="#6c757d"
                        />
                        <Text style={styles.statText}>
                          {parseInt(product.total_quantity as any) || 0} units
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons
                          name="cash"
                          size={16}
                          color="#6c757d"
                        />
                        <Text style={styles.statText}>
                          {formatCurrencyFn(
                            parseFloat(product.total_sales as any) || 0
                          )}{" "}
                          ({Math.round(salesPercentage)}%)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.productProgressContainer}>
                      <View
                        style={[
                          styles.productProgress,
                          {
                            width: `${Math.min(salesPercentage * 1.5, 100)}%`,
                            backgroundColor:
                              index === 0 ? "#28A745" : "#6c757d",
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>
              No product sales data available
            </Text>
          </View>
        )}

        {/* Top Sales Reps */}
        <Text style={styles.sectionTitle}>Sales Representatives</Text>
        {reportData?.salesByRep && reportData.salesByRep.length > 0 ? (
          <View style={styles.salesRepsContainer}>
            {reportData.salesByRep.map((rep, index) => {
              // Calculate rep percentage of total sales
              const repSales = parseFloat(rep.total_sales as any) || 0;
              const totalSales = insights?.totalSales || 0;
              const salesPercentage =
                totalSales > 0 ? (repSales / totalSales) * 100 : 0;

              // Calculate rep percentage of total orders
              const repOrders = parseInt(rep.order_count as any) || 0;
              const totalOrders = insights?.totalOrders || 0;
              const ordersPercentage =
                totalOrders > 0 ? (repOrders / totalOrders) * 100 : 0;

              return (
                <View key={rep.user_id} style={styles.salesRepCard}>
                  <View
                    style={[
                      styles.salesRepRankContainer,
                      index === 0 ? styles.topPerformer : {},
                    ]}
                  >
                    <Text style={styles.salesRepRank}>{index + 1}</Text>
                  </View>
                  <View style={styles.salesRepInfo}>
                    <Text style={styles.salesRepName}>{rep.full_name}</Text>
                    <View style={styles.salesRepStatsRow}>
                      <View style={styles.salesRepStatColumn}>
                        <Text style={styles.salesRepStatLabel}>Orders</Text>
                        <View style={styles.statItem}>
                          <Text style={styles.statText}>
                            {parseInt(rep.order_count as any) || 0} (
                            {Math.round(ordersPercentage)}%)
                          </Text>
                        </View>
                      </View>
                      <View style={styles.salesRepStatColumn}>
                        <Text style={styles.salesRepStatLabel}>Sales</Text>
                        <View style={styles.statItem}>
                          <Text style={styles.statText}>
                            {formatCurrencyFn(
                              parseFloat(rep.total_sales as any) || 0
                            )}{" "}
                            ({Math.round(salesPercentage)}%)
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.salesRepProgressContainer}>
                      <View
                        style={[
                          styles.salesRepProgress,
                          {
                            width: `${Math.min(salesPercentage * 1.5, 100)}%`,
                            backgroundColor:
                              index === 0 ? "#FFC107" : "#6c757d",
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="user-tie" size={40} color="#ADB5BD" />
            <Text style={styles.emptyText}>No sales rep data available</Text>
          </View>
        )}

        {/* Recommendations Section */}
        {insights && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Insights & Recommendations</Text>

            <View style={styles.recommendationCard}>
              {insights.salesTrend < 0 ? (
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
                      Sales Trend Alert
                    </Text>
                    <Text style={styles.recommendationText}>
                      Sales are trending down by{" "}
                      {Math.abs(Math.round(insights.salesTrend))}%. Consider
                      promotional activities to boost sales.
                    </Text>
                  </View>
                </View>
              ) : (
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
                      Positive Sales Trend
                    </Text>
                    <Text style={styles.recommendationText}>
                      Sales are trending up by {Math.round(insights.salesTrend)}
                      %. Capitalize on this momentum with targeted marketing.
                    </Text>
                  </View>
                </View>
              )}

              {insights.bestSellingProduct && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D1ECF1" },
                    ]}
                  >
                    <MaterialIcons name="star" size={20} color="#17A2B8" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Top Product Insight
                    </Text>
                    <Text style={styles.recommendationText}>
                      &ldquo;{insights.bestSellingProduct.name}&rdquo; is your
                      best seller with{" "}
                      {insights.bestSellingProduct.total_quantity} units sold.
                      Ensure adequate stock levels.
                    </Text>
                  </View>
                </View>
              )}

              {insights.creditPercentage > 40 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#FFF3CD" },
                    ]}
                  >
                    <MaterialIcons
                      name="credit-card"
                      size={20}
                      color="#FFC107"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Credit Management
                    </Text>
                    <Text style={styles.recommendationText}>
                      Credit sales are at{" "}
                      {Math.round(insights.creditPercentage)}% of total sales.
                      Consider reviewing credit policies to improve cash flow.
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
                  <MaterialIcons name="timeline" size={20} color="#28A745" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>
                    Sales Pattern Analysis
                  </Text>
                  <Text style={styles.recommendationText}>
                    Analyze sales by day of week to optimize inventory and staff
                    planning for busy periods.
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
  filterButton: {
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
  filterPanel: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    padding: 16,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  dateRangeSeparator: {
    paddingHorizontal: 10,
    color: "#6c757d",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  filterActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: "#CED4DA",
  },
  resetButtonText: {
    color: "#6c757d",
    fontSize: 14,
    fontWeight: "500",
  },
  applyButton: {
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "500",
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
  dateRangeDisplay: {
    alignItems: "center",
    marginBottom: 16,
  },
  dateRangeText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  insightsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
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
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  insightTrendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  insightTrend: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  insightSubtext: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
  },
  positiveValue: {
    color: "#28A745",
  },
  negativeValue: {
    color: "#DC3545",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
  },
  paymentTypeContainer: {
    marginBottom: 20,
  },
  paymentTypeCard: {
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
  paymentHeader: {
    marginBottom: 8,
  },
  paymentIconContainer: {
    marginRight: 8,
  },
  paymentTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginRight: 8,
  },
  paymentPercentage: {
    fontSize: 14,
    color: "#6c757d",
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 8,
  },
  paymentProgressContainer: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    marginBottom: 8,
  },
  paymentProgress: {
    height: 8,
    borderRadius: 4,
  },
  productsContainer: {
    marginBottom: 20,
  },
  productCard: {
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
  productRankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6c757d",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topProduct: {
    backgroundColor: "#28A745",
  },
  productRank: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 6,
  },
  productStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  productProgressContainer: {
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
  },
  productProgress: {
    height: 6,
    borderRadius: 3,
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
  salesRepsContainer: {
    marginBottom: 20,
  },
  salesRepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  salesRepRankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6c757d",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topPerformer: {
    backgroundColor: "#FFC107",
  },
  salesRepRank: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  salesRepInfo: {
    flex: 1,
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 6,
  },
  salesRepStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  salesRepStatColumn: {
    flex: 1,
  },
  salesRepStatLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  salesRepProgressContainer: {
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
  },
  salesRepProgress: {
    height: 6,
    borderRadius: 3,
  },
  recommendationsContainer: {
    marginBottom: 20,
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
  orderCount: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
});
