const Expense = require('../models/Expense');
const { parseExpenseDate } = require('../utils/profitLoss');

exports.createExpense = async (req, res) => {
  try {
    const { expenseType, name, amount, expenseDate } = req.body || {};
    const normalizedType = typeof expenseType === 'string' ? expenseType.trim() : '';
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedAmount = Number(amount);

    if (!normalizedType || normalizedType.length > 60) {
      return res.status(400).json({ success: false, message: 'Expense type is required and must be 60 characters or fewer' });
    }
    if (!normalizedName || normalizedName.length > 120) {
      return res.status(400).json({ success: false, message: 'Expense name is required and must be 120 characters or fewer' });
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
    }

    const parsedDate = expenseDate === undefined ? new Date() : parseExpenseDate(expenseDate);
    if (!parsedDate) {
      return res.status(400).json({ success: false, message: 'Expense date must be a valid calendar date' });
    }

    const expense = await Expense.create({
      vendorId: req.user._id,
      expenseType: normalizedType,
      name: normalizedName,
      amount: normalizedAmount,
      expenseDate: parsedDate
    });

    res.status(201).json({ success: true, message: 'Expense recorded successfully', data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
