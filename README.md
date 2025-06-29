# Roo Herbals DMS (Distribution Management System) 👋

This is a Distribution Management System developed specifically for **Roo Herbals PVT Ltd**, a beauty care products company located in Badalkumbura, Monaragala District, Sri Lanka. The system addresses the unique challenges of beauty and herbal product distribution, focusing on inventory optimization, order management automation, and efficient sales operations to enhance productivity and customer service.

**Developer:** R.M. Lasidu Lashan  
**Project Type:** 3rd Year System Development Project (In my University Degree Programme)  
**Client:** Roo Herbals PVT Ltd, Badalkumbura, Monaragala District, Sri Lanka  
**Industry:** Beauty Care Products & Herbal Distribution

## About the Client

**Roo Herbals PVT Ltd** is a beauty care products company based in Badalkumbura, Monaragala District, Sri Lanka, focused on creating and selling beauty care products. The company distributes its own line of herbal products as well as items from other manufacturers. Roo Herbals works with a team of sales representatives who visit shops to take orders and maintain strong relationships with their customers.

However, their current manual processes present significant challenges, and Roo Herbals is now looking to digitize their distribution operations. This includes digitalizing order-taking, automating inventory updates, tracking payments, and simplifying commission calculations to transform their business operations and improve efficiency.

## Key Features

### 🚀 FEFO (First Expired, First Out) Inventory Management

The cornerstone feature of this system is the implementation of FEFO inventory management, specifically designed for beauty and herbal product distribution where product expiration is critical:

- **Smart Batch Tracking:** Comprehensive tracking of all product batches with manufacturing and expiration dates
- **Automatic FEFO Logic:** System automatically prioritizes products with earlier expiration dates for order fulfillment
- **Expiration Alerts:** Real-time visual alerts and notifications for products approaching expiration
- **Loss Prevention:** Significantly reduces inventory loss due to expiration through intelligent stock rotation
- **Batch History:** Complete traceability of batch movements and distribution patterns
- **Expiry Dashboard:** Dedicated dashboard showing all expiring products with timeframes

### 📊 Comprehensive Inventory Management

- Real-time stock level monitoring with automatic low stock alerts
- Stock adjustment capabilities
- Product categorization and classification system
- Inventory valuation reports

### 👥 Customer Relationship Management

- Complete customer profile management with credit history
- Customer payment tracking and credit management
- Order history

### 🚚 Advanced Order Management

- Streamlined order creation and processing workflow
- Order fulfillment using FEFO principles
- Return order processing with reason tracking
- Order status tracking and customer notifications

### 💰 Sales Representative Management

- Commission calculation based on sales volume
- Reports

### 🏪 Supplier & Purchase Management

- Comprehensive supplier databases
- Automated reorder point calculations

### 🚛 Delivery & Route Optimization

- Driver management and assignment system
- Real-time delivery status updates

### 📈 Advanced Reporting & Analytics

- Comprehensive sales reports
- Inventory reports including expiry analysis
- Customer analysis and segmentation reports
- Sales representative performance reports

### 🔒 Security & User Management

- Role-based access control system
- User authentication and authorization
- Session management and security protocols

## Get Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Development Information

This application is built with:

- **Frontend:** React Native with Expo
- **Backend:** Node.js with Express
- **Database:** MySQL
- **Authentication:** JWT-based authentication
- **Routing:** File-based routing with Expo Router

## Technical Documentation

The project implements several best practices for beauty and herbal product inventory management:

- **FEFO (First Expired, First Out) principle:** Core inventory distribution logic that ensures products with earlier expiration dates are prioritized for sale
- **Real-time stock level monitoring:** Continuous tracking with configurable low stock alerts
- **Comprehensive batch tracking:** Complete supplier information, manufacturing dates, and expiration tracking
- **Multi-level approval workflows:** Ensures proper authorization for critical operations

## Project Objectives

This system development project aims to:

1. **Minimize Inventory Loss:** Reduce product expiration losses through intelligent FEFO implementation
2. **Optimize Operations:** Streamline all distribution processes from procurement to delivery
3. **Enhance Customer Service:** Improve order accuracy and delivery efficiency
4. **Provide Business Intelligence:** Generate actionable insights through comprehensive reporting
5. **Ensure Compliance:** Maintain regulatory compliance for beauty care product distribution
6. **Reduce Manual Errors:** Automate critical processes to minimize human error

## Academic Context

This project serves as a comprehensive system development initiative for a 3rd-year university degree programme, demonstrating:

- **System Analysis & Design:** Complete requirements analysis and system architecture design
- **Database Design:** Normalized database structure optimized for beauty and herbal product distribution
- **Full-Stack Development:** Modern web and mobile application development
- **Business Process Optimization:** Real-world problem solving for inventory management
- **Industry Best Practices:** Implementation of beauty care product distribution standards
- **Project Management:** Complete SDLC implementation from conception to deployment

## Project Vision

In today's fast-paced business environment, technology plays a key role in streamlining operations and improving efficiency. Many businesses, like Roo Herbals Pvt Ltd, still rely on manual processes for essential tasks, which can lead to inefficiencies and delays. This project aims to develop a digital solution tailored to the needs of Roo Herbals Pvt Ltd to modernize their distribution process.

This system will simplify order-taking for sales representatives, automate inventory updates, and streamline payment tracking. It will also include features to calculate sales commissions, generate real-time reports, and improve communication between the office and the sales team. By digitizing these processes, the company can reduce paperwork, save time, and make better-informed decisions.

Additionally, the system will serve as a centralized platform, allowing the owner to monitor sales performance, inventory levels, and payment statuses easily. Sales representatives will benefit from a mobile-friendly interface that makes order processing and tracking more convenient.

The goal is to create a user-friendly digital solution that transforms the way Roo Herbals Pvt Ltd operates. By replacing manual processes with a streamlined, technology-driven system, the company can enhance productivity, reduce errors, and better serve its customers in the competitive beauty care market.
