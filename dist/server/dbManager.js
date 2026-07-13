/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS, INITIAL_BLOGS, INITIAL_FAQS, INITIAL_COUPONS, DEFAULT_SETTINGS } from './initialData';
import { isMysqlConfigured, initTables, query } from './mysqlClient';
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
class DBManager {
    data;
    constructor() {
        this.init();
        if (isMysqlConfigured()) {
            console.log("MySQL configuration detected! Initiating async sync...");
            this.syncWithMysql().catch(err => {
                console.error("Async MySQL synchronization failed:", err);
            });
        }
    }
    init() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            if (fs.existsSync(DB_FILE)) {
                const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
                this.data = JSON.parse(fileContent);
                // Ensure all top-level keys exist in loaded data
                this.data.products = this.data.products || [];
                // Sync products: append any missing products from INITIAL_PRODUCTS
                const existingProductIds = new Set(this.data.products.map(p => p.id));
                const missingProducts = INITIAL_PRODUCTS.filter(p => !existingProductIds.has(p.id));
                if (missingProducts.length > 0) {
                    this.data.products.push(...missingProducts);
                    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
                }
                this.data.orders = this.data.orders || [];
                this.data.chatHistories = this.data.chatHistories || {};
                this.data.blogs = this.data.blogs || [...INITIAL_BLOGS];
                this.data.faqs = this.data.faqs || [...INITIAL_FAQS];
                this.data.coupons = this.data.coupons || [...INITIAL_COUPONS];
                this.data.settings = this.data.settings || { ...DEFAULT_SETTINGS };
                this.data.users = this.data.users || [
                    {
                        email: "admin@gramslife.com",
                        fullName: "Aacharya Dhanvantari",
                        role: "admin",
                        phone: "+1 (800) 555-GRAM",
                        addresses: []
                    },
                    {
                        email: "care@gramslife.com",
                        fullName: "Grams Life Support",
                        role: "admin",
                        phone: "+1 (800) 555-GRAM",
                        addresses: []
                    },
                    {
                        email: "vkchoudhary050607@gmail.com",
                        fullName: "Vipin Choudhary",
                        role: "admin",
                        phone: "+1 555-0199",
                        addresses: [
                            {
                                id: "addr-1",
                                fullName: "Vipin Choudhary",
                                addressLine1: "108 Lotus Lotus Lane",
                                addressLine2: "Ayur Vihar, Sector 4",
                                city: "New Delhi",
                                state: "Delhi",
                                zipCode: "110001",
                                phone: "+91 98765 43210",
                                isDefault: true
                            }
                        ]
                    }
                ];
                this.data.reviews = this.data.reviews || [
                    {
                        id: "rev-1",
                        productId: "prod-1",
                        productName: "Golden Chyawanprash - Saffron & Wild Honey",
                        userName: "Amit Patel",
                        userEmail: "amit.patel@gmail.com",
                        rating: 5,
                        comment: "This is the finest Chyawanprash I have ever tasted! It smells of rich saffron and pure honey. It has been 3 weeks and my morning fatigue has completely vanished.",
                        isApproved: true,
                        date: "2026-06-18"
                    },
                    {
                        id: "rev-2",
                        productId: "prod-3",
                        productName: "Kumkumadi Night Elixir Serum",
                        userName: "Meera Nair",
                        userEmail: "meera.n@yahoo.com",
                        rating: 5,
                        comment: "Absolutely in love with this Kumkumadi oil. Yes, it is premium priced, but the results speak for themselves. My hyperpigmentation is fading rapidly, and it leaves an incredibly radiant golden glow when I wake up.",
                        isApproved: true,
                        date: "2026-06-25"
                    }
                ];
                this.data.activityLogs = this.data.activityLogs || [];
                this.data.payments = this.data.payments || [];
            }
            else {
                // Seed default database
                this.data = {
                    products: [...INITIAL_PRODUCTS],
                    orders: [],
                    blogs: [...INITIAL_BLOGS],
                    faqs: [...INITIAL_FAQS],
                    coupons: [...INITIAL_COUPONS],
                    settings: { ...DEFAULT_SETTINGS },
                    users: [
                        {
                            email: "admin@gramslife.com",
                            fullName: "Aacharya Dhanvantari",
                            role: "admin",
                            phone: "+1 (800) 555-GRAM",
                            addresses: []
                        },
                        {
                            email: "care@gramslife.com",
                            fullName: "Grams Life Support",
                            role: "admin",
                            phone: "+1 (800) 555-GRAM",
                            addresses: []
                        },
                        {
                            email: "vkchoudhary050607@gmail.com",
                            fullName: "Vipin Choudhary",
                            role: "admin",
                            phone: "+1 555-0199",
                            addresses: [
                                {
                                    id: "addr-1",
                                    fullName: "Vipin Choudhary",
                                    addressLine1: "108 Lotus Lotus Lane",
                                    addressLine2: "Ayur Vihar, Sector 4",
                                    city: "New Delhi",
                                    state: "Delhi",
                                    zipCode: "110001",
                                    phone: "+91 98765 43210",
                                    isDefault: true
                                }
                            ]
                        }
                    ],
                    reviews: [
                        {
                            id: "rev-1",
                            productId: "prod-1",
                            productName: "Golden Chyawanprash - Saffron & Wild Honey",
                            userName: "Amit Patel",
                            userEmail: "amit.patel@gmail.com",
                            rating: 5,
                            comment: "This is the finest Chyawanprash I have ever tasted! It smells of rich saffron and pure honey. It has been 3 weeks and my morning fatigue has completely vanished.",
                            isApproved: true,
                            date: "2026-06-18"
                        },
                        {
                            id: "rev-2",
                            productId: "prod-3",
                            productName: "Kumkumadi Night Elixir Serum",
                            userName: "Meera Nair",
                            userEmail: "meera.n@yahoo.com",
                            rating: 5,
                            comment: "Absolutely in love with this Kumkumadi oil. Yes, it is premium priced, but the results speak for themselves. My hyperpigmentation is fading rapidly, and it leaves an incredibly radiant golden glow when I wake up.",
                            isApproved: true,
                            date: "2026-06-25"
                        }
                    ],
                    activityLogs: [
                        {
                            id: "log-initial",
                            timestamp: new Date().toISOString(),
                            userEmail: "system",
                            action: "Database Seeding",
                            details: "Prepopulated Grams Life database with standard premium Ayurvedic components."
                        }
                    ],
                    payments: [],
                    chatHistories: {}
                };
                this.save();
            }
        }
        catch (e) {
            console.error("Failed to initialize database, using memory-only fallback.", e);
            this.data = {
                products: [...INITIAL_PRODUCTS],
                orders: [],
                blogs: [...INITIAL_BLOGS],
                faqs: [...INITIAL_FAQS],
                coupons: [...INITIAL_COUPONS],
                settings: { ...DEFAULT_SETTINGS },
                users: [],
                reviews: [],
                activityLogs: [],
                payments: [],
                chatHistories: {}
            };
        }
    }
    save() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (e) {
            console.error("Failed to write database file.", e);
        }
    }
    // ==========================================
    // MYSQL SYNC LOGIC
    // ==========================================
    async syncWithMysql() {
        try {
            await initTables();
            // --- 1. SETTINGS SYNC ---
            const mysqlSettings = await query("SELECT * FROM settings LIMIT 1");
            if (mysqlSettings && mysqlSettings.length > 0) {
                const s = mysqlSettings[0];
                this.data.settings = {
                    logoName: s.logoName,
                    contactEmail: s.contactEmail,
                    contactPhone: s.contactPhone,
                    address: s.address,
                    facebook: s.facebook || undefined,
                    instagram: s.instagram || undefined,
                    twitter: s.twitter || undefined,
                    defaultTaxPercentage: Number(s.defaultTaxPercentage),
                    baseShippingCharge: Number(s.baseShippingCharge),
                    freeShippingThreshold: Number(s.freeShippingThreshold)
                };
            }
            else {
                await this.saveSettingsToMysql(this.data.settings);
            }
            // --- 2. USERS SYNC ---
            const mysqlUsers = await query("SELECT * FROM users");
            if (mysqlUsers && mysqlUsers.length > 0) {
                this.data.users = mysqlUsers.map((u) => ({
                    email: u.email,
                    fullName: u.fullName,
                    role: u.role,
                    phone: u.phone || undefined,
                    addresses: JSON.parse(u.addresses || '[]'),
                    password: u.password || undefined
                }));
            }
            else {
                for (const u of this.data.users) {
                    await this.saveUserToMysql(u);
                }
            }
            // --- 3. PRODUCTS SYNC ---
            const mysqlProducts = await query("SELECT * FROM products");
            if (mysqlProducts && mysqlProducts.length > 0) {
                this.data.products = mysqlProducts.map((p) => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    price: Number(p.price),
                    originalPrice: Number(p.originalPrice),
                    stock: Number(p.stock),
                    category: p.category,
                    subcategory: p.subcategory || undefined,
                    brand: p.brand,
                    description: p.description,
                    mainImage: p.mainImage,
                    images: JSON.parse(p.images || '[]'),
                    ingredients: JSON.parse(p.ingredients || '[]'),
                    benefits: JSON.parse(p.benefits || '[]'),
                    dosage: p.dosage,
                    usageInstructions: p.usageInstructions,
                    faqs: JSON.parse(p.faqs || '[]'),
                    rating: Number(p.rating),
                    featured: Boolean(p.featured),
                    bestSeller: Boolean(p.bestSeller),
                    lowStockAlertLimit: Number(p.lowStockAlertLimit),
                    createdDate: p.createdDate
                }));
            }
            else {
                for (const p of this.data.products) {
                    await this.saveProductToMysql(p);
                }
            }
            // --- 4. ORDERS SYNC ---
            const mysqlOrders = await query("SELECT * FROM orders");
            if (mysqlOrders && mysqlOrders.length > 0) {
                this.data.orders = mysqlOrders.map((o) => ({
                    id: o.id,
                    userEmail: o.userEmail,
                    userName: o.userName,
                    shippingAddress: JSON.parse(o.shippingAddress || '{}'),
                    items: JSON.parse(o.items || '[]'),
                    subtotal: Number(o.subtotal),
                    tax: Number(o.tax),
                    shippingCharge: Number(o.shippingCharge),
                    discount: Number(o.discount),
                    finalTotal: Number(o.finalTotal),
                    status: o.status,
                    paymentMethod: o.paymentMethod,
                    paymentStatus: o.paymentStatus,
                    orderDate: o.orderDate,
                    trackingNumber: o.trackingNumber || undefined,
                    trackingUpdates: JSON.parse(o.trackingUpdates || '[]')
                }));
            }
            else {
                for (const o of this.data.orders) {
                    await this.saveOrderToMysql(o);
                }
            }
            // --- 5. REVIEWS SYNC ---
            const mysqlReviews = await query("SELECT * FROM reviews");
            if (mysqlReviews && mysqlReviews.length > 0) {
                this.data.reviews = mysqlReviews.map((r) => ({
                    id: r.id,
                    productId: r.productId,
                    productName: r.productName,
                    userName: r.userName,
                    userEmail: r.userEmail,
                    rating: Number(r.rating),
                    comment: r.comment || '',
                    isApproved: Boolean(r.isApproved),
                    date: r.date
                }));
            }
            else {
                for (const r of this.data.reviews) {
                    await this.saveReviewToMysql(r);
                }
            }
            // --- 6. BLOGS SYNC ---
            const mysqlBlogs = await query("SELECT * FROM blogs");
            if (mysqlBlogs && mysqlBlogs.length > 0) {
                this.data.blogs = mysqlBlogs.map((b) => ({
                    id: b.id,
                    title: b.title,
                    slug: b.slug,
                    summary: b.summary || '',
                    content: b.content || '',
                    image: b.image || '',
                    author: b.author,
                    date: b.date,
                    categories: JSON.parse(b.categories || '[]'),
                    readTime: b.readTime
                }));
            }
            else {
                for (const b of this.data.blogs) {
                    await this.saveBlogToMysql(b);
                }
            }
            // --- 7. FAQS SYNC ---
            const mysqlFAQs = await query("SELECT * FROM faqs");
            if (mysqlFAQs && mysqlFAQs.length > 0) {
                this.data.faqs = mysqlFAQs.map((f) => ({
                    id: f.id,
                    category: f.category,
                    question: f.question,
                    answer: f.answer
                }));
            }
            else {
                for (const f of this.data.faqs) {
                    await this.saveFAQToMysql(f);
                }
            }
            // --- 8. COUPONS SYNC ---
            const mysqlCoupons = await query("SELECT * FROM coupons");
            if (mysqlCoupons && mysqlCoupons.length > 0) {
                this.data.coupons = mysqlCoupons.map((c) => ({
                    code: c.code,
                    discountType: c.discountType,
                    value: Number(c.value),
                    minOrderValue: Number(c.minOrderValue),
                    maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : undefined,
                    expiryDate: c.expiryDate,
                    active: Boolean(c.active)
                }));
            }
            else {
                for (const c of this.data.coupons) {
                    await this.saveCouponToMysql(c);
                }
            }
            // --- 9. ACTIVITY LOGS SYNC ---
            const mysqlLogs = await query("SELECT * FROM activityLogs ORDER BY timestamp DESC LIMIT 200");
            if (mysqlLogs && mysqlLogs.length > 0) {
                this.data.activityLogs = mysqlLogs.map((l) => ({
                    id: l.id,
                    timestamp: l.timestamp,
                    userEmail: l.userEmail,
                    action: l.action,
                    details: l.details
                }));
            }
            else {
                for (const l of this.data.activityLogs) {
                    await this.saveActivityLogToMysql(l);
                }
            }
            // --- 10. PAYMENTS SYNC ---
            const mysqlPayments = await query("SELECT * FROM payments");
            if (mysqlPayments && mysqlPayments.length > 0) {
                this.data.payments = mysqlPayments.map((p) => ({
                    id: p.id,
                    orderId: p.orderId,
                    userEmail: p.userEmail,
                    amount: Number(p.amount),
                    paymentMethod: p.paymentMethod,
                    transactionReference: p.transactionReference,
                    status: p.status,
                    createdAt: p.createdAt
                }));
            }
            else {
                for (const p of this.data.payments) {
                    await this.savePaymentToMysql(p);
                }
            }
            console.log("Successfully synchronized offline catalog cache with live MySQL database.");
        }
        catch (err) {
            console.error("Database connection configuration found, but couldn't sync with MySQL. Falling back to local db.json safely.", err);
        }
    }
    // --- ASYNC MYSQL WRITER HANDLERS ---
    async savePaymentToMysql(p) {
        const sql = `
      INSERT INTO payments (id, orderId, userEmail, amount, paymentMethod, transactionReference, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status), transactionReference = VALUES(transactionReference);
    `;
        await query(sql, [p.id, p.orderId, p.userEmail, p.amount, p.paymentMethod, p.transactionReference, p.status, p.createdAt]);
    }
    async saveProductToMysql(p) {
        const sql = `
      INSERT INTO products (
        id, name, sku, price, originalPrice, stock, category, subcategory, brand, description, 
        mainImage, images, ingredients, benefits, dosage, usageInstructions, faqs, rating, 
        featured, bestSeller, lowStockAlertLimit, createdDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name), sku = VALUES(sku), price = VALUES(price), originalPrice = VALUES(originalPrice),
        stock = VALUES(stock), category = VALUES(category), subcategory = VALUES(subcategory),
        brand = VALUES(brand), description = VALUES(description), mainImage = VALUES(mainImage),
        images = VALUES(images), ingredients = VALUES(ingredients), benefits = VALUES(benefits),
        dosage = VALUES(dosage), usageInstructions = VALUES(usageInstructions), faqs = VALUES(faqs),
        rating = VALUES(rating), featured = VALUES(featured), bestSeller = VALUES(bestSeller),
        lowStockAlertLimit = VALUES(lowStockAlertLimit), createdDate = VALUES(createdDate);
    `;
        await query(sql, [
            p.id, p.name, p.sku, p.price, p.originalPrice, p.stock, p.category, p.subcategory || null, p.brand, p.description,
            p.mainImage, JSON.stringify(p.images || []), JSON.stringify(p.ingredients || []), JSON.stringify(p.benefits || []),
            p.dosage, p.usageInstructions, JSON.stringify(p.faqs || []), p.rating, p.featured ? 1 : 0, p.bestSeller ? 1 : 0,
            p.lowStockAlertLimit, p.createdDate
        ]);
    }
    async deleteProductFromMysql(id) {
        await query("DELETE FROM products WHERE id = ?", [id]);
    }
    async saveUserToMysql(u) {
        const sql = `
      INSERT INTO users (email, fullName, role, phone, addresses, password) 
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        fullName = VALUES(fullName), role = VALUES(role), phone = VALUES(phone), 
        addresses = VALUES(addresses), password = VALUES(password);
    `;
        await query(sql, [
            u.email.toLowerCase(), u.fullName, u.role, u.phone || null, JSON.stringify(u.addresses || []), u.password || null
        ]);
    }
    async saveOrderToMysql(o) {
        const sql = `
      INSERT INTO orders (
        id, userEmail, userName, shippingAddress, items, subtotal, tax, shippingCharge, 
        discount, finalTotal, status, paymentMethod, paymentStatus, orderDate, trackingNumber, trackingUpdates
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status), paymentStatus = VALUES(paymentStatus), trackingNumber = VALUES(trackingNumber),
        trackingUpdates = VALUES(trackingUpdates);
    `;
        await query(sql, [
            o.id, o.userEmail.toLowerCase(), o.userName, JSON.stringify(o.shippingAddress), JSON.stringify(o.items),
            o.subtotal, o.tax, o.shippingCharge, o.discount, o.finalTotal, o.status, o.paymentMethod, o.paymentStatus,
            o.orderDate, o.trackingNumber || null, JSON.stringify(o.trackingUpdates || [])
        ]);
    }
    async saveReviewToMysql(r) {
        const sql = `
      INSERT INTO reviews (id, productId, productName, userName, userEmail, rating, comment, isApproved, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        isApproved = VALUES(isApproved), comment = VALUES(comment), rating = VALUES(rating);
    `;
        await query(sql, [
            r.id, r.productId, r.productName, r.userName, r.userEmail.toLowerCase(), r.rating, r.comment, r.isApproved ? 1 : 0, r.date
        ]);
    }
    async deleteReviewFromMysql(id) {
        await query("DELETE FROM reviews WHERE id = ?", [id]);
    }
    async saveBlogToMysql(b) {
        const sql = `
      INSERT INTO blogs (id, title, slug, summary, content, image, author, date, categories, readTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        title = VALUES(title), slug = VALUES(slug), summary = VALUES(summary), content = VALUES(content),
        image = VALUES(image), author = VALUES(author), date = VALUES(date), categories = VALUES(categories),
        readTime = VALUES(readTime);
    `;
        await query(sql, [
            b.id, b.title, b.slug, b.summary, b.content, b.image, b.author, b.date, JSON.stringify(b.categories || []), b.readTime
        ]);
    }
    async deleteBlogFromMysql(id) {
        await query("DELETE FROM blogs WHERE id = ?", [id]);
    }
    async saveFAQToMysql(f) {
        const sql = `
      INSERT INTO faqs (id, category, question, answer)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        category = VALUES(category), question = VALUES(question), answer = VALUES(answer);
    `;
        await query(sql, [f.id, f.category, f.question, f.answer]);
    }
    async deleteFAQFromMysql(id) {
        await query("DELETE FROM faqs WHERE id = ?", [id]);
    }
    async saveCouponToMysql(c) {
        const sql = `
      INSERT INTO coupons (code, discountType, value, minOrderValue, maxDiscount, expiryDate, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        discountType = VALUES(discountType), value = VALUES(value), minOrderValue = VALUES(minOrderValue),
        maxDiscount = VALUES(maxDiscount), expiryDate = VALUES(expiryDate), active = VALUES(active);
    `;
        await query(sql, [
            c.code.toUpperCase(), c.discountType, c.value, c.minOrderValue, c.maxDiscount || null, c.expiryDate, c.active ? 1 : 0
        ]);
    }
    async deleteCouponFromMysql(code) {
        await query("DELETE FROM coupons WHERE code = ?", [code.toUpperCase()]);
    }
    async saveSettingsToMysql(s) {
        const sql = `
      INSERT INTO settings (id, logoName, contactEmail, contactPhone, address, facebook, instagram, twitter, defaultTaxPercentage, baseShippingCharge, freeShippingThreshold)
      VALUES ('main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        logoName = VALUES(logoName), contactEmail = VALUES(contactEmail), contactPhone = VALUES(contactPhone),
        address = VALUES(address), facebook = VALUES(facebook), instagram = VALUES(instagram), twitter = VALUES(twitter),
        defaultTaxPercentage = VALUES(defaultTaxPercentage), baseShippingCharge = VALUES(baseShippingCharge),
        freeShippingThreshold = VALUES(freeShippingThreshold);
    `;
        await query(sql, [
            s.logoName, s.contactEmail, s.contactPhone, s.address, s.facebook || null, s.instagram || null, s.twitter || null,
            s.defaultTaxPercentage, s.baseShippingCharge, s.freeShippingThreshold
        ]);
    }
    async saveActivityLogToMysql(l) {
        const sql = `
      INSERT INTO activityLogs (id, timestamp, userEmail, action, details)
      VALUES (?, ?, ?, ?, ?)
    `;
        await query(sql, [l.id, l.timestamp, l.userEmail, l.action, l.details]);
    }
    // --- PRODUCTS ---
    getProducts() {
        return this.data.products;
    }
    getProductById(id) {
        return this.data.products.find(p => p.id === id);
    }
    saveProduct(product) {
        const idx = this.data.products.findIndex(p => p.id === product.id);
        if (idx > -1) {
            this.data.products[idx] = product;
        }
        else {
            this.data.products.push(product);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveProductToMysql(product).catch(err => {
                console.error("Failed to save product to MySQL async:", err);
            });
        }
        return product;
    }
    deleteProduct(id) {
        const lengthBefore = this.data.products.length;
        this.data.products = this.data.products.filter(p => p.id !== id);
        if (this.data.products.length < lengthBefore) {
            this.save();
            if (isMysqlConfigured()) {
                this.deleteProductFromMysql(id).catch(err => {
                    console.error("Failed to delete product from MySQL async:", err);
                });
            }
            return true;
        }
        return false;
    }
    // --- PAYMENTS ---
    getPayments() {
        return this.data.payments;
    }
    savePayment(payment) {
        const idx = this.data.payments.findIndex(p => p.id === payment.id);
        if (idx > -1) {
            this.data.payments[idx] = payment;
        }
        else {
            this.data.payments.push(payment);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.savePaymentToMysql(payment).catch(err => {
                console.error("Failed to save payment to MySQL async:", err);
            });
        }
        return payment;
    }
    // --- ORDERS ---
    getOrders() {
        return this.data.orders;
    }
    getOrderById(id) {
        return this.data.orders.find(o => o.id === id);
    }
    getOrdersByUser(email) {
        return this.data.orders.filter(o => o.userEmail.toLowerCase() === email.toLowerCase());
    }
    saveOrder(order) {
        const idx = this.data.orders.findIndex(o => o.id === order.id);
        if (idx > -1) {
            this.data.orders[idx] = order;
        }
        else {
            this.data.orders.push(order);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveOrderToMysql(order).catch(err => {
                console.error("Failed to save order to MySQL async:", err);
            });
        }
        return order;
    }
    // --- USERS ---
    getUsers() {
        return this.data.users;
    }
    getUserByEmail(email) {
        return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }
    saveUser(user) {
        const idx = this.data.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (idx > -1) {
            this.data.users[idx] = user;
        }
        else {
            this.data.users.push(user);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveUserToMysql(user).catch(err => {
                console.error("Failed to save user to MySQL async:", err);
            });
        }
        return user;
    }
    // --- REVIEWS ---
    getReviews() {
        return this.data.reviews;
    }
    saveReview(review) {
        const idx = this.data.reviews.findIndex(r => r.id === review.id);
        if (idx > -1) {
            this.data.reviews[idx] = review;
        }
        else {
            this.data.reviews.push(review);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveReviewToMysql(review).catch(err => {
                console.error("Failed to save review to MySQL async:", err);
            });
        }
        return review;
    }
    deleteReview(id) {
        const lengthBefore = this.data.reviews.length;
        this.data.reviews = this.data.reviews.filter(r => r.id !== id);
        if (this.data.reviews.length < lengthBefore) {
            this.save();
            if (isMysqlConfigured()) {
                this.deleteReviewFromMysql(id).catch(err => {
                    console.error("Failed to delete review from MySQL async:", err);
                });
            }
            return true;
        }
        return false;
    }
    // --- BLOGS ---
    getBlogs() {
        return this.data.blogs;
    }
    saveBlog(blog) {
        const idx = this.data.blogs.findIndex(b => b.id === blog.id);
        if (idx > -1) {
            this.data.blogs[idx] = blog;
        }
        else {
            this.data.blogs.push(blog);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveBlogToMysql(blog).catch(err => {
                console.error("Failed to save blog to MySQL async:", err);
            });
        }
        return blog;
    }
    deleteBlog(id) {
        const lengthBefore = this.data.blogs.length;
        this.data.blogs = this.data.blogs.filter(b => b.id !== id);
        if (this.data.blogs.length < lengthBefore) {
            this.save();
            if (isMysqlConfigured()) {
                this.deleteBlogFromMysql(id).catch(err => {
                    console.error("Failed to delete blog from MySQL async:", err);
                });
            }
            return true;
        }
        return false;
    }
    // --- FAQS ---
    getFAQs() {
        return this.data.faqs;
    }
    saveFAQ(faq) {
        const idx = this.data.faqs.findIndex(f => f.id === faq.id);
        if (idx > -1) {
            this.data.faqs[idx] = faq;
        }
        else {
            this.data.faqs.push(faq);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveFAQToMysql(faq).catch(err => {
                console.error("Failed to save FAQ to MySQL async:", err);
            });
        }
        return faq;
    }
    deleteFAQ(id) {
        const lengthBefore = this.data.faqs.length;
        this.data.faqs = this.data.faqs.filter(f => f.id !== id);
        if (this.data.faqs.length < lengthBefore) {
            this.save();
            if (isMysqlConfigured()) {
                this.deleteFAQFromMysql(id).catch(err => {
                    console.error("Failed to delete FAQ from MySQL async:", err);
                });
            }
            return true;
        }
        return false;
    }
    // --- COUPONS ---
    getCoupons() {
        return this.data.coupons;
    }
    saveCoupon(coupon) {
        const idx = this.data.coupons.findIndex(c => c.code.toUpperCase() === coupon.code.toUpperCase());
        if (idx > -1) {
            this.data.coupons[idx] = coupon;
        }
        else {
            this.data.coupons.push(coupon);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveCouponToMysql(coupon).catch(err => {
                console.error("Failed to save coupon to MySQL async:", err);
            });
        }
        return coupon;
    }
    deleteCoupon(code) {
        const lengthBefore = this.data.coupons.length;
        this.data.coupons = this.data.coupons.filter(c => c.code.toUpperCase() !== code.toUpperCase());
        if (this.data.coupons.length < lengthBefore) {
            this.save();
            if (isMysqlConfigured()) {
                this.deleteCouponFromMysql(code).catch(err => {
                    console.error("Failed to delete coupon from MySQL async:", err);
                });
            }
            return true;
        }
        return false;
    }
    // --- SETTINGS ---
    getSettings() {
        return this.data.settings;
    }
    saveSettings(settings) {
        this.data.settings = settings;
        this.save();
        if (isMysqlConfigured()) {
            this.saveSettingsToMysql(settings).catch(err => {
                console.error("Failed to save settings to MySQL async:", err);
            });
        }
        return settings;
    }
    // --- LOGS ---
    getActivityLogs() {
        return this.data.activityLogs;
    }
    logActivity(userEmail, action, details) {
        const newLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toISOString(),
            userEmail,
            action,
            details
        };
        this.data.activityLogs.unshift(newLog);
        // limit logs to last 200 items for size safety
        if (this.data.activityLogs.length > 200) {
            this.data.activityLogs = this.data.activityLogs.slice(0, 200);
        }
        this.save();
        if (isMysqlConfigured()) {
            this.saveActivityLogToMysql(newLog).catch(err => {
                console.error("Failed to save activity log to MySQL async:", err);
            });
        }
    }
    // --- CHAT HISTORIES ---
    getChatHistory(email) {
        this.data.chatHistories = this.data.chatHistories || {};
        return this.data.chatHistories[email.toLowerCase()] || [];
    }
    saveChatHistory(email, messages) {
        this.data.chatHistories = this.data.chatHistories || {};
        this.data.chatHistories[email.toLowerCase()] = messages;
        this.save();
    }
    clearChatHistory(email) {
        this.data.chatHistories = this.data.chatHistories || {};
        delete this.data.chatHistories[email.toLowerCase()];
        this.save();
    }
}
export const db = new DBManager();
