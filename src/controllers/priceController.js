const axios = require('axios');
const cheerio = require('cheerio');

// Constants
const KES_USD_RATE = 155; // Approximate exchange rate
const APPLE_TAX_BUFFER = 1.25; // 25% extra for local taxes/import compared to US prices

// Helper to map generic model name to Apple ID
const mapAppleModelToId = (model) => {
    const m = model.toLowerCase();
    if (m.includes('16 pro max')) return { family: 'pricing_iphone_16_family', model: 'pricing_iphone_16_pro_max' };
    if (m.includes('16 pro')) return { family: 'pricing_iphone_16_family', model: 'pricing_iphone_16_pro' };
    if (m.includes('16 plus')) return { family: 'pricing_iphone_16_family', model: 'pricing_iphone_16_plus' };
    if (m.includes('16')) return { family: 'pricing_iphone_16_family', model: 'pricing_iphone_16' };
    if (m.includes('15 pro max')) return { family: 'pricing_iphone_15_family', model: 'pricing_iphone_15_pro_max' };
    if (m.includes('15 pro')) return { family: 'pricing_iphone_15_family', model: 'pricing_iphone_15_pro' };
    if (m.includes('15')) return { family: 'pricing_iphone_15_family', model: 'pricing_iphone_15' };
    if (m.includes('14 pro max')) return { family: 'pricing_iphone_14_family', model: 'pricing_iphone_14_pro_max' };
    if (m.includes('14 pro')) return { family: 'pricing_iphone_14_family', model: 'pricing_iphone_14_pro' };
    if (m.includes('14')) return { family: 'pricing_iphone_14_family', model: 'pricing_iphone_14' };
    if (m.includes('13 pro max')) return { family: 'pricing_iphone_13_family', model: 'pricing_iphone_13_pro_max' };
    if (m.includes('13')) return { family: 'pricing_iphone_13_family', model: 'pricing_iphone_13' };
    if (m.includes('12')) return { family: 'pricing_iphone_12_family', model: 'pricing_iphone_12' };
    if (m.includes('11')) return { family: 'pricing_iphone_11_family', model: 'pricing_iphone_11' };
    return null;
};

// Helper to map issue to Apple Service ID
const mapIssueToAppleService = (issue) => {
    const i = issue.toLowerCase();
    if (i.includes('screen')) return 'SI104'; // Screen repair
    if (i.includes('battery')) return 'SI100'; // Battery (guessed, likely)
    return 'SI104'; // Default to screen
};

// Fetch from official Apple API
const fetchAppleOfficialPrice = async (modelName, issue) => {
    try {
        const ids = mapAppleModelToId(modelName);
        if (!ids) return 0;

        const serviceId = mapIssueToAppleService(issue);
        const url = `https://support.apple.com/ols/api/pricing/estimate?locale=en-us&main_product=pricing_iphone&service=${serviceId}&product=${ids.family}&model=${ids.model}`;

        const response = await axios.get(url, { timeout: 8000 });
        if (response.data && response.data.estimate) {
            const usdPrice = response.data.estimate;
            return Math.round(usdPrice * KES_USD_RATE * APPLE_TAX_BUFFER);
        }
        return 0;
    } catch (err) {
        console.error('Apple API error:', err.message);
        return 0;
    }
};

// Helper to fetch price from Dama Mobile Spares
const fetchDamaPrice = async (searchTerm) => {
    try {
        const searchUrl = `https://damamobilespares.co.ke/?s=${encodeURIComponent(searchTerm)}&post_type=product`;
        const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        let price = 0;

        // More aggressive selector search
        const selectors = [
            '.price ins .amount',
            '.price .amount',
            '.woocommerce-Price-amount amount',
            '.amount',
            '.product-price'
        ];

        for (const selector of selectors) {
            const el = $(selector).first();
            if (el.length > 0) {
                const text = el.text().replace(/[^0-9]/g, '');
                price = parseInt(text) || 0;
                if (price > 0) break;
            }
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
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        let price = 0;

        const selectors = ['.price ins .amount', '.price .amount', '.woocommerce-Price-amount', '.amount'];
        for (const selector of selectors) {
            const el = $(selector).first();
            if (el.length > 0) {
                const text = el.text().replace(/[^0-9]/g, '');
                price = parseInt(text) || 0;
                if (price > 0) break;
            }
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

        let applePrice = 0;
        let damaPrice = 0;
        let mobiPrice = 0;

        // If Apple, prioritize Official Site
        if (brand.toLowerCase() === 'apple') {
            applePrice = await fetchAppleOfficialPrice(model, issue);
        }

        // Always fallback to local scrapers for context-aware pricing (or if Apple API fails)
        const issueMap = {
            'Screen': 'LCD',
            'Battery': 'Battery',
            'Charging': 'Charging Port',
            'Water': 'Service',
            'Software': 'Software'
        };
        const searchTerm = `${brand} ${model} ${issueMap[issue] || issue}`;

        [damaPrice, mobiPrice] = await Promise.all([
            fetchDamaPrice(searchTerm),
            fetchMobitopPrice(searchTerm)
        ]);

        let partPrice = 0;
        const localPrices = [damaPrice, mobiPrice].filter(p => p > 0);

        if (applePrice > 0) {
            // If we have local prices too, average Apple Official with Local (weighted towards official for part cost)
            if (localPrices.length > 0) {
                const localAvg = localPrices.reduce((a, b) => a + b, 0) / localPrices.length;
                partPrice = (applePrice * 0.7) + (localAvg * 0.3); // Heavy weight to Apple official
            } else {
                partPrice = applePrice;
            }
        } else if (localPrices.length > 0) {
            partPrice = localPrices.reduce((a, b) => a + b, 0) / localPrices.length;
        }

        // If still 0, use fallback base prices (KES)
        if (partPrice === 0) {
            const fallbacks = {
                'Screen': { 'apple': 8500, 'samsung': 6500, 'tecno': 3500, 'default': 4000 },
                'Battery': { 'apple': 4500, 'samsung': 3500, 'tecno': 1500, 'default': 2000 },
                'Charging': { 'apple': 3500, 'samsung': 2500, 'tecno': 1200, 'default': 1500 }
            };
            const brandKey = brand.toLowerCase();
            const sector = fallbacks[issue] || fallbacks['Screen'];
            partPrice = sector[brandKey] || sector['default'];
        }

        // Labor calculation: 35% of part price with 1500 KES minimum
        const laborRate = 0.35;
        const minLabor = 1500;
        const serviceFee = Math.max(Math.round(partPrice * laborRate), minLabor);
        const totalPrice = Math.round(partPrice + serviceFee);

        res.status(200).json({
            success: true,
            partPrice: Math.round(partPrice),
            serviceFee,
            totalPrice,
            currency: 'KES',
            estimatedTime: '2-4 Hours',
            debug: { apple: applePrice, dama: damaPrice, mobi: mobiPrice }
        });
    } catch (err) {
        console.error('Price estimation error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch price estimate' });
    }
};
