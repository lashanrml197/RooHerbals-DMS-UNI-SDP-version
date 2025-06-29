// app/(reports)/top-products.tsx

import {
  AntDesign,
  Feather,
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
import { getInventoryReports, getSalesReports } from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define types for product reports data
interface Product {
  product_id: string;
  name: string;
  total_quantity: number;
  total_sales: number;
}

interface LowStockProduct {
  product_id: string;
  name: string;
  reorder_level: number;
  total_stock: number;
}

interface ExpiringBatch {
  batch_id: string;
  batch_number: string;
  product_name: string;
  expiry_date: string;
  current_quantity: number;
}

interface ProductMovement {
  product_id: string;
  name: string;
  quantity_sold: number;
}

interface ProductReportData {
  salesByProduct: Product[];
  lowStockProducts: LowStockProduct[];
  expiringBatches: ExpiringBatch[];
  topMovingProducts: ProductMovement[];
  slowMovingProducts: ProductMovement[];
}

export default function TopProductsScreen() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [productData, setProductData] = useState<ProductReportData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Format currency
  const formatCurrencyFn = (amount: number): string => {
    return `Rs. ${amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Calculate inventory health percentage
  const calculateInventoryHealth = (
    stock: number,
    reorderLevel: number
  ): number => {
    if (reorderLevel === 0) return 100;
    const ratio = stock / reorderLevel;
    // Cap at 200% for visual purposes
    return Math.min(ratio * 100, 200);
  };

  // Format date
  const formatDateFn = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryDateStr);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate product insights
  const calculateInsights = () => {
    if (!productData) return null;

    // Find top selling product
    const topSellingProduct =
      productData.salesByProduct.length > 0
        ? productData.salesByProduct[0]
        : null;

    // Calculate total sales from all products
    const totalSales = productData.salesByProduct.reduce(
      (sum, product) => sum + product.total_sales,
      0
    );

    // Calculate percentage of sales for top product
    const topProductSalesPercentage =
      topSellingProduct && totalSales > 0
        ? (topSellingProduct.total_sales / totalSales) * 100
        : 0;

    // Count critical stock items
    const criticalStockCount = productData.lowStockProducts.filter(
      (product) => product.total_stock < product.reorder_level * 0.5
    ).length;

    // Find soonest expiring product
    const soonestExpiringProduct =
      productData.expiringBatches.length > 0
        ? productData.expiringBatches.reduce((prev, current) => {
            return getDaysUntilExpiry(prev.expiry_date) <
              getDaysUntilExpiry(current.expiry_date)
              ? prev
              : current;
          })
        : null;

    // Calculate days to soonest expiry
    const daysToSoonestExpiry = soonestExpiringProduct
      ? getDaysUntilExpiry(soonestExpiringProduct.expiry_date)
      : null;

    // Calculate slow-moving inventory value
    // (In a real app, you'd have cost data for each product)
    const slowMovingCount = productData.slowMovingProducts.length;

    // Calculate total products in low stock
    const lowStockCount = productData.lowStockProducts.length;

    // Calculate average stock levels (as percentage of reorder level)
    const avgStockHealth =
      productData.lowStockProducts.length > 0
        ? (productData.lowStockProducts.reduce(
            (sum, product) => sum + product.total_stock / product.reorder_level,
            0
          ) /
            productData.lowStockProducts.length) *
          100
        : 0;

    return {
      topSellingProduct,
      topProductSalesPercentage,
      criticalStockCount,
      soonestExpiringProduct,
      daysToSoonestExpiry,
      slowMovingCount,
      lowStockCount,
      avgStockHealth,
    };
  };

  // Fetch product data
  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch product sales data
      const salesData = await getSalesReports();

      // Fetch inventory data
      const inventoryData = await getInventoryReports();

      // Combine the data
      setProductData({
        salesByProduct: salesData.salesByProduct || [],
        lowStockProducts: inventoryData.lowStockProducts || [],
        expiringBatches: inventoryData.expiringBatches || [],
        topMovingProducts: inventoryData.topMovingProducts || [],
        slowMovingProducts: inventoryData.slowMovingProducts || [],
      });
    } catch (err: any) {
      console.error("Failed to fetch product data:", err);
      setError(err.message || "Failed to load product data");
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the product data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF report
  const generatePdfReport = async () => {
    if (!productData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format date for report title
    const today = new Date();
    const formattedDate = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;

    // Generate top selling products table
    let topProductsHtml = "";
    productData.salesByProduct.slice(0, 10).forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      topProductsHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${index + 1}</td>
          <td>${product.name}</td>
          <td>${product.total_quantity}</td>
          <td>Rs. ${product.total_sales.toLocaleString()}</td>
          <td>${
            totalSales > 0
              ? Math.round((product.total_sales / totalSales) * 100)
              : 0
          }%</td>
        </tr>
      `;
    });

    // Generate low stock products table
    let lowStockHtml = "";
    productData.lowStockProducts.forEach((product, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const stockPercentage = Math.round(
        (product.total_stock / product.reorder_level) * 100
      );
      const stockColor =
        stockPercentage < 50
          ? "#dc3545"
          : stockPercentage < 75
          ? "#fd7e14"
          : "#28a745";

      lowStockHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${product.name}</td>
          <td>${product.total_stock}</td>
          <td>${product.reorder_level}</td>
          <td style="color: ${stockColor}; font-weight: bold;">${stockPercentage}%</td>
        </tr>
      `;
    });

    // Generate expiring batches table
    let expiringBatchesHtml = "";
    productData.expiringBatches.forEach((batch, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
      const daysToExpiry = getDaysUntilExpiry(batch.expiry_date);
      const expiryColor =
        daysToExpiry < 7
          ? "#dc3545"
          : daysToExpiry < 15
          ? "#fd7e14"
          : "#28a745";

      expiringBatchesHtml += `
        <tr style="background-color: ${bgColor}">
          <td>${batch.product_name}</td>
          <td>${batch.batch_number}</td>
          <td>${formatDateFn(batch.expiry_date)}</td>
          <td style="color: ${expiryColor}; font-weight: bold;">${daysToExpiry} days</td>
          <td>${batch.current_quantity}</td>
        </tr>
      `;
    });

    // Calculate total sales for reference
    const totalSales = productData.salesByProduct.reduce(
      (sum, product) => sum + product.total_sales,
      0
    );

    // Create the HTML template for the PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product Performance Report - Roo Herbals</title>
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
        </head>
        <body>
          <div class="header">
            <h1>Roo Herbals Pvt Ltd</h1>
            <h2>Product Performance Report</h2>
            <p>Generated on: ${formattedDate}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive analysis of product performance, inventory status, and sales trends. Use these insights to optimize inventory management and improve product strategies.</p>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Products in Low Stock</p>
                <p class="insight-value">${insights.lowStockCount}</p>
                <p class="insight-trend ${
                  insights.criticalStockCount > 0 ? "trend-down" : "trend-up"
                }">
                  ${
                    insights.criticalStockCount > 0
                      ? `⚠️ ${insights.criticalStockCount} critical`
                      : "✓ Healthy"
                  }
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Inventory Health</p>
                <p class="insight-value">${Math.round(
                  insights.avgStockHealth
                )}%</p>
                <p class="insight-trend ${
                  insights.avgStockHealth > 100 ? "trend-up" : "trend-down"
                }">
                  ${
                    insights.avgStockHealth > 100
                      ? "↑ Above reorder levels"
                      : "↓ Below reorder levels"
                  }
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Top Product Sales</p>
                <p class="insight-value">${Math.round(
                  insights.topProductSalesPercentage
                )}%</p>
                <p class="insight-trend">
                  Of total sales
                </p>
              </div>
              
              ${
                insights.daysToSoonestExpiry !== null
                  ? `
              <div class="insight-card">
                <p class="insight-title">Earliest Expiry</p>
                <p class="insight-value">${
                  insights.daysToSoonestExpiry
                } days</p>
                <p class="insight-trend ${
                  insights.daysToSoonestExpiry < 15 ? "trend-down" : "trend-up"
                }">
                  ${
                    insights.daysToSoonestExpiry < 15
                      ? "⚠️ Action needed"
                      : "✓ All good"
                  }
                </p>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <div class="section">
            <h2>Top Selling Products</h2>
            <p>These products represent your highest revenue generators. Focus on maintaining optimal stock levels for these items to maximize sales.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Total Sales</th>
                  <th>% of Sales</th>
                </tr>
              </thead>
              <tbody>
                ${topProductsHtml}
              </tbody>
            </table>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Top Selling Product</p>
                <p class="insight-value">${
                  insights.topSellingProduct?.name || "N/A"
                }</p>
                <p class="insight-trend">Rs. ${
                  insights.topSellingProduct?.total_sales.toLocaleString() || 0
                }</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Inventory Status</h2>
            <p>Monitoring inventory levels helps prevent stockouts and optimize ordering.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Stock Health</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockHtml}
              </tbody>
            </table>
            
            ${
              insights.criticalStockCount > 0
                ? `
              <div class="recommendations">
                <h3>Low Stock Alert</h3>
                <p>There are <span class="risk-high">${insights.criticalStockCount} products</span> with critically low stock levels (below 50% of reorder level).</p>
                <p>Recommended action: Place orders for these products immediately to prevent stockouts.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Expiring Batches</h2>
            <p>Tracking batch expiry dates helps minimize wastage and ensure product quality.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${expiringBatchesHtml}
              </tbody>
            </table>
            
            ${
              insights.soonestExpiringProduct &&
              insights.daysToSoonestExpiry &&
              insights.daysToSoonestExpiry < 15
                ? `
              <div class="recommendations">
                <h3>Expiry Alert</h3>
                <p><strong>${insights.soonestExpiringProduct.product_name}</strong> batch ${insights.soonestExpiringProduct.batch_number} will expire in <span class="risk-high">${insights.daysToSoonestExpiry} days</span>.</p>
                <p>Recommended action: Consider promotional offers to sell these products before expiry.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Product Movement Analysis</h2>
            <p>Understanding product movement helps optimize inventory planning and marketing strategies.</p>
            
            <div class="insights-container">
              <div class="insight-card" style="flex: 1;">
                <p class="insight-title">Fast Moving Products</p>
                <ul>
                  ${productData.topMovingProducts
                    .slice(0, 5)
                    .map(
                      (product) =>
                        `<li>${product.name} (${product.quantity_sold} units)</li>`
                    )
                    .join("")}
                </ul>
              </div>
              
              <div class="insight-card" style="flex: 1;">
                <p class="insight-title">Slow Moving Products</p>
                <ul>
                  ${productData.slowMovingProducts
                    .slice(0, 5)
                    .map(
                      (product) =>
                        `<li>${product.name} (${product.quantity_sold} units)</li>`
                    )
                    .join("")}
                </ul>
              </div>
            </div>
            
            ${
              insights.slowMovingCount > 0
                ? `
              <div class="recommendations">
                <h3>Slow Moving Inventory Alert</h3>
                <p>There are ${insights.slowMovingCount} products with low sales movement in the last 30 days.</p>
                <p>Recommended action: Consider bundling these products with fast-moving items or offering special discounts to increase their movement.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Recommendations & Action Points</h2>
            <ul>
              <li>Maintain optimal stock levels for top-selling products to prevent revenue loss from stockouts.</li>
              <li>Place orders immediately for products with critically low stock levels.</li>
              <li>Create promotional campaigns for products with approaching expiry dates.</li>
              <li>Review slow-moving inventory and consider special sales strategies to reduce holding costs.</li>
              <li>Analyze seasonal trends to adjust inventory levels and prevent overstocking.</li>
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

  // Generate Excel report data
  const generateExcelData = () => {
    if (!productData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Calculate total sales for reference
    const totalSales = productData.salesByProduct.reduce(
      (sum, product) => sum + product.total_sales,
      0
    );

    // Sheet 1: Executive Summary
    let summarySheet = "Roo Herbals - Product Performance Report\n";
    summarySheet += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    summarySheet += "EXECUTIVE SUMMARY\n\n";
    summarySheet += `Products in Low Stock,${insights.lowStockCount}\n`;
    summarySheet += `Products with Critical Stock Levels,${insights.criticalStockCount}\n`;
    summarySheet += `Average Inventory Health,${Math.round(
      insights.avgStockHealth
    )}%\n`;
    summarySheet += `Top Product Sales Percentage,${Math.round(
      insights.topProductSalesPercentage
    )}%\n`;
    summarySheet += `Slow Moving Products,${insights.slowMovingCount}\n`;
    if (insights.daysToSoonestExpiry !== null) {
      summarySheet += `Days to Earliest Expiry,${insights.daysToSoonestExpiry}\n`;
    }
    summarySheet += "\n";

    // Sheet 2: Top Selling Products
    let topProductsSheet = "TOP SELLING PRODUCTS\n\n";
    topProductsSheet +=
      "Rank,Product Name,Quantity Sold,Total Sales,% of Sales\n";

    productData.salesByProduct.forEach((product, index) => {
      const salesPercentage =
        totalSales > 0 ? (product.total_sales / totalSales) * 100 : 0;
      topProductsSheet += `${index + 1},${product.name.replace(/,/g, " ")},${
        product.total_quantity
      },${product.total_sales},${Math.round(salesPercentage)}%\n`;
    });

    // Sheet 3: Inventory Status
    let inventorySheet = "INVENTORY STATUS\n\n";
    inventorySheet +=
      "Product Name,Current Stock,Reorder Level,Stock Health %,Status\n";

    productData.lowStockProducts.forEach((product) => {
      const stockHealthPercent =
        (product.total_stock / product.reorder_level) * 100;
      let status = "Normal";

      if (stockHealthPercent < 50) {
        status = "Critical";
      } else if (stockHealthPercent < 100) {
        status = "Low";
      }

      inventorySheet += `${product.name.replace(/,/g, " ")},${
        product.total_stock
      },${product.reorder_level},${Math.round(
        stockHealthPercent
      )}%,${status}\n`;
    });

    // Sheet 4: Expiring Batches
    let expirySheet = "EXPIRING BATCHES\n\n";
    expirySheet +=
      "Product Name,Batch Number,Expiry Date,Days Remaining,Quantity\n";

    productData.expiringBatches.forEach((batch) => {
      const daysRemaining = getDaysUntilExpiry(batch.expiry_date);
      expirySheet += `${batch.product_name.replace(/,/g, " ")},${
        batch.batch_number
      },${formatDateFn(batch.expiry_date)},${daysRemaining},${
        batch.current_quantity
      }\n`;
    });

    // Sheet 5: Product Movement
    let movementSheet = "PRODUCT MOVEMENT ANALYSIS\n\n";
    movementSheet += "TOP MOVING PRODUCTS\n";
    movementSheet += "Product Name,Quantity Sold\n";

    productData.topMovingProducts.forEach((product) => {
      movementSheet += `${product.name.replace(/,/g, " ")},${
        product.quantity_sold
      }\n`;
    });

    movementSheet += "\nSLOW MOVING PRODUCTS\n";
    movementSheet += "Product Name,Quantity Sold\n";

    productData.slowMovingProducts.forEach((product) => {
      movementSheet += `${product.name.replace(/,/g, " ")},${
        product.quantity_sold
      }\n`;
    });

    // Sheet 6: Recommendations
    let recommendationsSheet = "RECOMMENDATIONS & ACTION POINTS\n\n";
    recommendationsSheet +=
      "1,Maintain optimal stock levels for top-selling products to prevent revenue loss from stockouts.\n";
    recommendationsSheet +=
      "2,Place orders immediately for products with critically low stock levels.\n";
    recommendationsSheet +=
      "3,Create promotional campaigns for products with approaching expiry dates.\n";
    recommendationsSheet +=
      "4,Review slow-moving inventory and consider special sales strategies to reduce holding costs.\n";
    recommendationsSheet +=
      "5,Analyze seasonal trends to adjust inventory levels and prevent overstocking.\n";

    return {
      summarySheet,
      topProductsSheet,
      inventorySheet,
      expirySheet,
      movementSheet,
      recommendationsSheet,
    };
  };

  // Export product data
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
        csvContent += excelData.topProductsSheet + "\n\n";
        csvContent += excelData.inventorySheet + "\n\n";
        csvContent += excelData.expirySheet + "\n\n";
        csvContent += excelData.movementSheet + "\n\n";
        csvContent += excelData.recommendationsSheet;

        const filename = `roo_herbals_product_performance_${
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
    fetchProductData();
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
          <Text style={styles.headerTitle}>Top Products</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading product data...</Text>
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
        <Text style={styles.headerTitle}>Top Products</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchProductData}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Export Actions - Removed View Toggle */}
      <View style={styles.actionsContainer}>
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
              <Text style={styles.insightLabel}>Low Stock</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.criticalStockCount > 0
                    ? styles.negativeValue
                    : styles.positiveValue,
                ]}
              >
                {insights.lowStockCount}
              </Text>
              <Text style={styles.insightDescription}>Products</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Stock Health</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.avgStockHealth > 100
                    ? styles.positiveValue
                    : styles.negativeValue,
                ]}
              >
                {Math.round(insights.avgStockHealth)}%
              </Text>
              <Text style={styles.insightDescription}>Average level</Text>
            </View>

            {insights.daysToSoonestExpiry !== null && (
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Nearest Expiry</Text>
                <Text
                  style={[
                    styles.insightValue,
                    insights.daysToSoonestExpiry > 30
                      ? styles.positiveValue
                      : insights.daysToSoonestExpiry > 15
                      ? styles.warningValue
                      : styles.negativeValue,
                  ]}
                >
                  {insights.daysToSoonestExpiry}
                </Text>
                <Text style={styles.insightDescription}>Days remaining</Text>
              </View>
            )}

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Slow Moving</Text>
              <Text style={styles.insightValue}>
                {insights.slowMovingCount}
              </Text>
              <Text style={styles.insightDescription}>Products</Text>
            </View>
          </View>
        )}

        {/* Top Selling Products - Always using list view */}
        <Text style={styles.sectionTitle}>Top Selling Products</Text>

        {productData?.salesByProduct &&
        productData.salesByProduct.length > 0 ? (
          <View style={styles.productsContainer}>
            <View style={styles.productsList}>
              {productData.salesByProduct.slice(0, 10).map((product, index) => (
                <View key={product.product_id} style={styles.productListItem}>
                  <View style={styles.productListRank}>
                    <Text style={styles.productListRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.productListDetails}>
                    <Text style={styles.productListName}>{product.name}</Text>
                    <View style={styles.productListStats}>
                      <View style={styles.productListStat}>
                        <Feather name="box" size={14} color="#6c757d" />
                        <Text style={styles.productListStatText}>
                          {product.total_quantity} units
                        </Text>
                      </View>
                      <View style={styles.productListStat}>
                        <Text style={styles.productListStatText}>
                          {formatCurrencyFn(product.total_sales)}
                        </Text>
                      </View>
                      <View style={styles.productListStat}>
                        <AntDesign name="piechart" size={14} color="#6c757d" />
                        <Text style={styles.productListStatText}>
                          {Math.round(
                            (product.total_sales /
                              (productData?.salesByProduct.reduce(
                                (sum, p) => sum + p.total_sales,
                                0
                              ) || 1)) *
                              100
                          )}
                          % of sales
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
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

        {/* Low Stock Products */}
        <Text style={styles.sectionTitle}>Low Stock Products</Text>

        {productData?.lowStockProducts &&
        productData.lowStockProducts.length > 0 ? (
          <View style={styles.lowStockContainer}>
            {productData.lowStockProducts.slice(0, 5).map((product) => {
              const stockHealth = calculateInventoryHealth(
                product.total_stock,
                product.reorder_level
              );
              let stockStatusColor = "#28A745";

              if (stockHealth < 50) {
                stockStatusColor = "#DC3545";
              } else if (stockHealth < 100) {
                stockStatusColor = "#FFC107";
              }

              return (
                <View key={product.product_id} style={styles.lowStockItem}>
                  <View style={styles.lowStockDetails}>
                    <Text style={styles.lowStockName}>{product.name}</Text>
                    <View style={styles.lowStockStats}>
                      <Text style={styles.lowStockCurrentText}>
                        Current:{" "}
                        <Text style={{ fontWeight: "bold" }}>
                          {product.total_stock}
                        </Text>
                      </Text>
                      <Text style={styles.lowStockReorderText}>
                        Reorder at:{" "}
                        <Text style={{ fontWeight: "bold" }}>
                          {product.reorder_level}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lowStockStatus}>
                    <View style={styles.lowStockProgressContainer}>
                      <ProgressBar
                        progress={Math.min(stockHealth / 200, 1)}
                        color={stockStatusColor}
                        style={styles.lowStockProgress}
                      />
                    </View>
                    <Text
                      style={[
                        styles.lowStockPercentage,
                        { color: stockStatusColor },
                      ]}
                    >
                      {Math.round(stockHealth)}%
                    </Text>
                  </View>
                </View>
              );
            })}

            {productData.lowStockProducts.length > 5 && (
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>
                  View {productData.lowStockProducts.length - 5} more
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No low stock products found</Text>
          </View>
        )}

        {/* Expiring Batches */}
        <Text style={styles.sectionTitle}>Expiring Batches</Text>

        {productData?.expiringBatches &&
        productData.expiringBatches.length > 0 ? (
          <View style={styles.expiringContainer}>
            {productData.expiringBatches.slice(0, 5).map((batch) => {
              const daysToExpiry = getDaysUntilExpiry(batch.expiry_date);
              let expiryStatusColor = "#28A745";

              if (daysToExpiry < 7) {
                expiryStatusColor = "#DC3545";
              } else if (daysToExpiry < 15) {
                expiryStatusColor = "#FFC107";
              }

              return (
                <View key={batch.batch_id} style={styles.expiringItem}>
                  <View style={styles.expiringDetails}>
                    <Text style={styles.expiringName}>
                      {batch.product_name}
                    </Text>
                    <Text style={styles.expiringBatchNumber}>
                      Batch: {batch.batch_number}
                    </Text>
                    <View style={styles.expiringStats}>
                      <View style={styles.expiringStat}>
                        <Feather name="calendar" size={14} color="#6c757d" />
                        <Text style={styles.expiringStatText}>
                          Expires: {formatDateFn(batch.expiry_date)}
                        </Text>
                      </View>
                      <View style={styles.expiringStat}>
                        <Feather name="box" size={14} color="#6c757d" />
                        <Text style={styles.expiringStatText}>
                          Qty: {batch.current_quantity}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.expiryBadge,
                      { backgroundColor: expiryStatusColor + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.expiryDaysText,
                        { color: expiryStatusColor },
                      ]}
                    >
                      {daysToExpiry} days
                    </Text>
                  </View>
                </View>
              );
            })}

            {productData.expiringBatches.length > 5 && (
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>
                  View {productData.expiringBatches.length - 5} more
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No batches expiring soon</Text>
          </View>
        )}

        {/* Product Movement Analysis */}
        <Text style={styles.sectionTitle}>Product Movement</Text>

        <View style={styles.movementContainer}>
          {/* Fast Moving Products */}
          <View style={styles.movementSection}>
            <View style={styles.movementHeader}>
              <View
                style={[styles.movementIcon, { backgroundColor: "#D4EDDA" }]}
              >
                <MaterialIcons name="trending-up" size={20} color="#28A745" />
              </View>
              <Text style={styles.movementTitle}>Fast Moving</Text>
            </View>

            {productData?.topMovingProducts &&
            productData.topMovingProducts.length > 0 ? (
              <View style={styles.movementList}>
                {productData.topMovingProducts
                  .slice(0, 5)
                  .map((product, index) => (
                    <View key={product.product_id} style={styles.movementItem}>
                      <Text style={styles.movementItemName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.movementItemValue}>
                        {product.quantity_sold} units
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <Text style={styles.movementEmptyText}>No data available</Text>
            )}
          </View>

          {/* Slow Moving Products */}
          <View style={styles.movementSection}>
            <View style={styles.movementHeader}>
              <View
                style={[styles.movementIcon, { backgroundColor: "#F8D7DA" }]}
              >
                <MaterialIcons name="trending-down" size={20} color="#DC3545" />
              </View>
              <Text style={styles.movementTitle}>Slow Moving</Text>
            </View>

            {productData?.slowMovingProducts &&
            productData.slowMovingProducts.length > 0 ? (
              <View style={styles.movementList}>
                {productData.slowMovingProducts
                  .slice(0, 5)
                  .map((product, index) => (
                    <View key={product.product_id} style={styles.movementItem}>
                      <Text style={styles.movementItemName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.movementItemValue}>
                        {product.quantity_sold} units
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <Text style={styles.movementEmptyText}>No data available</Text>
            )}
          </View>
        </View>

        {/* Recommendations */}
        {insights && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Recommendations</Text>

            <View style={styles.recommendationCard}>
              {insights.criticalStockCount > 0 && (
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
                      Order low stock items
                    </Text>
                    <Text style={styles.recommendationText}>
                      {insights.criticalStockCount} products have critically low
                      stock levels.
                    </Text>
                  </View>
                </View>
              )}

              {insights.daysToSoonestExpiry !== null &&
                insights.daysToSoonestExpiry < 15 && (
                  <View style={styles.recommendation}>
                    <View
                      style={[
                        styles.recommendationIcon,
                        { backgroundColor: "#FFF3CD" },
                      ]}
                    >
                      <MaterialIcons
                        name="event-busy"
                        size={20}
                        color="#FFC107"
                      />
                    </View>
                    <View style={styles.recommendationContent}>
                      <Text style={styles.recommendationTitle}>
                        Address expiring batches
                      </Text>
                      <Text style={styles.recommendationText}>
                        Promote products that will expire in{" "}
                        {insights.daysToSoonestExpiry} days.
                      </Text>
                    </View>
                  </View>
                )}

              {insights.slowMovingCount > 0 && (
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
                      Boost slow moving products
                    </Text>
                    <Text style={styles.recommendationText}>
                      Consider bundling or discounting{" "}
                      {insights.slowMovingCount} slow moving products.
                    </Text>
                  </View>
                </View>
              )}

              {insights.topSellingProduct && (
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
                      Focus on top performers
                    </Text>
                    <Text style={styles.recommendationText}>
                      Ensure optimal stock levels for{" "}
                      {insights.topSellingProduct.name}, your best seller.
                    </Text>
                  </View>
                </View>
              )}
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
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  bottomSpacer: {
    height: 60,
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
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end", // Changed from space-between to flex-end
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
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
    fontSize: 13,
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
  warningValue: {
    color: "#FFC107",
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
  productsContainer: {
    marginBottom: 16,
  },
  productsList: {
    marginBottom: 16,
  },
  productListItem: {
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
  productListRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productListRankText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  productListDetails: {
    flex: 1,
  },
  productListName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  productListStats: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  productListStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  productListStatText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 4,
  },
  lowStockContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lowStockItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  lowStockDetails: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  lowStockStats: {
    flexDirection: "row",
  },
  lowStockCurrentText: {
    fontSize: 13,
    color: "#6c757d",
    marginRight: 16,
  },
  lowStockReorderText: {
    fontSize: 13,
    color: "#6c757d",
  },
  lowStockStatus: {
    alignItems: "flex-end",
  },
  lowStockProgressContainer: {
    width: 80,
    marginBottom: 4,
  },
  lowStockProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E9ECEF",
  },
  lowStockPercentage: {
    fontSize: 13,
    fontWeight: "600",
  },
  expiringContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expiringItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  expiringDetails: {
    flex: 1,
  },
  expiringName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 2,
  },
  expiringBatchNumber: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 4,
  },
  expiringStats: {
    flexDirection: "row",
  },
  expiringStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  expiringStatText: {
    fontSize: 13,
    color: "#6c757d",
    marginLeft: 4,
  },
  expiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expiryDaysText: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
    marginRight: 4,
  },
  movementContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  movementSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginHorizontal: 4,
  },
  movementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  movementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  movementTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  movementList: {
    marginBottom: 4,
  },
  movementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  movementItemName: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
    marginRight: 8,
  },
  movementItemValue: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.dark,
  },
  movementEmptyText: {
    fontSize: 13,
    color: "#6c757d",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
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
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: "#6c757d",
    lineHeight: 18,
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
});
