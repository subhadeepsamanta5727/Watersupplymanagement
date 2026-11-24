require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const VendorCustomer = require('../models/VendorCustomer');
const Product = require('../models/Product');
const Order = require('../models/Order');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const vendor = await User.findOne({ role: 'vendor' });
  if (!vendor) {
    throw new Error('No vendor found in database. Please register a vendor first.');
  }
  console.log(`Using Vendor: ${vendor.name} (${vendor.email || vendor.phone})`);

  // Fetch or find products
  let products = await Product.find({ vendorId: vendor._id });
  if (products.length === 0) {
    const defaultProduct = await Product.create({
      vendorId: vendor._id,
      name: '20L Mineral Water Jar',
      price: 45,
      purchasePrice: 28,
      stock: 200,
      isReturnableJar: true,
      securityDeposit: 150
    });
    products = [defaultProduct];
  }
  const mainProduct = products[0];

  // 1. Create 2 Delivery Agents
  const agentDefs = [
    {
      name: 'Rahul Verma (Delivery Agent)',
      phone: '8111111111',
      role: 'agent',
      vendorId: vendor._id,
      isActive: true,
      password: 'agent123'
    },
    {
      name: 'Amit Patel (Delivery Agent)',
      phone: '8222222222',
      role: 'agent',
      vendorId: vendor._id,
      isActive: true,
      password: 'agent123'
    }
  ];

  const createdAgents = [];
  for (const def of agentDefs) {
    let agent = await User.findOne({ phone: def.phone });
    if (!agent) {
      agent = await User.create(def);
      console.log(`Created Agent: ${agent.name} - Phone: ${agent.phone}`);
    } else {
      agent.name = def.name;
      agent.vendorId = vendor._id;
      agent.isActive = true;
      agent.role = 'agent';
      await agent.save();
      console.log(`Updated Agent: ${agent.name} - Phone: ${agent.phone}`);
    }
    createdAgents.push(agent);
  }

  // 2. Create 5 Customers
  const customerDefs = [
    {
      name: 'Ananya Roy',
      phone: '9111111111',
      email: 'ananya.demo@water.com',
      address: 'Flat 402, Lakeview Apartments, Sector 5, Salt Lake, Kolkata',
      balance: 90,
      bottlesOutstanding: 2,
      securityDeposit: 150,
      hasOrderedReturnable: true
    },
    {
      name: 'Deepak Sen',
      phone: '9222222222',
      email: 'deepak.demo@water.com',
      address: 'House 14B, Green Valley Residency, New Town, Kolkata',
      balance: 0,
      bottlesOutstanding: 0,
      securityDeposit: 0,
      hasOrderedReturnable: false
    },
    {
      name: 'Sneha Mukherjee',
      phone: '9333333333',
      email: 'sneha.demo@water.com',
      address: 'B-108, Sky Tower Heights, Rajarhat, Kolkata',
      balance: 180,
      bottlesOutstanding: 4,
      securityDeposit: 300,
      hasOrderedReturnable: true
    },
    {
      name: 'Vikram Malhotra',
      phone: '9444444444',
      email: 'vikram.demo@water.com',
      address: 'Shop 12, Commercial Plaza, Park Street, Kolkata',
      balance: -150, // Advance credit
      bottlesOutstanding: 1,
      securityDeposit: 150,
      hasOrderedReturnable: true
    },
    {
      name: 'Priyanka Das',
      phone: '9555555555',
      email: 'priyanka.demo@water.com',
      address: 'Plot 22, Sunrise Enclave, Action Area 1, New Town, Kolkata',
      balance: 135,
      bottlesOutstanding: 3,
      securityDeposit: 150,
      hasOrderedReturnable: true
    }
  ];

  const createdCustomers = [];
  for (const def of customerDefs) {
    let customer = await User.findOne({ phone: def.phone });
    if (!customer) {
      customer = await User.create({
        name: def.name,
        phone: def.phone,
        email: def.email,
        address: def.address,
        addresses: [def.address],
        role: 'customer',
        password: 'customer123',
        isActive: true
      });
      console.log(`Created Customer: ${customer.name} - Phone: ${customer.phone}`);
    } else {
      customer.name = def.name;
      customer.email = def.email;
      customer.address = def.address;
      customer.addresses = [def.address];
      customer.isActive = true;
      await customer.save();
      console.log(`Updated Customer: ${customer.name} - Phone: ${customer.phone}`);
    }

    // Link in VendorCustomer relation
    let rel = await VendorCustomer.findOne({ vendorId: vendor._id, customerId: customer._id });
    if (!rel) {
      rel = await VendorCustomer.create({
        vendorId: vendor._id,
        customerId: customer._id,
        balance: def.balance,
        bottlesOutstanding: def.bottlesOutstanding,
        securityDeposit: def.securityDeposit,
        hasOrderedReturnable: def.hasOrderedReturnable
      });
    } else {
      rel.balance = def.balance;
      rel.bottlesOutstanding = def.bottlesOutstanding;
      rel.securityDeposit = def.securityDeposit;
      rel.hasOrderedReturnable = def.hasOrderedReturnable;
      await rel.save();
    }

    createdCustomers.push(customer);
  }

  // 3. Create Sample Active Orders for Demonstration
  // Order 1: Assigned to Rahul Verma for Ananya Roy
  const existingOrder1 = await Order.findOne({
    vendorId: vendor._id,
    customerId: createdCustomers[0]._id,
    status: 'pending'
  });
  if (!existingOrder1) {
    await Order.create({
      vendorId: vendor._id,
      customerId: createdCustomers[0]._id,
      deliveryAgentId: createdAgents[0]._id,
      products: [{
        productId: mainProduct._id,
        name: mainProduct.name,
        quantity: 2,
        requestedQuantity: 2,
        deliveredQuantity: 0,
        price: mainProduct.price,
        purchasePrice: mainProduct.purchasePrice || 25,
        isReturnable: true
      }],
      totalAmount: mainProduct.price * 2,
      bottlesDelivered: 0,
      bottlesReturned: 0,
      status: 'pending',
      deliverySlot: 'Morning (8 AM - 12 PM)',
      deliveryAddress: createdCustomers[0].address,
      deliveryDate: new Date()
    });
    console.log(`Created sample pending order assigned to ${createdAgents[0].name}`);
  }

  // Order 2: Assigned to Amit Patel for Sneha Mukherjee
  const existingOrder2 = await Order.findOne({
    vendorId: vendor._id,
    customerId: createdCustomers[2]._id,
    status: 'pending'
  });
  if (!existingOrder2) {
    await Order.create({
      vendorId: vendor._id,
      customerId: createdCustomers[2]._id,
      deliveryAgentId: createdAgents[1]._id,
      products: [{
        productId: mainProduct._id,
        name: mainProduct.name,
        quantity: 3,
        requestedQuantity: 3,
        deliveredQuantity: 0,
        price: mainProduct.price,
        purchasePrice: mainProduct.purchasePrice || 25,
        isReturnable: true
      }],
      totalAmount: mainProduct.price * 3,
      bottlesDelivered: 0,
      bottlesReturned: 0,
      status: 'pending',
      deliverySlot: 'Afternoon (12 PM - 4 PM)',
      deliveryAddress: createdCustomers[2].address,
      deliveryDate: new Date()
    });
    console.log(`Created sample pending order assigned to ${createdAgents[1].name}`);
  }

  console.log('Seeding completed successfully!');
}

seed()
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
