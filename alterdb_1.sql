-- Droping all foreign key constraints
ALTER TABLE customers DROP FOREIGN KEY customers_ibfk_1;
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1;
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_2;
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_1;
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2;
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_3;
ALTER TABLE deliveries DROP FOREIGN KEY deliveries_ibfk_1;
ALTER TABLE deliveries DROP FOREIGN KEY deliveries_ibfk_2;
ALTER TABLE payments DROP FOREIGN KEY payments_ibfk_1;
ALTER TABLE payments DROP FOREIGN KEY payments_ibfk_2;
ALTER TABLE returns DROP FOREIGN KEY returns_ibfk_1;
ALTER TABLE returns DROP FOREIGN KEY returns_ibfk_2;
ALTER TABLE return_items DROP FOREIGN KEY return_items_ibfk_1;
ALTER TABLE return_items DROP FOREIGN KEY return_items_ibfk_2;
ALTER TABLE return_items DROP FOREIGN KEY return_items_ibfk_3;
ALTER TABLE purchase_orders DROP FOREIGN KEY purchase_orders_ibfk_1;
ALTER TABLE purchase_orders DROP FOREIGN KEY purchase_orders_ibfk_2;
ALTER TABLE po_items DROP FOREIGN KEY po_items_ibfk_1;
ALTER TABLE po_items DROP FOREIGN KEY po_items_ibfk_2;
ALTER TABLE commissions DROP FOREIGN KEY commissions_ibfk_1;
ALTER TABLE products DROP FOREIGN KEY products_ibfk_1;
ALTER TABLE product_batches DROP FOREIGN KEY product_batches_ibfk_1;
ALTER TABLE product_batches DROP FOREIGN KEY product_batches_ibfk_2;

-- Modifying all primary keys to VARCHAR(10)
-- Users table
ALTER TABLE users MODIFY user_id VARCHAR(10) NOT NULL;
ALTER TABLE users DROP PRIMARY KEY;
ALTER TABLE users ADD PRIMARY KEY (user_id);

-- Customers table
ALTER TABLE customers MODIFY customer_id VARCHAR(10) NOT NULL;
ALTER TABLE customers DROP PRIMARY KEY;
ALTER TABLE customers ADD PRIMARY KEY (customer_id);

-- Suppliers table
ALTER TABLE suppliers MODIFY supplier_id VARCHAR(10) NOT NULL;
ALTER TABLE suppliers DROP PRIMARY KEY;
ALTER TABLE suppliers ADD PRIMARY KEY (supplier_id);

-- Categories table
ALTER TABLE categories MODIFY category_id VARCHAR(10) NOT NULL;
ALTER TABLE categories DROP PRIMARY KEY;
ALTER TABLE categories ADD PRIMARY KEY (category_id);

-- Products table
ALTER TABLE products MODIFY product_id VARCHAR(10) NOT NULL;
ALTER TABLE products DROP PRIMARY KEY;
ALTER TABLE products ADD PRIMARY KEY (product_id);

-- Product batches table
ALTER TABLE product_batches MODIFY batch_id VARCHAR(10) NOT NULL;
ALTER TABLE product_batches DROP PRIMARY KEY;
ALTER TABLE product_batches ADD PRIMARY KEY (batch_id);

-- Orders table
ALTER TABLE orders MODIFY order_id VARCHAR(10) NOT NULL;
ALTER TABLE orders DROP PRIMARY KEY;
ALTER TABLE orders ADD PRIMARY KEY (order_id);

-- Order items table
ALTER TABLE order_items MODIFY order_item_id VARCHAR(10) NOT NULL;
ALTER TABLE order_items DROP PRIMARY KEY;
ALTER TABLE order_items ADD PRIMARY KEY (order_item_id);

-- Deliveries table
ALTER TABLE deliveries MODIFY delivery_id VARCHAR(10) NOT NULL;
ALTER TABLE deliveries DROP PRIMARY KEY;
ALTER TABLE deliveries ADD PRIMARY KEY (delivery_id);

-- Payments table
ALTER TABLE payments MODIFY payment_id VARCHAR(10) NOT NULL;
ALTER TABLE payments DROP PRIMARY KEY;
ALTER TABLE payments ADD PRIMARY KEY (payment_id);

-- Returns table
ALTER TABLE returns MODIFY return_id VARCHAR(10) NOT NULL;
ALTER TABLE returns DROP PRIMARY KEY;
ALTER TABLE returns ADD PRIMARY KEY (return_id);

-- Return items table
ALTER TABLE return_items MODIFY return_item_id VARCHAR(10) NOT NULL;
ALTER TABLE return_items DROP PRIMARY KEY;
ALTER TABLE return_items ADD PRIMARY KEY (return_item_id);

-- Purchase orders table
ALTER TABLE purchase_orders MODIFY po_id VARCHAR(10) NOT NULL;
ALTER TABLE purchase_orders DROP PRIMARY KEY;
ALTER TABLE purchase_orders ADD PRIMARY KEY (po_id);

-- Purchase order items table
ALTER TABLE po_items MODIFY po_item_id VARCHAR(10) NOT NULL;
ALTER TABLE po_items DROP PRIMARY KEY;
ALTER TABLE po_items ADD PRIMARY KEY (po_item_id);

