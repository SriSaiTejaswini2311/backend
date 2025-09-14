import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PricingRuleDocument = PricingRule & Document;

@Schema()
export class PricingRule {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['hourly', 'daily', 'monthly'] })
  type: string;

  @Prop({ required: true })
  rate: number;

  @Prop({ default: false })
  isPeakHour: boolean;

  @Prop({ default: 1 })
  multiplier: number;

  @Prop()
  startTime?: string; // HH:mm format

  @Prop()
  endTime?: string; // HH:mm format

  @Prop([String])
  daysOfWeek?: string[]; // ['monday', 'tuesday', etc.]

  @Prop({ default: true })
  isActive: boolean;
}

export const PricingRuleSchema = SchemaFactory.createForClass(PricingRule);