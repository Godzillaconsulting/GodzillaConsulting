import mongoose from 'mongoose';

const LeadMagnetSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    file_url: { type: String },
    email_subject: { type: String },
    email_body: { type: String },
}, { timestamps: true });

export default mongoose.models.LeadMagnet || mongoose.model('LeadMagnet', LeadMagnetSchema);
