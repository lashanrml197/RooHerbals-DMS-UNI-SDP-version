import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
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
import { formatDate, getInventoryReports } from "../services/reportApi";
import { COLORS } from "../theme/colors";

/**
 * Type definitions for inventory report data structures
 * These interfaces ensure type safety and better code documentation
 */

// Main report container with all inventory analytics
interface InventoryReport {
  lowStockProducts: LowStockProduct[];
  expiringBatches: ExpiringBatch[];
  stockByCategory: StockByCategory[];
  topMovingProducts: MovingProduct[];
  slowMovingProducts: MovingProduct[];
  totalProductsCount?: number;
}

// Products that need immediate restocking based on reorder levels
interface LowStockProduct {
  product_id: string;
  name: string;
  reorder_level: number;
  total_stock: number;
}

// Batches approaching expiry date (within 30 days)
interface ExpiringBatch {
  batch_id: string;
  batch_number: string;
  product_name: string;
  expiry_date: string;
  current_quantity: number;
}

// Category-wise inventory value breakdown for portfolio analysis
interface StockByCategory {
  category: string;
  stock_value: number;
  product_count?: number;
}

// Product movement data for sales velocity analysis
interface MovingProduct {
  product_id: string;
  name: string;
  quantity_sold: number;
}

export default function InventoryReports() {
  // State management for component data and UI states
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<InventoryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Utility function to format currency amounts consistently
   * Handles both string and number inputs, provides fallback for invalid data
   */
  /**
   * Utility function to format currency amounts consistently
   * Handles both string and number inputs, provides fallback for invalid data
   */
  const formatCurrencyFn = (amount: number | string): string => {
    // Convert string to number if needed
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;

    // Check for valid number
    if (isNaN(numericAmount)) return "Rs. 0";

    // Format with no decimal places for cleaner display
    return `Rs. ${Math.round(numericAmount).toLocaleString("en-US")}`;
  };

  /**
   * Calculate how many days remain until a product batch expires
   * Used for prioritizing expiring stock and creating urgency indicators
   */
  const getDaysUntilExpiry = (expiryDateStr: string): number => {
    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Determine stock status based on current stock vs reorder level
   * Critical: ≤25% of reorder level (urgent restocking needed)
   * Low: 26-75% of reorder level (should plan restocking)
   * Adequate: >75% of reorder level (sufficient stock)
   */
  /**
   * Determine stock status based on current stock vs reorder level
   * Critical: ≤25% of reorder level (urgent restocking needed)
   * Low: 26-75% of reorder level (should plan restocking)
   * Adequate: >75% of reorder level (sufficient stock)
   */
  const getStockStatus = (
    currentStock: number,
    reorderLevel: number
  ): string => {
    // Avoid division by zero - if no reorder level set, assume adequate
    if (reorderLevel <= 0) return "Adequate";

    const percentage = (currentStock / reorderLevel) * 100;
    if (percentage <= 25) return "Critical";
    if (percentage <= 75) return "Low";
    return "Adequate";
  };

  const calculateInsights = () => {
    if (!reportData) return null;

    // Calculate total inventory value - this is our main investment metric
    const totalInventoryValue = reportData.stockByCategory.reduce(
      (sum, category) => sum + category.stock_value,
      0
    );

    // Calculate average product price for estimating values where cost data isn't available
    const productCount = reportData.stockByCategory.reduce(
      (sum, category) => sum + (category.product_count || 0),
      0
    );
    const avgCostPrice =
      productCount > 0 ? totalInventoryValue / productCount : 300; // Fallback average price

    // Calculate the monetary value at risk from low stock items
    const totalLowStockValue = reportData.lowStockProducts.reduce(
      (sum, product) => sum + product.total_stock * avgCostPrice,
      0
    );

    // Calculate what percentage of our product portfolio needs attention
    const totalProducts = reportData.totalProductsCount || 20;
    const lowStockPercentage =
      (reportData.lowStockProducts.length / totalProducts) * 100;

    // Calculate potential losses from expiring stock
    const expiringStockValue = reportData.expiringBatches.reduce(
      (sum, batch) => sum + batch.current_quantity * avgCostPrice,
      0
    );

    const expiringStockPercentage =
      totalInventoryValue > 0
        ? (expiringStockValue / totalInventoryValue) * 100
        : 0;

    // Category distribution analysis for portfolio management
    const categoryDistribution = reportData.stockByCategory.map((category) => ({
      name: category.category,
      value: category.stock_value,
      percentage:
        totalInventoryValue > 0
          ? (category.stock_value / totalInventoryValue) * 100
          : 0,
    }));

    // Identify which category represents our biggest investment
    const mostValuableCategory =
      categoryDistribution.length > 0
        ? categoryDistribution.reduce((prev, current) =>
            prev.value > current.value ? prev : current
          )
        : null;

    // Calculate sales velocity and movement patterns
    const topMovingValue = reportData.topMovingProducts.reduce(
      (sum, product) => sum + product.quantity_sold * avgCostPrice,
      0
    );

    const slowMovingValue = reportData.slowMovingProducts.reduce(
      (sum, product) => sum + product.quantity_sold * avgCostPrice,
      0
    );

    // Calculate inventory turnover rate (how many times we cycle through inventory per year)
    // Higher turnover = better cash flow and fresher stock
    // Calculate inventory turnover rate (how many times we cycle through inventory per year)
    // Higher turnover = better cash flow and fresher stock
    const inventoryTurnover =
      totalInventoryValue > 0 ? (topMovingValue / totalInventoryValue) * 12 : 0;

    return {
      totalInventoryValue,
      lowStockPercentage,
      lowStockValue: totalLowStockValue,
      expiringStockValue,
      expiringStockPercentage,
      categoryDistribution,
      mostValuableCategory,
      topMovingValue,
      slowMovingValue,
      inventoryTurnover,
    };
  };

  /**
   * Fetch inventory reports data from the API
   * Handles loading states and error management with user-friendly feedback
   */
  const fetchInventoryReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryReports();
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to fetch inventory reports:", err);
      setError(err.message || "Failed to load inventory reports");
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the inventory report data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const generatePdfReport = async () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format current date and time for report header
    const today = new Date();
    const formattedDate = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;

    // Generate HTML table for low stock products with alternating row colors and status indicators
    let lowStockHtml = "";
    reportData.lowStockProducts.forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const stockStatus = getStockStatus(
        product.total_stock,
        product.reorder_level
      );
      const stockColor =
        stockStatus === "Critical"
          ? "#dc3545"
          : stockStatus === "Low"
          ? "#fd7e14"
          : "#28a745";

      lowStockHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${product.name}</td>
          <td>${product.total_stock}</td>
          <td>${product.reorder_level}</td>
          <td style="color: ${stockColor}; font-weight: bold;">${stockStatus}</td>
          <td>${Math.round(
            (product.total_stock / product.reorder_level) * 100
          )}%</td>
        </tr>
      `;
    });

    // Generate HTML table for expiring batches with urgency color coding
    let expiringBatchesHtml = "";
    reportData.expiringBatches.forEach((batch, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);
      const expiryColor =
        daysUntilExpiry <= 7
          ? "#dc3545" // Red for urgent (≤7 days)
          : daysUntilExpiry <= 15
          ? "#fd7e14" // Orange for warning (8-15 days)
          : "#28a745"; // Green for safe (>15 days)

      expiringBatchesHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${batch.product_name}</td>
          <td>${batch.batch_number}</td>
          <td>${formatDate(batch.expiry_date)}</td>
          <td style="color: ${expiryColor}; font-weight: bold;">${daysUntilExpiry} days</td>
          <td>${batch.current_quantity}</td>
        </tr>
      `;
    });

    // Generate HTML table for category distribution analysis
    let categoryHtml = "";
    insights.categoryDistribution.forEach((category, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      categoryHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${category.name}</td>
          <td>Rs. ${category.value.toLocaleString()}</td>
          <td>${Math.round(category.percentage)}%</td>
        </tr>
      `;
    });

    // Generate HTML table for top performing products
    let topMovingHtml = "";
    reportData.topMovingProducts.forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      topMovingHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${index + 1}</td>
          <td>${product.name}</td>
          <td>${product.quantity_sold}</td>
        </tr>
      `;
    });

    // Generate HTML table for underperforming products that need attention
    let slowMovingHtml = "";
    reportData.slowMovingProducts.forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      slowMovingHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${product.name}</td>
          <td>${product.quantity_sold}</td>
        </tr>
      `;
    });

    // Prepare chart data for category value visualization
    let categoryLabels = "";
    let categoryValues = "";
    let categoryColors = "";

    const chartColors = [
      "#4ECDC4",
      "#FF7675",
      "#A29BFE",
      "#FDCB6E",
      "#7DA453",
      "#346491",
    ];

    insights.categoryDistribution.forEach((category, index) => {
      categoryLabels += `'${category.name}',`;
      categoryValues += `${category.value},`;
      categoryColors += `'${chartColors[index % chartColors.length]}',`;
    });

    // Clean up trailing commas for valid JavaScript arrays
    // Clean up trailing commas for valid JavaScript arrays
    categoryLabels = categoryLabels.slice(0, -1);
    categoryValues = categoryValues.slice(0, -1);
    categoryColors = categoryColors.slice(0, -1);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Inventory Management Report - Roo Herbals</title>
          <style>
            /* Professional styling for business report formatting */
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
            /* Executive summary cards styling */
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
            /* Table styling for data presentation */
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
            /* Chart container styling */
            .chart {
              width: 100%;
              height: 250px;
              margin: 20px 0;
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 15px;
            }
            /* Status color indicators */
            .critical {
              color: #dc3545;
              font-weight: bold;
            }
            .warning {
              color: #fd7e14;
              font-weight: bold;
            }
            .good {
              color: #28a745;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #777;
            }
            /* Recommendations section highlighting */
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
          <!-- Company header and report title -->
          <div class="header">
            <h1>Roo Herbals Pvt Ltd</h1>
            <h2>Inventory Management Report</h2>
            <p>Generated on: ${formattedDate}</p>
          </div>
          
          <!-- Executive summary with key metrics -->
          <div class="section">
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive analysis of current inventory status, stock levels, product movements, and expiry tracking. Use these insights to optimize inventory management and procurement decisions.</p>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Total Inventory Value</p>
                <p class="insight-value">Rs. ${insights.totalInventoryValue.toLocaleString()}</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Low Stock Products</p>
                <p class="insight-value">${
                  reportData.lowStockProducts.length
                }</p>
                <p class="insight-trend ${
                  insights.lowStockPercentage > 20 ? "trend-down" : "trend-up"
                }">
                  ${Math.round(insights.lowStockPercentage)}% of total products
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Expiring Stock Value</p>
                <p class="insight-value">Rs. ${insights.expiringStockValue.toLocaleString()}</p>
                <p class="insight-trend ${
                  insights.expiringStockPercentage > 5
                    ? "trend-down"
                    : "trend-up"
                }">
                  ${Math.round(
                    insights.expiringStockPercentage
                  )}% of total inventory
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Inventory Turnover</p>
                <p class="insight-value">${insights.inventoryTurnover.toFixed(
                  1
                )}x</p>
                <p class="insight-trend ${
                  insights.inventoryTurnover < 4 ? "trend-down" : "trend-up"
                }">
                  Annualized rate
                </p>
              </div>
            </div>
          </div>
          
          <!-- Low Stock Alert Section with actionable recommendations -->
          <div class="section">
            <h2>Low Stock Alert</h2>
            <p>These products are below or approaching their reorder levels and may need replenishment soon.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>% of Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockHtml}
              </tbody>
            </table>
            
            <div class="recommendations">
              <h3>Stock Replenishment Priority</h3>
              <p>Immediate attention is required for products with "Critical" status. Consider placing orders for the following products:</p>
              <ul>
                ${reportData.lowStockProducts
                  .filter(
                    (product) =>
                      product.total_stock <= product.reorder_level * 0.25
                  )
                  .map(
                    (product) =>
                      `<li><strong>${product.name}</strong> - Current stock: ${product.total_stock}, Reorder level: ${product.reorder_level}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          </div>
          
          <!-- Expiring Batches Section with loss prevention strategies -->
          <div class="section">
            <h2>Expiring Batches</h2>
            <p>These batches will expire in the next 30 days and should be prioritized for sales or promotions.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${expiringBatchesHtml}
              </tbody>
            </table>
            
            <div class="recommendations">
              <h3>Expiring Stock Management</h3>
              <p>Consider the following actions for products expiring within 15 days:</p>
              <ul>
                <li>Offer special discounts or promotions to move these products quickly</li>
                <li>Prioritize these batches when fulfilling new orders</li>
                <li>Notify sales representatives to focus on selling these products</li>
              </ul>
            </div>
          </div>
          
          <!-- Inventory Value by Category with portfolio analysis -->
          <div class="section">
            <h2>Inventory Value by Category</h2>
            <p>Understanding category distribution helps optimize procurement and inventory management strategies.</p>
            
            <div class="chart">
              <canvas id="categoryChart"></canvas>
            </div>
            <script>
              // Interactive chart for category value distribution
              document.addEventListener('DOMContentLoaded', function() {
                const ctx = document.getElementById('categoryChart').getContext('2d');
                new Chart(ctx, {
                  type: 'pie',
                  data: {
                    labels: [${categoryLabels}],
                    datasets: [{
                      data: [${categoryValues}],
                      backgroundColor: [${categoryColors}],
                      borderWidth: 1
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
                        text: 'Inventory Value Distribution by Category'
                      }
                    }
                  }
                });
              });
            </script>
            
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Value</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${categoryHtml}
              </tbody>
            </table>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Most Valuable Category</p>
                <p class="insight-value">${
                  insights.mostValuableCategory?.name || "N/A"
                }</p>
                <p class="insight-trend">
                  Rs. ${
                    insights.mostValuableCategory?.value.toLocaleString() || 0
                  } (${Math.round(
      insights.mostValuableCategory?.percentage || 0
    )}%)
                </p>
              </div>
            </div>
          </div>
          
          <!-- Product Movement Analysis for sales optimization -->
          <div class="section">
            <h2>Product Movement Analysis</h2>
            <p>Tracking product movement helps identify popular items and slow movers to optimize procurement and promotions.</p>
            
            <h3>Top Moving Products (Last 30 Days)</h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                ${topMovingHtml}
              </tbody>
            </table>
            
            <h3>Slow Moving Products (Last 30 Days)</h3>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                ${slowMovingHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Strategic recommendations for business optimization -->
          <div class="section">
            <h2>Recommendations & Action Points</h2>
            <ul>
              <li>Place orders for products with "Critical" stock status immediately to avoid stockouts.</li>
              <li>Implement promotions for products with approaching expiry dates to minimize potential losses.</li>
              <li>Review slow-moving products and consider adjusted pricing strategies or discontinuation if appropriate.</li>
              <li>Assess inventory turnover rate by category and optimize procurement based on demand patterns.</li>
              <li>Consider adjusting reorder levels for fast-moving products to prevent stockouts during peak demand periods.</li>
            </ul>
          </div>
          
          <!-- Professional footer with confidentiality notice -->
          <div class="footer">
            <p>© ${new Date().getFullYear()} Roo Herbals Pvt Ltd | This report is confidential and intended for internal use only.</p>
            <p>For questions about this report, please contact the system administrator.</p>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  const generateExcelData = () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Create detailed workbook with multiple analysis sheets

    // Executive Summary Sheet - High-level overview for management
    let summarySheet = "Roo Herbals - Inventory Management Report\n";
    summarySheet += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    summarySheet += "EXECUTIVE SUMMARY\n\n";
    summarySheet += `Total Inventory Value,Rs. ${insights.totalInventoryValue.toLocaleString()}\n`;
    summarySheet += `Low Stock Products,${reportData.lowStockProducts.length}\n`;
    summarySheet += `Expiring Stock Value,Rs. ${insights.expiringStockValue.toLocaleString()}\n`;
    summarySheet += `Inventory Turnover Rate,${insights.inventoryTurnover.toFixed(
      1
    )}\n\n`;

    summarySheet += "KEY METRICS\n\n";
    summarySheet += `Most Valuable Category,${
      insights.mostValuableCategory?.name || "N/A"
    },Rs. ${insights.mostValuableCategory?.value.toLocaleString() || 0}\n`;
    summarySheet += `Low Stock Percentage,${Math.round(
      insights.lowStockPercentage
    )}%\n`;
    summarySheet += `Expiring Stock Percentage,${Math.round(
      insights.expiringStockPercentage
    )}%\n\n`;

    // Low Stock Products Sheet - Detailed reorder requirements
    let lowStockSheet = "LOW STOCK PRODUCTS\n\n";
    lowStockSheet +=
      "Product Name,Current Stock,Reorder Level,Status,Percentage of Reorder Level\n";

    reportData.lowStockProducts.forEach((product) => {
      const stockStatus = getStockStatus(
        product.total_stock,
        product.reorder_level
      );
      const percentage = Math.round(
        (product.total_stock / product.reorder_level) * 100
      );

      lowStockSheet += `${product.name.replace(/,/g, " ")},${
        product.total_stock
      },${product.reorder_level},${stockStatus},${percentage}%\n`;
    });

    // Expiring Batches Sheet - Risk management data
    let expiringSheet = "EXPIRING BATCHES\n\n";
    expiringSheet +=
      "Product Name,Batch Number,Expiry Date,Days Until Expiry,Current Quantity\n";

    reportData.expiringBatches.forEach((batch) => {
      const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);

      expiringSheet += `${batch.product_name.replace(/,/g, " ")},${
        batch.batch_number
      },${formatDate(batch.expiry_date)},${daysUntilExpiry},${
        batch.current_quantity
      }\n`;
    });

    // Category Analysis Sheet - Portfolio distribution
    let categorySheet = "INVENTORY VALUE BY CATEGORY\n\n";
    categorySheet += "Category,Stock Value,Percentage of Total\n";

    insights.categoryDistribution.forEach((category) => {
      categorySheet += `${category.name.replace(/,/g, " ")},${
        category.value
      },${Math.round(category.percentage)}%\n`;
    });

    // Product Movement Sheet - Sales performance analysis
    let movementSheet = "PRODUCT MOVEMENT ANALYSIS\n\n";
    movementSheet += "TOP MOVING PRODUCTS (LAST 30 DAYS)\n";
    movementSheet += "Rank,Product Name,Quantity Sold\n";

    reportData.topMovingProducts.forEach((product, index) => {
      movementSheet += `${index + 1},${product.name.replace(/,/g, " ")},${
        product.quantity_sold
      }\n`;
    });

    movementSheet += "\nSLOW MOVING PRODUCTS (LAST 30 DAYS)\n";
    movementSheet += "Product Name,Quantity Sold\n";

    reportData.slowMovingProducts.forEach((product) => {
      movementSheet += `${product.name.replace(/,/g, " ")},${
        product.quantity_sold
      }\n`;
    });

    // Recommendations Sheet - Strategic action items
    let recommendationsSheet = "RECOMMENDATIONS & ACTION POINTS\n\n";
    recommendationsSheet +=
      '1,Place orders for products with "Critical" stock status immediately to avoid stockouts.\n';
    recommendationsSheet +=
      "2,Implement promotions for products with approaching expiry dates to minimize potential losses.\n";
    recommendationsSheet +=
      "3,Review slow-moving products and consider adjusted pricing strategies or discontinuation if appropriate.\n";
    recommendationsSheet +=
      "4,Assess inventory turnover rate by category and optimize procurement based on demand patterns.\n";
    recommendationsSheet +=
      "5,Consider adjusting reorder levels for fast-moving products to prevent stockouts during peak demand periods.\n";

    return {
      summarySheet,
      lowStockSheet,
      expiringSheet,
      categorySheet,
      movementSheet,
      recommendationsSheet,
    };
  };

  const handleExport = async (format: string) => {
    try {
      setExporting(true);

      if (format === "excel") {
        // Generate comprehensive Excel/CSV report with multiple data sheets
        const excelData = generateExcelData();
        if (!excelData) {
          throw new Error("Failed to generate report data");
        }

        // Combine all sheets into a multi-section CSV file for spreadsheet import
        let csvContent = excelData.summarySheet + "\n\n";
        csvContent += excelData.lowStockSheet + "\n\n";
        csvContent += excelData.expiringSheet + "\n\n";
        csvContent += excelData.categorySheet + "\n\n";
        csvContent += excelData.movementSheet + "\n\n";
        csvContent += excelData.recommendationsSheet;

        const filename = `roo_herbals_inventory_report_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        const filePath = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(filePath, csvContent);

        // Share the generated file if platform supports it
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        } else {
          Alert.alert(
            "Sharing not available",
            "Sharing is not available on this device"
          );
        }
      } else if (format === "pdf") {
        // Generate professional PDF report with charts and styling
        const html = await generatePdfReport();
        if (!html) {
          throw new Error("Failed to generate PDF content");
        }

        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        // Share the generated PDF if platform supports it
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

  // Initialize component by fetching latest inventory data
  useEffect(() => {
    fetchInventoryReports();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header with back navigation */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory Reports</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Loading indicator with descriptive text */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading inventory reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate business insights for the main dashboard display
  const insights = calculateInsights();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header with navigation and refresh functionality */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory Reports</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchInventoryReports}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Export Controls - Allow users to generate and share comprehensive reports */}
      <View style={styles.exportContainer}>
        <Text style={styles.exportLabel}>Export Inventory Report:</Text>
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

      {/* Export Progress Indicator */}
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
        {/* Executive Dashboard - Key Performance Indicators */}
        {insights && (
          <View style={styles.insightsContainer}>
            {/* Total Inventory Value - Shows overall investment in stock */}
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Total Value</Text>
              <Text style={styles.insightValue}>
                {insights?.totalInventoryValue
                  ? formatCurrencyFn(insights.totalInventoryValue)
                  : "Rs. 0"}
              </Text>
              <Text style={styles.insightDescription}>Inventory worth</Text>
            </View>

            {/* Low Stock Alert Counter - Critical attention indicator */}
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Low Stock Items</Text>
              <Text
                style={[
                  styles.insightValue,
                  (reportData?.lowStockProducts?.length || 0) > 5
                    ? styles.negativeValue // Red if too many low stock items
                    : styles.positiveValue, // Green if manageable
                ]}
              >
                {reportData?.lowStockProducts.length || 0}
              </Text>
              <Text style={styles.insightDescription}>Need attention</Text>
            </View>

            {/* Inventory Turnover Rate - Efficiency metric */}
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Turnover Rate</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights?.inventoryTurnover < 4
                    ? styles.negativeValue // Red if turnover is slow
                    : styles.positiveValue, // Green if healthy turnover
                ]}
              >
                {insights?.inventoryTurnover
                  ? insights.inventoryTurnover.toFixed(1)
                  : "0.0"}
                x
              </Text>
              <Text style={styles.insightDescription}>Annualized</Text>
            </View>

            {/* Expiring Stock Alert - Risk management indicator */}
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Expiring Soon</Text>
              <Text style={styles.insightValue}>
                {reportData?.expiringBatches?.length || 0}
              </Text>
              <Text style={styles.insightDescription}>
                {insights?.expiringStockPercentage > 0
                  ? `${formatCurrencyFn(insights.expiringStockValue)} at risk`
                  : "Within 30 days"}
              </Text>
            </View>
          </View>
        )}

        {/* Low Stock Products Section - Critical reorder management */}
        <Text style={styles.sectionTitle}>Low Stock Products</Text>

        {reportData?.lowStockProducts &&
        reportData.lowStockProducts.length > 0 ? (
          <View style={styles.cardContainer}>
            {reportData.lowStockProducts.map((product) => {
              const stockStatus = getStockStatus(
                product.total_stock,
                product.reorder_level
              );
              // Calculate stock percentage safely to avoid division by zero
              const percentage =
                product.reorder_level > 0
                  ? (product.total_stock / product.reorder_level) * 100
                  : 100;

              return (
                <View key={product.product_id} style={styles.stockCard}>
                  {/* Product header with name and status badge */}
                  <View style={styles.stockCardHeader}>
                    <Text style={styles.stockName}>{product.name}</Text>
                    <View
                      style={[
                        styles.stockStatusBadge,
                        {
                          backgroundColor:
                            stockStatus === "Critical"
                              ? "#FEECEB" // Light red background for critical
                              : stockStatus === "Low"
                              ? "#FFF3CD" // Light yellow for low stock
                              : "#D4EDDA", // Light green for adequate
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockStatusText,
                          {
                            color:
                              stockStatus === "Critical"
                                ? "#DC3545" // Red text for critical
                                : stockStatus === "Low"
                                ? "#FD7E14" // Orange text for low
                                : "#28A745", // Green text for adequate
                          },
                        ]}
                      >
                        {stockStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Stock level indicators showing current vs reorder levels */}
                  <View style={styles.stockLevels}>
                    <View style={styles.stockLevel}>
                      <Text style={styles.stockLevelLabel}>Current</Text>
                      <Text style={styles.stockLevelValue}>
                        {Math.round(product.total_stock)}
                      </Text>
                    </View>
                    <View style={styles.stockLevel}>
                      <Text style={styles.stockLevelLabel}>Reorder</Text>
                      <Text style={styles.stockLevelValue}>
                        {Math.round(product.reorder_level)}
                      </Text>
                    </View>
                    <View style={styles.stockLevel}>
                      <Text style={styles.stockLevelLabel}>Status</Text>
                      <Text
                        style={[
                          styles.stockLevelValue,
                          {
                            color:
                              stockStatus === "Critical"
                                ? "#DC3545"
                                : stockStatus === "Low"
                                ? "#FD7E14"
                                : "#28A745",
                          },
                        ]}
                      >
                        {Math.round(percentage)}%
                      </Text>
                    </View>
                  </View>

                  {/* Visual progress bar showing stock status */}
                  <View style={styles.stockProgressContainer}>
                    <ProgressBar
                      progress={Math.min(Math.max(percentage / 100, 0), 1)}
                      color={
                        stockStatus === "Critical"
                          ? "#DC3545"
                          : stockStatus === "Low"
                          ? "#FD7E14"
                          : "#28A745"
                      }
                      style={styles.stockProgress}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          // Empty state when no low stock products found
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No low stock products</Text>
          </View>
        )}

        {/* Expiring Batches Section - Risk management for product freshness */}
        <Text style={styles.sectionTitle}>Expiring Batches</Text>

        {reportData?.expiringBatches &&
        reportData.expiringBatches.length > 0 ? (
          <View style={styles.cardContainer}>
            {reportData.expiringBatches.map((batch) => {
              const daysLeft = getDaysUntilExpiry(batch.expiry_date);

              return (
                <View key={batch.batch_id} style={styles.batchCard}>
                  {/* Batch header with product name and urgency indicator */}
                  <View style={styles.batchCardHeader}>
                    <Text style={styles.batchName}>{batch.product_name}</Text>
                    <Text
                      style={[
                        styles.batchDaysLeft,
                        {
                          color:
                            daysLeft <= 7
                              ? "#DC3545" // Red for urgent (≤7 days)
                              : daysLeft <= 15
                              ? "#FD7E14" // Orange for warning (8-15 days)
                              : "#28A745", // Green for safe (>15 days)
                        },
                      ]}
                    >
                      {daysLeft} days left
                    </Text>
                  </View>

                  {/* Batch details with icons for better readability */}
                  <View style={styles.batchDetails}>
                    <View style={styles.batchDetailItem}>
                      <MaterialCommunityIcons
                        name="barcode"
                        size={16}
                        color="#6c757d"
                      />
                      <Text style={styles.batchDetailText}>
                        Batch: {batch.batch_number}
                      </Text>
                    </View>
                    <View style={styles.batchDetailItem}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color="#6c757d"
                      />
                      <Text style={styles.batchDetailText}>
                        Expires: {formatDate(batch.expiry_date)}
                      </Text>
                    </View>
                    <View style={styles.batchDetailItem}>
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={16}
                        color="#6c757d"
                      />
                      <Text style={styles.batchDetailText}>
                        Quantity: {batch.current_quantity}
                      </Text>
                    </View>
                  </View>

                  {/* Action button for creating promotions to move expiring stock */}
                  <TouchableOpacity style={styles.promotionButton}>
                    <Text style={styles.promotionButtonText}>
                      Create Promotion
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clock-alert"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No batches expiring soon</Text>
          </View>
        )}

        {/* Inventory by Category Section - Portfolio analysis and distribution */}
        <Text style={styles.sectionTitle}>Inventory by Category</Text>

        {reportData?.stockByCategory &&
        reportData.stockByCategory.length > 0 &&
        insights ? (
          <View style={styles.categoryContainer}>
            {insights.categoryDistribution.map((category) => (
              <View key={category.name} style={styles.categoryCard}>
                {/* Category header with name and percentage of total inventory */}
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryPercentage}>
                    {Math.round(category.percentage)}%
                  </Text>
                </View>

                {/* Visual progress bar showing category's share of total inventory */}
                <View style={styles.categoryProgressContainer}>
                  <View
                    style={[
                      styles.categoryProgress,
                      {
                        width: `${Math.min(
                          Math.round(category.percentage),
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>

                {/* Category value display */}
                <View style={styles.categoryValue}>
                  <Text style={styles.categoryValueText}>
                    {formatCurrencyFn(category.value)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          // Empty state when no category data available
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chart-pie"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No category data available</Text>
          </View>
        )}

        {/* Product Movement Analysis - Sales velocity and performance tracking */}
        <View style={styles.movementContainer}>
          {/* Top Moving Products - Best performing items */}
          <View style={styles.movementSection}>
            <Text style={styles.sectionTitle}>Top Moving Products</Text>

            {reportData?.topMovingProducts &&
            reportData.topMovingProducts.length > 0 ? (
              <View style={styles.movementCardContainer}>
                {reportData.topMovingProducts
                  .slice(0, 3)
                  .map((product, index) => (
                    <View key={product.product_id} style={styles.movementCard}>
                      {/* Rank indicator showing product position */}
                      <View style={styles.movementRankContainer}>
                        <Text style={styles.movementRank}>{index + 1}</Text>
                      </View>

                      {/* Product information with sales data */}
                      <View style={styles.movementInfo}>
                        <Text style={styles.movementName}>{product.name}</Text>
                        <Text style={styles.movementQuantity}>
                          {product.quantity_sold} units sold in last 30 days
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="package-up"
                  size={40}
                  color="#ADB5BD"
                />
                <Text style={styles.emptyText}>
                  No top moving products data
                </Text>
              </View>
            )}
          </View>

          {/* Slow Moving Products - Items that need attention or promotion */}
          <View style={styles.movementSection}>
            <Text style={styles.sectionTitle}>Slow Moving Products</Text>

            {reportData?.slowMovingProducts &&
            reportData.slowMovingProducts.length > 0 ? (
              <View style={styles.movementCardContainer}>
                {reportData.slowMovingProducts.slice(0, 3).map((product) => (
                  <View key={product.product_id} style={styles.movementCard}>
                    {/* Warning icon indicating underperformance */}
                    <View
                      style={[
                        styles.movementRankContainer,
                        { backgroundColor: "#FD7E14" },
                      ]}
                    >
                      <MaterialIcons
                        name="trending-down"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>

                    {/* Product information showing low sales performance */}
                    <View style={styles.movementInfo}>
                      <Text style={styles.movementName}>{product.name}</Text>
                      <Text style={styles.movementQuantity}>
                        Only {product.quantity_sold} units sold in last 30 days
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="package-down"
                  size={40}
                  color="#ADB5BD"
                />
                <Text style={styles.emptyText}>
                  No slow moving products data
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Recommendations Section */}
        {insights && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <View style={styles.recommendationCard}>
              {(reportData?.lowStockProducts?.length || 0) > 0 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#FEECEB" },
                    ]}
                  >
                    <MaterialIcons name="error" size={20} color="#DC3545" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Restock Critical Items
                    </Text>
                    <Text style={styles.recommendationText}>
                      {reportData?.lowStockProducts?.filter(
                        (p) => p.total_stock <= p.reorder_level * 0.25
                      )?.length || 0}
                      {
                        " products are at critical stock levels and need immediate attention."
                      }
                    </Text>
                  </View>
                </View>
              )}
              {(reportData?.expiringBatches?.length || 0) > 0 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#FFF3CD" },
                    ]}
                  >
                    <MaterialIcons name="schedule" size={20} color="#FD7E14" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Manage Expiring Stock
                    </Text>
                    <Text style={styles.recommendationText}>
                      {reportData?.expiringBatches?.filter(
                        (b) => getDaysUntilExpiry(b.expiry_date) <= 15
                      )?.length || 0}
                      {
                        " batches are expiring within 15 days. Consider promotions to move this inventory."
                      }
                    </Text>
                  </View>
                </View>
              )}
              {insights.inventoryTurnover < 4 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D1ECF1" },
                    ]}
                  >
                    <MaterialIcons
                      name="trending-up"
                      size={20}
                      color="#17A2B8"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Improve Inventory Turnover
                    </Text>
                    <Text style={styles.recommendationText}>
                      {"Current turnover rate is "}
                      {insights.inventoryTurnover.toFixed(1)}
                      {
                        "x. Industry standard is 4-6x. Consider reviewing procurement strategy."
                      }
                    </Text>
                  </View>
                </View>
              )}
              {(reportData?.slowMovingProducts?.length || 0) > 0 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D1ECF1" },
                    ]}
                  >
                    <MaterialIcons
                      name="trending-down"
                      size={20}
                      color="#17A2B8"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Address Slow-Moving Items
                    </Text>
                    <Text style={styles.recommendationText}>
                      {
                        "Consider special promotions or discounts for slow-moving products to free up capital and storage space."
                      }
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
                  <MaterialIcons name="assessment" size={20} color="#28A745" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>
                    Optimize Category Balance
                  </Text>
                  <Text style={styles.recommendationText}>
                    {insights.mostValuableCategory?.name || "Top category"}
                    {" represents "}
                    {Math.round(insights.mostValuableCategory?.percentage || 0)}
                    {
                      "% of total inventory value. Ensure balanced stock distribution."
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacer to ensure content doesn't get hidden behind tab navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Get device dimensions for responsive design
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  // Main container and layout styles
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background for better contrast
  },

  // Header navigation styling with brand colors
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
    fontWeight: "700", // Bold title for better readability
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center", // Sufficient touch target size for accessibility
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center", // Sufficient touch target size for accessibility
  },

  // Main content container with proper spacing
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90, // Extra padding to avoid overlap with bottom navigation
  },

  // Export functionality styling
  exportContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF", // Subtle border for section separation
  },
  exportLabel: {
    fontSize: 14,
    color: "#6c757d", // Muted text color for labels
    fontWeight: "500",
  },
  exportButtons: {
    flexDirection: "row",
    gap: 10, // Consistent spacing between buttons
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DEE2E6", // Subtle border for button definition
  },
  exportButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#495057", // Dark gray for good contrast
  },
  exportingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#FFF9DB", // Light yellow background for loading state
  },
  exportingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6c757d", // Muted text for secondary information
  },

  // Executive dashboard insight cards - responsive grid layout
  insightsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  insightCard: {
    width: (width - 40) / 2, // Responsive width for 2-column layout
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000", // Subtle shadow for card elevation
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Android shadow
  },
  insightLabel: {
    fontSize: 14,
    color: "#6c757d", // Muted color for labels
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: "700", // Bold emphasis for key metrics
    color: COLORS.dark,
    marginBottom: 2,
  },
  positiveValue: {
    color: "#28A745", // Green for positive indicators
  },
  negativeValue: {
    color: "#DC3545", // Red for negative indicators
  },
  insightDescription: {
    fontSize: 12,
    color: "#ADB5BD", // Very muted for supplementary text
  },

  // Section headers and content organization
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700", // Bold section headers for hierarchy
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
  },
  cardContainer: {
    marginBottom: 16, // Consistent spacing between sections
  },
  stockCard: {
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
  stockCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stockName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stockLevels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stockLevel: {
    alignItems: "center",
  },
  stockLevelLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  stockLevelValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  stockProgressContainer: {
    marginBottom: 12,
  },
  stockProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E9ECEF",
  },
  orderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  orderButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  batchCard: {
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
  batchCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  batchName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    flex: 1,
  },
  batchDaysLeft: {
    fontSize: 14,
    fontWeight: "700",
  },
  batchDetails: {
    marginBottom: 12,
  },
  batchDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  batchDetailText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 6,
  },
  promotionButton: {
    backgroundColor: "#FD7E14",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  promotionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryCard: {
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
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  categoryPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  categoryProgressContainer: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryProgress: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  categoryValue: {
    alignItems: "flex-end",
  },
  categoryValueText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  movementContainer: {
    marginBottom: 16,
  },
  movementSection: {
    marginBottom: 16,
  },
  movementCardContainer: {
    marginBottom: 8,
  },
  movementCard: {
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
  movementRankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  movementRank: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  movementInfo: {
    flex: 1,
  },
  movementName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 2,
  },
  movementQuantity: {
    fontSize: 14,
    color: "#6c757d",
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