-- Vehicles table
ALTER TABLE vehicles MODIFY vehicle_id VARCHAR(10) NOT NULL;
ALTER TABLE vehicles DROP PRIMARY KEY;
ALTER TABLE vehicles ADD PRIMARY KEY (vehicle_id);

-- Commissions table
ALTER TABLE commissions MODIFY commission_id VARCHAR(10) NOT NULL;
ALTER TABLE commissions DROP PRIMARY KEY;
ALTER TABLE commissions ADD PRIMARY KEY (commission_id);

-- Modifying all foreign keys to VARCHAR(10)
ALTER TABLE customers MODIFY registered_by VARCHAR(10);
ALTER TABLE orders MODIFY customer_id VARCHAR(10) NOT NULL;
ALTER TABLE orders MODIFY sales_rep_id VARCHAR(10) NOT NULL;
ALTER TABLE order_items MODIFY order_id VARCHAR(10) NOT NULL;
ALTER TABLE order_items MODIFY product_id VARCHAR(10) NOT NULL;
ALTER TABLE order_items MODIFY batch_id VARCHAR(10) NOT NULL;
ALTER TABLE deliveries MODIFY order_id VARCHAR(10) NOT NULL;
ALTER TABLE deliveries MODIFY driver_id VARCHAR(10) NOT NULL;
ALTER TABLE deliveries MODIFY vehicle_id VARCHAR(10);
ALTER TABLE payments MODIFY order_id VARCHAR(10) NOT NULL;
ALTER TABLE payments MODIFY received_by VARCHAR(10);
ALTER TABLE returns MODIFY order_id VARCHAR(10) NOT NULL;
ALTER TABLE returns MODIFY processed_by VARCHAR(10) NOT NULL;
ALTER TABLE return_items MODIFY return_id VARCHAR(10) NOT NULL;
ALTER TABLE return_items MODIFY product_id VARCHAR(10) NOT NULL;
ALTER TABLE return_items MODIFY batch_id VARCHAR(10) NOT NULL;
ALTER TABLE purchase_orders MODIFY supplier_id VARCHAR(10) NOT NULL;
ALTER TABLE purchase_orders MODIFY created_by VARCHAR(10) NOT NULL;
ALTER TABLE po_items MODIFY po_id VARCHAR(10) NOT NULL;
ALTER TABLE po_items MODIFY product_id VARCHAR(10) NOT NULL;
ALTER TABLE commissions MODIFY sales_rep_id VARCHAR(10) NOT NULL;
ALTER TABLE products MODIFY category_id VARCHAR(10);
ALTER TABLE product_batches MODIFY product_id VARCHAR(10) NOT NULL;
ALTER TABLE product_batches MODIFY supplier_id VARCHAR(10) NOT NULL;

--  Re-adding all foreign key constraints
ALTER TABLE customers ADD CONSTRAINT customers_ibfk_1 FOREIGN KEY (registered_by) REFERENCES users(user_id);
ALTER TABLE orders ADD CONSTRAINT orders_ibfk_1 FOREIGN KEY (customer_id) REFERENCES customers(customer_id);
ALTER TABLE orders ADD CONSTRAINT orders_ibfk_2 FOREIGN KEY (sales_rep_id) REFERENCES users(user_id);
ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders(order_id);
ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(product_id);
ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_3 FOREIGN KEY (batch_id) REFERENCES product_batches(batch_id);
ALTER TABLE deliveries ADD CONSTRAINT deliveries_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders(order_id);
ALTER TABLE deliveries ADD CONSTRAINT deliveries_ibfk_2 FOREIGN KEY (driver_id) REFERENCES users(user_id);
ALTER TABLE payments ADD CONSTRAINT payments_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders(order_id);
ALTER TABLE payments ADD CONSTRAINT payments_ibfk_2 FOREIGN KEY (received_by) REFERENCES users(user_id);
ALTER TABLE returns ADD CONSTRAINT returns_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders(order_id);
ALTER TABLE returns ADD CONSTRAINT returns_ibfk_2 FOREIGN KEY (processed_by) REFERENCES users(user_id);
ALTER TABLE return_items ADD CONSTRAINT return_items_ibfk_1 FOREIGN KEY (return_id) REFERENCES returns(return_id);
ALTER TABLE return_items ADD CONSTRAINT return_items_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(product_id);
ALTER TABLE return_items ADD CONSTRAINT return_items_ibfk_3 FOREIGN KEY (batch_id) REFERENCES product_batches(batch_id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_ibfk_1 FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_ibfk_2 FOREIGN KEY (created_by) REFERENCES users(user_id);
ALTER TABLE po_items ADD CONSTRAINT po_items_ibfk_1 FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id);
ALTER TABLE po_items ADD CONSTRAINT po_items_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(product_id);
ALTER TABLE commissions ADD CONSTRAINT commissions_ibfk_1 FOREIGN KEY (sales_rep_id) REFERENCES users(user_id);
ALTER TABLE products ADD CONSTRAINT products_ibfk_1 FOREIGN KEY (category_id) REFERENCES categories(category_id);
ALTER TABLE product_batches ADD CONSTRAINT product_batches_ibfk_1 FOREIGN KEY (product_id) REFERENCES products(product_id);
ALTER TABLE product_batches ADD CONSTRAINT product_batches_ibfk_2 FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id);

