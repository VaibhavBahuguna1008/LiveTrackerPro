import mongoose from 'mongoose';

export interface ITrip extends mongoose.Document {
  userId: string;
  title: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distance: string;
  duration: string;
  avgVelocity: string;
  activityType: string;
  timestamp: string;
}

const tripSchema = new mongoose.Schema<ITrip>({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  location: { type: String, default: 'Unknown Location' },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  distance: { type: String, required: true },
  duration: { type: String, required: true },
  avgVelocity: { type: String, required: true },
  activityType: { type: String, default: 'walking' },
  timestamp: { type: String, required: true }
}, { 
  timestamps: true 
});

export default mongoose.models.Trip || mongoose.model<ITrip>('Trip', tripSchema);
