const mongoose = require("mongoose");

const FoundReportSchema = new mongoose.Schema({
    finderName: String,
    finderContact: String,
    imei: String,
    serial: String,
    model: String,
    dateFound: Date,
    foundLocation: String,
    photos: [String],
    matchedLostDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    notifiedOwner: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("FoundReport", FoundReportSchema);
