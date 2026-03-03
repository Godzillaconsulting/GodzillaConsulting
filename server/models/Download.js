import mongoose from 'mongoose';

const DownloadSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lead_magnet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LeadMagnet',
        required: true
    },
    sent: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Garantizar que la combinación user_id y lead_magnet_id es única (evita re-envíos infinitos)
DownloadSchema.index({ user_id: 1, lead_magnet_id: 1 }, { unique: true });

export default mongoose.models.Download || mongoose.model('Download', DownloadSchema);
