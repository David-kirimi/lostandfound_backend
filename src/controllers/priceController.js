const axios = require('axios');
const cheerio = require('cheerio');

// Constants
const KES_USD_RATE = 158; // Current market rate
const APPLE_TAX_BUFFER = 1.35; // 35% for import, duty and local markup vs US MSRP

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
    if (m.includes('13 pro')) return { family: 'pricing_iphone_13_family', model: 'pricing_iphone_13_pro' };
    if (m.includes('13')) return { family: 'pricing_iphone_13_family', model: 'pricing_iphone_13' };
    if (m.includes('12 pro max')) return { family: 'pricing_iphone_12_family', model: 'pricing_iphone_12_pro_max' };
    if (m.includes('12')) return { family: 'pricing_iphone_12_family', model: 'pricing_iphone_12' };
    if (m.includes('11 pro max')) return { family: 'pricing_iphone_11_family', model: 'pricing_iphone_11_pro_max' };
    if (m.includes('11')) return { family: 'pricing_iphone_11_family', model: 'pricing_iphone_11' };
    return null;
};

// Helper to map issue to Apple Service ID
const mapIssueToAppleService = (issue) => {
    const i = issue.toLowerCase();
    if (i.includes('screen')) return 'SI104'; // Screen repair
    if (i.includes('battery')) return 'SI100'; // Battery
    return 'SI104';
};

// Fetch from official Apple API
const fetchAppleOfficialPrice = async (modelName, issue) => {
    try {
        const ids = mapAppleModelToId(modelName);
        if (!ids) return 0;

        const serviceId = mapIssueToAppleService(issue);
        const url = `https://support.apple.com/ols/api/pricing/estimate?locale=en-us&main_product=pricing_iphone&service=${serviceId}&product=${ids.family}&model=${ids.model}`;

        const response = await axios.get(url, { timeout: 8000 });
        if (response.data && response.data.prices) {
            // Find the Out Of Warranty (OOW) price
            const oow = response.data.prices.find(p => p.coverage === 'OOW');
            if (oow && oow.price) {
                return Math.round(oow.price * KES_USD_RATE * APPLE_TAX_BUFFER);
            }
        }
        return 0;
    } catch (err) {
        console.error('Apple API error:', err.message);
        return 0;
    }
};

// Helper to scrape and validate results from WooCommerce sites
const scrapeWooSite = async (baseUrl, searchTerm, modelToMatch) => {
    try {
        const searchUrl = `${baseUrl}/?s=${encodeURIComponent(searchTerm)}&post_type=product`;
        const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        let validPrice = 0;

        // Iterate through product items to find the best match
        $('.product, .post-item, .item-inner, .ts-post-item').each((i, el) => {
            const title = $(el).find('.product-title, .woocommerce-loop-product__title, .post-title').text().toLowerCase();
            const modelLower = modelToMatch.toLowerCase();

            // Validation: The title MUST contain the model name to avoid "iPhone 16" pollution
            // and should contain the component name (e.g., LCD, Battery)
            if (title.includes(modelLower)) {
                const priceEl = $(el).find('.price ins .amount, .price .amount, .woocommerce-Price-amount').first();
                const priceText = priceEl.text().replace(/[^0-9]/g, '');
                const price = parseInt(priceText) || 0;

                if (price > 0) {
                    validPrice = price;
                    return false; // Break loop on first valid match
                }
            }
        });

        return validPrice;
    } catch (err) {
        console.error(`Scrape error ${baseUrl}:`, err.message);
        return 0;
    }
};

exports.estimatePrice = async (req, res) => {
    try {
        const { brand, model, issue } = req.query;

        if (!brand || !model || !issue) {
            return res.status(400).json({ success: false, error: 'Brand, model, and issue are required' });
        }

        let applePrice = 0;
        let damaPrice = 0;
        let mobiPrice = 0;

        // 1. If Apple, get official price
        if (brand.toLowerCase() === 'apple') {
            applePrice = await fetchAppleOfficialPrice(model, issue);
        }

        // 2. Prepare search terms for local scrapers
        // NOTE: We omit the "Apple" prefix because it triggers a bug on Dama's search that returns iPhone 16 packing results
        const isApple = brand.toLowerCase() === 'apple';
        const componentMap = {
            'Screen': 'Complete LCD',
            'Battery': 'Internal Battery',
            'Charging': 'Charging Port',
            'Water': 'Service',
            'Software': 'Software'
        };
        const searchBrand = isApple ? '' : brand; // Omit "Apple" for Apple devices to avoid generic results
        const searchTerm = `${searchBrand} ${model} ${componentMap[issue] || issue}`.trim();

        // 3. Scrape local vendors with match-validation
        [damaPrice, mobiPrice] = await Promise.all([
            scrapeWooSite('https://damamobilespares.co.ke', searchTerm, model),
            scrapeWooSite('https://mobitop.co.ke', searchTerm, model)
        ]);

        // 4. Calculate part price based on available data
        let partPrice = 0;
        const localPrices = [damaPrice, mobiPrice].filter(p => p > 0);

        if (applePrice > 0) {
            // Logic for Apple: Use official weighted 80% and local weighted 20% 
            // Local prices are often for "compatible" parts, official is for "original-equivalent"
            if (localPrices.length > 0) {
                const localAvg = localPrices.reduce((a, b) => a + b, 0) / localPrices.length;
                partPrice = (applePrice * 0.8) + (localAvg * 0.2);
            } else {
                partPrice = applePrice;
            }
        } else if (localPrices.length > 0) {
            partPrice = localPrices.reduce((a, b) => a + b, 0) / localPrices.length;
        }

        // 5. Fallback logic: Realistic tier-based fallbacks
        if (partPrice === 0) {
            const screenFallbacks = {
                'apple': 9000, 'samsung': 7000, 'tecno': 3500, 'infinix': 3500, 'other': 4000
            };
            const batteryFallbacks = {
                'apple': 4500, 'samsung': 3500, 'tecno': 1500, 'other': 2000
            };

            const brandKey = brand.toLowerCase();
            if (issue.toLowerCase().includes('screen')) {
                partPrice = screenFallbacks[brandKey] || screenFallbacks['other'];
            } else if (issue.toLowerCase().includes('battery')) {
                partPrice = batteryFallbacks[brandKey] || batteryFallbacks['other'];
            } else {
                partPrice = 2500;
            }
        }

        // 6. Labor: 35% commission or 1500 KES floor
        const laborRate = 0.35;
        const laborFloor = 1500;
        const serviceFee = Math.max(Math.round(partPrice * laborRate), laborFloor);
        const totalPrice = Math.round(partPrice + serviceFee);

        res.status(200).json({
            success: true,
            partPrice: Math.round(partPrice),
            serviceFee,
            totalPrice,
            currency: 'KES',
            estimatedTime: '2-4 Hours',
            debug: { apple: applePrice, dama: damaPrice, mobi: mobiPrice, searchTerm }
        });
    } catch (err) {
        console.error('Estimate error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
