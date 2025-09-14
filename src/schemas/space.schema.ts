import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type SpaceDocument = Space & Document;

export class PricingRule {
  @Prop({ required: true })
  type: 'hourly' | 'daily' | 'monthly' | 'special_event';

  @Prop({ required: true })
  rate: number;

  @Prop()
  startTime?: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  minHours?: number;

  @Prop()
  maxHours?: number;
}

@Schema({ timestamps: true })
export class Space {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  address: string;

  @Prop()
  capacity: number;

  @Prop([String])
  amenities: string[];

  @Prop([String])
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  owner: User;

  @Prop([PricingRule])
  pricingRules: PricingRule[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  openingTime: string;

  @Prop()
  closingTime: string;
}

export const SpaceSchema = SchemaFactory.createForClass(Space);