const axios = require('axios');
const cheerio = require('cheerio');

// Helper to fetch price from Dama Mobile Spares
const fetchDamaPrice = async (searchTerm) => {
    try {
        const searchUrl = `https://damamobilespares.co.ke/?s=${encodeURIComponent(searchTerm)}&post_type=product`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 8000
        });

        const $ = cheerio.load(response.data);
        let price = 0;

        // Try different selectors for WooCommerce prices
        // Price element in list view or single product view
        const priceElement = $('.price ins .amount').first().text() || $('.price .amount').first().text() || $('.woocommerce-Price-amount').first().text();

        if (priceElement) {
            const priceText = priceElement.replace(/[^0-9]/g, '');
            price = parseInt(priceText) || 0;
        }
        return price;
    } catch (err) {
        console.error('Dama fetch error:', err.message);
        return 0;
    }
};

// Helper to fetch price from Mobitop
const fetchMobitopPrice = async (searchTerm) => {
    try {
        const searchUrl = `https://mobitop.co.ke/?s=${encodeURIComponent(searchTerm)}&post_type=product`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 8000
        });

        const $ = cheerio.load(response.data);
        let price = 0;

        const priceElement = $('.price ins .amount').first().text() || $('.price .amount').first().text() || $('.woocommerce-Price-amount').first().text();

        if (priceElement) {
            const priceText = priceElement.replace(/[^0-9]/g, '');
            price = parseInt(priceText) || 0;
        }
        return price;
    } catch (err) {
        console.error('Mobitop fetch error:', err.message);
        return 0;
    }
};

// @desc    Fetch repair part price from external vendors and average them
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

        const searchTermFull = `${brand} ${model} ${issueMap[issue] || issue}`;

        // Fetch from both sites concurrently
        const [damaPrice, mobiPrice] = await Promise.all([
            fetchDamaPrice(searchTermFull),
            fetchMobitopPrice(searchTermFull)
        ]);

        let partPrice = 0;
        const prices = [damaPrice, mobiPrice].filter(p => p > 0);

        if (prices.length > 0) {
            // Calculate average
            partPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        }

        // If still 0, use fallback base prices (KES) to ensure user never sees 0
        if (partPrice === 0) {
            const fallbackPrices = {
                'Screen': 3800,
                'Battery': 1900,
                'Charging': 1300,
                'Water': 2800,
                'Software': 1200
            };
            partPrice = fallbackPrices[issue] || 1500;
        }

        // Service fee (Technician labor)
        // Calculating total as Part Price + Technician Labor (30% of part price)
        const laborRate = 0.35; // Slightly higher to cover business costs
        const minLabor = 1500;
        const calculatedLabor = Math.max(partPrice * laborRate, minLabor);

        const serviceFee = Math.round(calculatedLabor);
        const totalPrice = Math.round(partPrice + serviceFee);

        res.status(200).json({
            success: true,
            partPrice: Math.round(partPrice),
            serviceFee,
            totalPrice,
            currency: 'KES',
            estimatedTime: '2-4 Hours',
            sources: prices.length
        });
    } catch (err) {
        console.error('Price estimation error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch price estimate' });
    }
};
