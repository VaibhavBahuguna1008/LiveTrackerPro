import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  password?: string;
  name: string;
  role: 'user' | 'admin';
  entityType?: 'human' | 'dog' | 'cat' | 'bike' | 'car' | 'bus';
  notifications?: {
    geofence: boolean;
    speed: boolean;
    newUser: boolean;
  };
}

const userSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  entityType: { type: String, default: 'human' },
  notifications: {
    geofence: { type: Boolean, default: true },
    speed: { type: Boolean, default: true },
    newUser: { type: Boolean, default: false }
  }
}, { 
  timestamps: true 
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
