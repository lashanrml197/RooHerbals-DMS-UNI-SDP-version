// app/(reports)/top-sales-reps.tsx

import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProgressBar } from "react-native-paper";
import {
  getCommissionReports,
  getCurrentMonth,
  getCurrentYear,
  getMonthOptions,
  getYearOptions,
} from "../services/reportApi";
import { COLORS } from "../theme/colors";

// Define types for sales rep data
interface CommissionReport {
  repCommissions: SalesRep[];
  commissionHistory: CommissionHistory[];
}

interface SalesRep {
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

interface PeriodOption {
  label: string;
  value: number;
}

export default function TopSalesReps() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<CommissionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [monthOptions] = useState<PeriodOption[]>(getMonthOptions());
  const [yearOptions] = useState<PeriodOption[]>(getYearOptions());

  // Format currency
  const formatCurrencyFn = (amount: number): string => {
    return `Rs. ${amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Format month name
  const getMonthName = (month: number): string => {
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
    return monthNames[month - 1];
  };

  // Calculate performance insights
  const calculateInsights = () => {
    if (!reportData) return null;

    // Find top performer
    const topPerformer =
      reportData.repCommissions.length > 0
        ? reportData.repCommissions.reduce((prev, current) =>
            prev.total_sales > current.total_sales ? prev : current
          )
        : null;

    // Find most improved rep (comparing to previous month)
    let mostImprovedRep = null;
    let highestImprovement = 0;

    // Calculate total commission payout
    const totalCommissionPayout = reportData.repCommissions.reduce(
      (sum, rep) => sum + rep.commission_amount,
      0
    );

    // Calculate average commission rate
    const avgCommissionRate =
      reportData.repCommissions.length > 0
        ? reportData.repCommissions.reduce(
            (sum, rep) => sum + rep.commission_rate,
            0
          ) / reportData.repCommissions.length
        : 0;

    // Calculate commission expense ratio (commission/sales)
    const commissionExpenseRatio =
      reportData.repCommissions.reduce((sum, rep) => sum + rep.total_sales, 0) >
      0
        ? (totalCommissionPayout /
            reportData.repCommissions.reduce(
              (sum, rep) => sum + rep.total_sales,
              0
            )) *
          100
        : 0;

    // Calculate month-over-month change in commissions
    let commissionGrowth = 0;
    if (reportData.commissionHistory.length >= 2) {
      const current = reportData.commissionHistory[0];
      const previous = reportData.commissionHistory[1];

      if (previous.total_commission > 0) {
        commissionGrowth =
          ((current.total_commission - previous.total_commission) /
            previous.total_commission) *
          100;
      }
    }

    // Calculate efficiency score for each rep (sales/commission rate)
    const repEfficiency = reportData.repCommissions
      .map((rep) => ({
        id: rep.user_id,
        name: rep.full_name,
        efficiency:
          rep.commission_rate > 0 ? rep.total_sales / rep.commission_rate : 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency);

    // Most efficient rep
    const mostEfficientRep = repEfficiency.length > 0 ? repEfficiency[0] : null;

    return {
      topPerformer,
      totalCommissionPayout,
      avgCommissionRate,
      commissionExpenseRatio,
      commissionGrowth,
      mostEfficientRep,
      repEfficiency,
    };
  }; // Fetch commission reports data
  const fetchCommissionReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getCommissionReports({
        month: selectedMonth,
        year: selectedYear,
      });

      // Ensure all numeric values are correctly parsed
      if (data && data.repCommissions) {
        data.repCommissions.forEach((rep: SalesRep) => {
          rep.total_sales = parseFloat(String(rep.total_sales || 0));
          rep.commission_amount = parseFloat(
            String(rep.commission_amount || 0)
          );
          rep.commission_rate = parseFloat(String(rep.commission_rate || 0));
        });
      }

      if (data && data.commissionHistory) {
        data.commissionHistory.forEach((history: CommissionHistory) => {
          history.total_sales = parseFloat(String(history.total_sales || 0));
          history.total_commission = parseFloat(
            String(history.total_commission || 0)
          );
          history.avg_commission_rate = parseFloat(
            String(history.avg_commission_rate || 0)
          );
          history.rep_count = parseInt(String(history.rep_count || 0));
        });
      }

      setReportData(data);
    } catch (err: any) {
      console.error("Failed to fetch commission reports:", err);
      setError(err.message || "Failed to load commission reports");
      Alert.alert(
        "Data Loading Error",
        "There was a problem loading the commission report data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };
  // Generate PDF report
  const generatePdfReport = async () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Format date for report title
    const today = new Date();
    const formattedDate = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const reportPeriod = `${getMonthName(selectedMonth)} ${selectedYear}`;

    // Generate sales rep table
    const salesRepsRows = reportData.repCommissions
      .map((rep, index) => {
        const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
        const costPercent = Math.round(
          rep.total_sales > 0
            ? (rep.commission_amount / rep.total_sales) * 100
            : 0
        );

        return `
        <tr style="background-color: ${bgColor}">
          <td>${index + 1}</td>
          <td>${rep.full_name
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")}</td>
          <td>${rep.commission_rate}%</td>
          <td>Rs. ${rep.total_sales.toLocaleString()}</td>
          <td>Rs. ${rep.commission_amount.toLocaleString()}</td>
          <td>${costPercent}%</td>
        </tr>
      `;
      })
      .join("");

    // Generate commission history table
    const historyRows = reportData.commissionHistory
      .map((history, index) => {
        const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
        const costPercent = Math.round(
          history.total_sales > 0
            ? (history.total_commission / history.total_sales) * 100
            : 0
        );

        return `
        <tr style="background-color: ${bgColor}">
          <td>${getMonthName(history.month)} ${history.year}</td>
          <td>${history.rep_count}</td>
          <td>Rs. ${history.total_sales.toLocaleString()}</td>
          <td>Rs. ${history.total_commission.toLocaleString()}</td>
          <td>${history.avg_commission_rate}%</td>
          <td>${costPercent}%</td>
        </tr>
      `;
      })
      .join("");

    // Generate commission efficiency table
    const efficiencyRows = insights.repEfficiency
      .map((rep, index) => {
        const bgColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

        return `
        <tr style="background-color: ${bgColor}">
          <td>${index + 1}</td>
          <td>${rep.name
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")}</td>
          <td>${Math.round(rep.efficiency).toLocaleString()}</td>
        </tr>
      `;
      })
      .join("");

    // Generate chart data for commission history
    const historyData = reportData.commissionHistory.slice().reverse();
    const historyLabels = historyData
      .map(
        (history) =>
          `'${getMonthName(history.month).substring(0, 3)} ${history.year}'`
      )
      .join(",");

    const historySales = historyData
      .map((history) => history.total_sales)
      .join(",");

    const historyCommissions = historyData
      .map((history) => history.total_commission)
      .join(",");

    // Create HTML template for PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sales Representatives Performance Report - Roo Herbals</title>
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
            <h2>Sales Representatives Performance Report</h2>
            <p>Reporting Period: ${reportPeriod} | Generated on: ${formattedDate}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive analysis of sales representatives' performance and commission payouts for ${reportPeriod}. Use these insights to optimize commission structures and improve sales team effectiveness.</p>
            
            <div class="insights-container">
              <div class="insight-card">
                <p class="insight-title">Total Commissions</p>
                <p class="insight-value">Rs. ${insights.totalCommissionPayout.toLocaleString()}</p>
                <p class="insight-trend ${
                  insights.commissionGrowth >= 0 ? "trend-up" : "trend-down"
                }">
                  ${insights.commissionGrowth >= 0 ? "↑" : "↓"} ${Math.abs(
      Math.round(insights.commissionGrowth)
    )}% from last month
                </p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Avg. Commission Rate</p>
                <p class="insight-value">${insights.avgCommissionRate.toFixed(
                  2
                )}%</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Commission Expense</p>
                <p class="insight-value">${insights.commissionExpenseRatio.toFixed(
                  2
                )}%</p>
                <p class="insight-trend">of total sales</p>
              </div>
              
              <div class="insight-card">
                <p class="insight-title">Active Sales Reps</p>
                <p class="insight-value">${reportData.repCommissions.length}</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Sales Representatives Performance</h2>
            <p>The table below shows the performance of each sales representative for ${reportPeriod}.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Representative</th>
                  <th>Commission Rate</th>
                  <th>Total Sales</th>
                  <th>Commission Earned</th>
                  <th>Cost %</th>
                </tr>
              </thead>
              <tbody>
                ${salesRepsRows}
              </tbody>
            </table>
            
            ${
              insights.topPerformer
                ? `
              <div class="recommendations">
                <h3>Top Performer Highlight</h3>
                <p><strong>${insights.topPerformer.full_name
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(
                    /'/g,
                    "&#39;"
                  )}</strong> is the top performer with sales of <strong>Rs. ${insights.topPerformer.total_sales.toLocaleString()}</strong> and has earned a commission of <strong>Rs. ${insights.topPerformer.commission_amount.toLocaleString()}</strong>.</p>
                <p>Consider recognizing this performance to motivate the team.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="section">
            <h2>Historical Commission Trends</h2>
            <p>This chart shows the total sales and commission trends over the past months.</p>
            
            <div class="chart">
              <canvas id="commissionChart"></canvas>
            </div>
            <script>
              // This will only work when viewing the PDF in a browser that can execute JavaScript
              document.addEventListener('DOMContentLoaded', function() {
                const ctx = document.getElementById('commissionChart').getContext('2d');
                new Chart(ctx, {
                  type: 'bar',
                  data: {
                    labels: [${historyLabels}],
                    datasets: [
                      {
                        label: 'Total Sales',
                        data: [${historySales}],
                        backgroundColor: 'rgba(125, 164, 83, 0.6)',
                        borderColor: '#7DA453',
                        borderWidth: 1,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Total Commissions',
                        data: [${historyCommissions}],
                        type: 'line',
                        fill: false,
                        backgroundColor: 'rgba(52, 100, 145, 0.6)',
                        borderColor: '#346491',
                        borderWidth: 2,
                        pointRadius: 4,
                        yAxisID: 'y1'
                      }
                    ]
                  },
                  options: {
                    responsive: true,
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Total Sales (Rs.)'
                        }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Total Commissions (Rs.)'
                        },
                        grid: {
                          drawOnChartArea: false
                        }
                      }
                    }
                  }
                });
              });
            </script>
            
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Active Reps</th>
                  <th>Total Sales</th>
                  <th>Total Commission</th>
                  <th>Avg. Rate</th>
                  <th>Cost %</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Sales Efficiency Analysis</h2>
            <p>This analysis measures how efficiently sales representatives convert their commission rates into sales.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Representative</th>
                  <th>Efficiency Score</th>
                </tr>
              </thead>
              <tbody>
                ${efficiencyRows}
              </tbody>
            </table>
            
            <div class="recommendations">
              <h3>Efficiency Insights</h3>
              <p>Representatives with higher efficiency scores are generating more sales relative to their commission rates.</p>
              ${
                insights.mostEfficientRep
                  ? `
                <p><strong>${insights.mostEfficientRep.name
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(
                    /'/g,
                    "&#39;"
                  )}</strong> has the highest efficiency score at <strong>${Math.round(
                      insights.mostEfficientRep.efficiency
                    ).toLocaleString()}</strong>.</p>
              `
                  : ""
              }
              <p>Consider reviewing commission structures for representatives with low efficiency scores to improve overall sales performance.</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Recommendations & Action Points</h2>
            <ul>
              <li>Review commission rates for low-performing representatives to provide more incentive.</li>
              <li>Consider implementing a tiered commission structure based on efficiency scores.</li>
              <li>Organize knowledge sharing sessions where top performers can share their strategies.</li>
              <li>Explore additional incentives for high-performing representatives to maintain motivation.</li>
              <li>Analyze the correlation between commission rates and sales performance to optimize cost efficiency.</li>
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
  // Generate Excel data
  const generateExcelData = () => {
    if (!reportData) return null;

    const insights = calculateInsights();
    if (!insights) return null;

    // Create workbook with multiple sheets

    // Sheet 1: Executive Summary
    const summarySheetRows = [
      "Roo Herbals - Sales Representatives Performance Report",
      `Reporting Period: ${getMonthName(selectedMonth)} ${selectedYear}`,
      `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      "",
      "EXECUTIVE SUMMARY",
      "",
      `Total Commission Payout,Rs. ${insights.totalCommissionPayout.toLocaleString()}`,
      `Average Commission Rate,${insights.avgCommissionRate.toFixed(2)}%`,
      `Commission Expense Ratio,${insights.commissionExpenseRatio.toFixed(2)}%`,
      `Commission Growth,${
        insights.commissionGrowth >= 0 ? "+" : ""
      }${Math.round(insights.commissionGrowth)}%`,
      `Active Sales Representatives,${reportData.repCommissions.length}`,
      "",
    ];

    let summarySheet = summarySheetRows.join("\n");

    if (insights.topPerformer) {
      summarySheet += "TOP PERFORMER\n\n";
      summarySheet += `Name,${insights.topPerformer.full_name}\n`;
      summarySheet += `Total Sales,Rs. ${insights.topPerformer.total_sales.toLocaleString()}\n`;
      summarySheet += `Commission Rate,${insights.topPerformer.commission_rate}%\n`;
      summarySheet += `Commission Earned,Rs. ${insights.topPerformer.commission_amount.toLocaleString()}\n\n`;
    }

    // Sheet 2: Sales Representatives Performance
    let repsSheetRows = [
      "SALES REPRESENTATIVES PERFORMANCE",
      "",
      "Rank,Representative,Commission Rate,Total Sales,Commission Earned,Cost %",
    ];

    reportData.repCommissions.forEach((rep, index) => {
      const costPercent =
        rep.total_sales > 0
          ? (rep.commission_amount / rep.total_sales) * 100
          : 0;
      repsSheetRows.push(
        `${index + 1},${rep.full_name},${rep.commission_rate}%,${
          rep.total_sales
        },${rep.commission_amount},${Math.round(costPercent)}%`
      );
    });

    const repsSheet = repsSheetRows.join("\n");

    // Sheet 3: Historical Trends
    let historySheetRows = [
      "HISTORICAL COMMISSION TRENDS",
      "",
      "Period,Active Reps,Total Sales,Total Commission,Avg. Rate,Cost %",
    ];

    reportData.commissionHistory.forEach((history) => {
      const costPercent =
        history.total_sales > 0
          ? (history.total_commission / history.total_sales) * 100
          : 0;
      historySheetRows.push(
        `${getMonthName(history.month)} ${history.year},${history.rep_count},${
          history.total_sales
        },${history.total_commission},${
          history.avg_commission_rate
        }%,${Math.round(costPercent)}%`
      );
    });

    const historySheet = historySheetRows.join("\n");

    // Sheet 4: Efficiency Analysis
    let efficiencySheetRows = [
      "SALES EFFICIENCY ANALYSIS",
      "",
      "Rank,Representative,Efficiency Score",
    ];

    insights.repEfficiency.forEach((rep, index) => {
      efficiencySheetRows.push(
        `${index + 1},${rep.name},${Math.round(rep.efficiency)}`
      );
    });

    const efficiencySheet = efficiencySheetRows.join("\n");

    // Sheet 5: Recommendations
    const recommendationsSheetRows = [
      "RECOMMENDATIONS & ACTION POINTS",
      "",
      "1,Review commission rates for low-performing representatives to provide more incentive.",
      "2,Consider implementing a tiered commission structure based on efficiency scores.",
      "3,Organize knowledge sharing sessions where top performers can share their strategies.",
      "4,Explore additional incentives for high-performing representatives to maintain motivation.",
      "5,Analyze the correlation between commission rates and sales performance to optimize cost efficiency.",
    ];

    const recommendationsSheet = recommendationsSheetRows.join("\n");

    return {
      summarySheet,
      repsSheet,
      historySheet,
      efficiencySheet,
      recommendationsSheet,
    };
  };
  // Export report
  const handleExport = async (format: string) => {
    try {
      setExporting(true);

      if (format === "excel") {
        // Generate Excel report
        const excelData = generateExcelData();
        if (!excelData) {
          throw new Error("Failed to generate report data");
        }

        // Create a multi-sheet CSV file with proper section separation
        const csvSections = [
          excelData.summarySheet,
          excelData.repsSheet,
          excelData.historySheet,
          excelData.efficiencySheet,
          excelData.recommendationsSheet,
        ];

        const csvContent = csvSections.join("\n\n");

        // Generate a meaningful filename
        const formattedMonth = selectedMonth.toString().padStart(2, "0");
        const filename = `roo_herbals_sales_rep_performance_${selectedYear}_${formattedMonth}.csv`;

        // Ensure we have a valid document directory path
        if (!FileSystem.documentDirectory) {
          throw new Error("Document directory not available");
        }

        const filePath = `${FileSystem.documentDirectory}${filename}`;

        // Write the file
        await FileSystem.writeAsStringAsync(filePath, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Share the generated file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: "text/csv",
            dialogTitle: "Sales Representatives Performance Report",
          });
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

        // Generate PDF file
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
          height: 842, // A4 height in points
          width: 595, // A4 width in points
        });

        // Share the generated PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Sales Representatives Performance Report",
          });
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

  // Change reporting period
  const handlePeriodChange = () => {
    fetchCommissionReports();
  };
  useEffect(() => {
    fetchCommissionReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <Text style={styles.headerTitle}>Sales Representatives</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading sales rep data...</Text>
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
        <Text style={styles.headerTitle}>Sales Representatives</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCommissionReports}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.light} />
        </TouchableOpacity>
      </View>

      {/* Period selection */}
      <View style={styles.periodContainer}>
        <View style={styles.periodSelectors}>
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Month</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value) => setSelectedMonth(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.dark}
              >
                {monthOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => setSelectedYear(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.dark}
              >
                {yearOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={handlePeriodChange}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Export Actions */}
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
        {/* Period title */}
        <Text style={styles.periodTitle}>
          Performance for {getMonthName(selectedMonth)} {selectedYear}
        </Text>

        {/* Key Metrics Section */}
        {insights && (
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Total Commissions</Text>
              <Text style={styles.insightValue}>
                {formatCurrencyFn(insights.totalCommissionPayout)}
              </Text>
              <Text style={styles.insightDescription}>For this period</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Avg. Commission</Text>
              <Text style={styles.insightValue}>
                {insights.avgCommissionRate.toFixed(1)}%
              </Text>
              <Text style={styles.insightDescription}>Rate</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Commission Cost</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.commissionExpenseRatio > 15
                    ? styles.negativeValue
                    : insights.commissionExpenseRatio > 10
                    ? styles.warningValue
                    : styles.positiveValue,
                ]}
              >
                {insights.commissionExpenseRatio.toFixed(1)}%
              </Text>
              <Text style={styles.insightDescription}>Of total sales</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Growth</Text>
              <Text
                style={[
                  styles.insightValue,
                  insights.commissionGrowth >= 0
                    ? styles.positiveValue
                    : styles.negativeValue,
                ]}
              >
                {insights.commissionGrowth >= 0 ? "+" : ""}
                {Math.round(insights.commissionGrowth)}%
              </Text>
              <Text style={styles.insightDescription}>Month over month</Text>
            </View>
          </View>
        )}

        {/* Top Performers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Sales Representatives</Text>
          <Text style={styles.sectionSubtitle}>Ranked by total sales</Text>
        </View>

        {reportData?.repCommissions && reportData.repCommissions.length > 0 ? (
          <View style={styles.repsContainer}>
            {reportData.repCommissions.slice(0, 5).map((rep, index) => (
              <View key={rep.user_id} style={styles.repCard}>
                <View style={styles.repRankContainer}>
                  <Text style={styles.repRank}>{index + 1}</Text>
                </View>

                <View style={styles.repInfo}>
                  <Text style={styles.repName}>{rep.full_name}</Text>
                  <View style={styles.repStatsRow}>
                    <View style={styles.repStat}>
                      <Text style={styles.repStatText}>
                        {formatCurrencyFn(rep.total_sales)}
                      </Text>
                    </View>
                    <View style={styles.repStat}>
                      <MaterialCommunityIcons
                        name="percent"
                        size={16}
                        color="#6c757d"
                      />
                      <Text style={styles.repStatText}>
                        {rep.commission_rate}% rate
                      </Text>
                    </View>
                  </View>

                  <View style={styles.commissionContainer}>
                    <View style={styles.commissionLabelContainer}>
                      <Text style={styles.commissionLabel}>Commission</Text>
                      <Text style={styles.commissionValue}>
                        {formatCurrencyFn(rep.commission_amount)}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={
                        rep.commission_amount /
                        (reportData.repCommissions[0]?.commission_amount || 1)
                      }
                      color={COLORS.primary}
                      style={styles.commissionBar}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="account-group"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>
              No sales rep data available for this period
            </Text>
          </View>
        )}

        {/* Historical Commission Trends */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historical Commission Trends</Text>
          <Text style={styles.sectionSubtitle}>Last 4 months</Text>
        </View>

        {reportData?.commissionHistory &&
        reportData.commissionHistory.length > 0 ? (
          <View style={styles.historyContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.historyTable}>
                <View style={styles.historyTableHeader}>
                  <Text style={[styles.historyHeaderCell, { width: 120 }]}>
                    Period
                  </Text>
                  <Text style={[styles.historyHeaderCell, { width: 80 }]}>
                    Reps
                  </Text>
                  <Text style={[styles.historyHeaderCell, { width: 120 }]}>
                    Total Sales
                  </Text>
                  <Text style={[styles.historyHeaderCell, { width: 120 }]}>
                    Commission
                  </Text>
                  <Text style={[styles.historyHeaderCell, { width: 80 }]}>
                    Avg. Rate
                  </Text>
                  <Text style={[styles.historyHeaderCell, { width: 80 }]}>
                    Cost %
                  </Text>
                </View>

                {reportData.commissionHistory.map((history, index) => {
                  const costPercent =
                    history.total_sales > 0
                      ? (history.total_commission / history.total_sales) * 100
                      : 0;

                  return (
                    <View
                      key={`${history.month}-${history.year}`}
                      style={[
                        styles.historyTableRow,
                        index % 2 === 0 ? styles.historyTableRowEven : null,
                      ]}
                    >
                      <Text style={[styles.historyTableCell, { width: 120 }]}>
                        {getMonthName(history.month)} {history.year}
                      </Text>
                      <Text style={[styles.historyTableCell, { width: 80 }]}>
                        {history.rep_count}
                      </Text>
                      <Text style={[styles.historyTableCell, { width: 120 }]}>
                        {formatCurrencyFn(history.total_sales)}
                      </Text>
                      <Text style={[styles.historyTableCell, { width: 120 }]}>
                        {formatCurrencyFn(history.total_commission)}
                      </Text>
                      <Text style={[styles.historyTableCell, { width: 80 }]}>
                        {history.avg_commission_rate}%
                      </Text>
                      <Text style={[styles.historyTableCell, { width: 80 }]}>
                        {Math.round(costPercent)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chart-timeline"
              size={40}
              color="#ADB5BD"
            />
            <Text style={styles.emptyText}>No historical data available</Text>
          </View>
        )}

        {/* Efficiency Analysis Section */}
        {insights &&
          insights.repEfficiency &&
          insights.repEfficiency.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Sales Efficiency Analysis
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Sales relative to commission rate
                </Text>
              </View>

              <View style={styles.efficiencyContainer}>
                {insights.repEfficiency.slice(0, 3).map((rep, index) => (
                  <View key={rep.id} style={styles.efficiencyCard}>
                    <View style={styles.efficiencyHeader}>
                      <View
                        style={[
                          styles.efficiencyRank,
                          index === 0
                            ? styles.efficiencyRankGold
                            : index === 1
                            ? styles.efficiencyRankSilver
                            : styles.efficiencyRankBronze,
                        ]}
                      >
                        <Text style={styles.efficiencyRankText}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={styles.efficiencyName}>{rep.name}</Text>
                    </View>

                    <View style={styles.efficiencyScoreContainer}>
                      <Text style={styles.efficiencyScoreLabel}>
                        Efficiency Score
                      </Text>
                      <Text style={styles.efficiencyScore}>
                        {Math.round(rep.efficiency).toLocaleString()}
                      </Text>
                    </View>

                    <ProgressBar
                      progress={
                        rep.efficiency /
                        (insights.repEfficiency[0]?.efficiency || 1)
                      }
                      color={
                        index === 0
                          ? "#FFD700"
                          : index === 1
                          ? "#C0C0C0"
                          : "#CD7F32"
                      }
                      style={styles.efficiencyBar}
                    />
                  </View>
                ))}

                <View style={styles.efficiencyNoteCard}>
                  <MaterialIcons name="info" size={20} color={COLORS.primary} />
                  <Text style={styles.efficiencyNoteText}>
                    Efficiency Score measures sales performance relative to
                    commission rate. Higher scores indicate better return on
                    commission investment.
                  </Text>
                </View>
              </View>
            </>
          )}

        {/* Recommendations Section */}
        {insights && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Recommendations</Text>

            <View style={styles.recommendationCard}>
              {insights.topPerformer && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#D4EDDA" },
                    ]}
                  >
                    <MaterialIcons
                      name="emoji-events"
                      size={20}
                      color="#28A745"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Recognize top performer
                    </Text>
                    <Text style={styles.recommendationText}>
                      Recognize {insights.topPerformer.full_name}&apos;s
                      outstanding performance to motivate the team.
                    </Text>
                  </View>
                </View>
              )}

              {insights.commissionExpenseRatio > 12 && (
                <View style={styles.recommendation}>
                  <View
                    style={[
                      styles.recommendationIcon,
                      { backgroundColor: "#FFF3CD" },
                    ]}
                  >
                    <MaterialIcons
                      name="trending-up"
                      size={20}
                      color="#FFC107"
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>
                      Review commission structure
                    </Text>
                    <Text style={styles.recommendationText}>
                      Commission expense ratio is{" "}
                      {insights.commissionExpenseRatio.toFixed(1)}% of sales.
                      Consider optimizing the commission structure.
                    </Text>
                  </View>
                </View>
              )}

              {insights.commissionGrowth < 0 && (
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
                      Address declining commissions
                    </Text>
                    <Text style={styles.recommendationText}>
                      Commissions decreased by{" "}
                      {Math.abs(Math.round(insights.commissionGrowth))}%
                      compared to last month. Investigate the root cause.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.recommendation}>
                <View
                  style={[
                    styles.recommendationIcon,
                    { backgroundColor: "#D1ECF1" },
                  ]}
                >
                  <MaterialIcons name="lightbulb" size={20} color="#17A2B8" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>
                    Knowledge sharing sessions
                  </Text>
                  <Text style={styles.recommendationText}>
                    Organize sessions where top performers share their
                    strategies with the team.
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

// Use the width directly in styles where needed
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    padding: 12,
  },
  periodSelectors: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectorContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#F8F9FA",
  },
  picker: {
    height: 40,
    width: "100%",
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: "flex-end",
  },
  applyButtonText: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
  },
  exportButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  exportButtonText: {
    marginLeft: 6,
    fontSize: 14,
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
  periodTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 12,
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
    fontSize: 18,
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
  warningValue: {
    color: "#FFC107",
  },
  insightDescription: {
    fontSize: 12,
    color: "#ADB5BD",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6c757d",
  },
  repsContainer: {
    marginBottom: 20,
  },
  repCard: {
    flexDirection: "row",
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
  repRankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  repRank: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  repInfo: {
    flex: 1,
  },
  repName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 6,
  },
  repStatsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  repStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  repStatText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 4,
  },
  commissionContainer: {
    marginTop: 4,
  },
  commissionLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commissionLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  commissionBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E9ECEF",
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTable: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  historyTableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
  },
  historyHeaderCell: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    paddingHorizontal: 8,
  },
  historyTableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  historyTableRowEven: {
    backgroundColor: "#F8F9FA",
  },
  historyTableCell: {
    fontSize: 14,
    color: COLORS.dark,
    paddingHorizontal: 8,
  },
  efficiencyContainer: {
    marginBottom: 20,
  },
  efficiencyCard: {
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
  efficiencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  efficiencyRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  efficiencyRankGold: {
    backgroundColor: "#FFD700",
  },
  efficiencyRankSilver: {
    backgroundColor: "#C0C0C0",
  },
  efficiencyRankBronze: {
    backgroundColor: "#CD7F32",
  },
  efficiencyRankText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  efficiencyName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  efficiencyScoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  efficiencyScoreLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  efficiencyScore: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  efficiencyBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E9ECEF",
  },
  efficiencyNoteCard: {
    flexDirection: "row",
    backgroundColor: "#F0F5EA",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  efficiencyNoteText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
    flex: 1,
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
