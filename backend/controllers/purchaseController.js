const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

// @desc    Record a new purchase / stock inward
// @route   POST /api/v1/purchases
// @access  Private (Vendor only)
exports.createPurchase = async (req, res) => {
  let session;
  try {
    const {
      productId,
      quantity,
      unitCost,
      totalAmount,
      supplierName,
      invoiceNumber,
      purchaseDate,
      notes
    } = req.body;

    const vendorId = req.user._id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid Product ID is required' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Purchase quantity must be a positive whole number' });
    }

    const product = await Product.findOne({ _id: productId, vendorId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this vendor' });
    }

    const calculatedUnitCost = Number(unitCost) >= 0 ? Number(unitCost) : 0;
    const calculatedTotal = Number(totalAmount) > 0
      ? Number(totalAmount)
      : calculatedUnitCost * qty;

    session = await mongoose.startSession();
    let purchase;

    await session.withTransaction(async () => {
      // 1. Create Purchase record
      const [newPurchase] = await Purchase.create([{
        vendorId,
        productId,
        productName: product.name,
        quantity: qty,
        unitCost: calculatedUnitCost,
        totalAmount: calculatedTotal,
        supplierName: (supplierName || '').trim(),
        invoiceNumber: (invoiceNumber || '').trim(),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes: (notes || '').trim()
      }], { session });

      purchase = newPurchase;

      // 2. Automatically increment product stock, update purchasePrice, & activate product
      const productUpdate = {
        $inc: { stock: qty },
        $set: { isActive: true }
      };
      if (calculatedUnitCost > 0) {
        productUpdate.$set.purchasePrice = calculatedUnitCost;
      }

      await Product.updateOne(
        { _id: productId, vendorId },
        productUpdate,
        { session }
      );
    });

    res.status(201).json({
      success: true,
      message: `Stock successfully increased by ${qty} units`,
      data: purchase
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

// @desc    Get all purchases for the current vendor
// @route   GET /api/v1/purchases
// @access  Private (Vendor only)
exports.getPurchases = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const purchases = await Purchase.find({ vendorId })
      .sort({ purchaseDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
