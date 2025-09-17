const User = require("../../models/userSchema");
const STATUS = require('../../config/statusCodes');
const {WALLET} = require('../../config/messages')

const getWalletPage = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        
        const limit = 5;
        const sortedTransactions = user.walletTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        const totalTransactions = user.walletTransactions.length;
        const hasMore = totalTransactions > limit;

        res.render('userLayout', {
            body: 'wallet',
            userData: req.session.user,
            walletBalance: user.wallet || 0,
            walletTransactions: sortedTransactions,
            pagination: {
                currentPage: 1,
                limit: limit,
                totalTransactions: totalTransactions,
                hasMore: hasMore,
                totalPages: Math.ceil(totalTransactions / limit)
            }
        });
    } catch (err) {
        next(err);
    }
}

const getWalletTransactions = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(STATUS.BAD_REQUEST).json({
                success: false,
                message: WALLET.USER_NOT_FOUND
            });
        }

        const sortedTransactions = user.walletTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);
        const totalTransactions = sortedTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const hasMore = page < totalPages;

        res.json({
            success: true,
            transactions: paginatedTransactions,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalTransactions: totalTransactions,
                limit: limit,
                hasMore: hasMore,
                hasPrevious: page > 1
            }
        });
    } catch (err) {
        console.error('Error fetching wallet transactions:', err);
        res.status(STATUS.SERVER_ERROR).json({
            success: false,
            message: WALLET.SERVER_ERROR
        });
    }
}

module.exports = {
    getWalletPage,
    getWalletTransactions
}