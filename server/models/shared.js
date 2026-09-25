import mongoose from "mongoose";

export const { Schema } = mongoose;
export const modelOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, value) => {
      value.id = value._id.toString();
      delete value._id;
      delete value.__v;
      return value;
    },
  },
};

export const jurisdictionSchema = new Schema({
  region: String, division: String, subdivision: String, council: String,
  town: String, quarter: String, village: String, landmark: String,
}, { _id: false });

export const locationSchema = new Schema({
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], default: undefined },
  accuracy: Number,
}, { _id: false });
