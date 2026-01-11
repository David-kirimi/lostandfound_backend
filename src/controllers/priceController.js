const axios = require('axios');
const cheerio = require('cheerio');

// @desc    Fetch repair part price from external vendors
// @route   GET /api/repairs/estimate-price
// @access  Private
exports.estimatePrice = async (req, res) => {
    try {
        const { brand, model, issue } = req.query;

        if (!brand || !model || !issue) {
            return res.status(400).json({ success: false, error: 'Brand, model, and issue are required' });
        }

        // Map common issues to search terms
        const issueMap = {
            'Screen': 'LCD',
            'Battery': 'Battery',
            'Charging': 'Charging Port',
            'Water': 'Full Service',
            'Software': 'Software'
        };

        const searchTerm = `${brand} ${model} ${issueMap[issue] || issue}`;
        const searchUrl = `https://damamobilespares.co.ke/?s=${encodeURIComponent(searchTerm)}&post_type=product`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.cheerio.load(response.data);
        let partPrice = 0;

        // Try to find the price of the first product in the search results
        // Standard WooCommerce layout for prices
        const priceElement = $('.price ins .amount').first() || $('.price .amount').first();
        if (priceElement.length > 0) {
            const priceText = priceElement.text().replace(/[^0-9]/g, '');
            partPrice = parseInt(priceText) || 0;
        }

        // If not found, fallback to a base price logic or try another site
        if (partPrice === 0) {
            // Fallback base prices (KES)
            const fallbackPrices = {
                'Screen': 3000,
                'Battery': 1500,
                'Charging': 1000,
                'Water': 2000,
                'Software': 1000
            };
            partPrice = fallbackPrices[issue] || 1000;
        }

        // Service fee (Technician labor)
        // Calculating total as Part Price + Technician Labor (30% of part price, with a minimum floor)
        const laborRate = 0.30; // 30% labor commission
        const minLabor = 1000; // Minimum KES for labor
        const calculatedLabor = Math.max(partPrice * laborRate, minLabor);

        const serviceFee = Math.round(calculatedLabor);
        const totalPrice = partPrice + serviceFee;

        res.status(200).json({
            success: true,
            partPrice,
            serviceFee,
            totalPrice,
            currency: 'KES',
            estimatedTime: '2-4 Hours'
        });
    } catch (err) {
        console.error('Price estimation error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch price estimate' });
    }
};
