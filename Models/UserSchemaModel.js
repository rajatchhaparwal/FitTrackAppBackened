import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        unique: true,
        required: true
    },
    truecallerId: String, 
    isVerified: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },

    profile: {
        gender: { type: String, enum: ['Male', 'Female', 'Other'] },
        dob: Date, 
        height: Number,
        goal: { type: String, enum: ['Weight Loss', 'Muscle Gain', 'Maintenance'] },
        injury:{type:String}
    },

    statsLog: [{
        weight: Number,
        bodyFat: Number,
        recordedAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', UserSchema);

export default User;