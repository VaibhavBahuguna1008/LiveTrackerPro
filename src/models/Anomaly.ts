import mongoose from 'mongoose';

export interface IAnomaly extends mongoose.Document {
  userId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
  tripId?: string; // Optional if tied to a trip
  timestamp: Date;
}

const anomalySchema = new mongoose.Schema<IAnomaly>({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  location: { type: String },
  tripId: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

export default mongoose.models.Anomaly || mongoose.model<IAnomaly>('Anomaly', anomalySchema);
