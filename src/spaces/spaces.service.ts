import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Space, SpaceDocument } from '../schemas/space.schema';

@Injectable()
export class SpacesService {
  constructor(@InjectModel(Space.name) private spaceModel: Model<SpaceDocument>) {}

  async findAll(): Promise<Space[]> {
    return this.spaceModel.find({ isActive: true }).populate('owner', 'name email');
  }

  async findOne(id: string): Promise<Space> {
    const space = await this.spaceModel.findById(id).populate('owner', 'name email');
    if (!space) {
      throw new NotFoundException('Space not found');
    }
    return space;
  }

  async findByOwner(ownerId: string): Promise<Space[]> {
    return this.spaceModel.find({ owner: new Types.ObjectId(ownerId) }).populate('owner', 'name email');
  }

  async create(spaceData: Partial<Space>, ownerId: string): Promise<Space> {
    const space = new this.spaceModel({ ...spaceData, owner: ownerId });
    return space.save();
  }

  async update(id: string, spaceData: Partial<Space>, ownerId: string): Promise<Space> {
    const space = await this.spaceModel.findOne({ _id: id, owner: ownerId });
    if (!space) {
      throw new UnauthorizedException('You can only update your own spaces');
    }
    Object.assign(space, spaceData);
    return space.save();
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const result = await this.spaceModel.deleteOne({ _id: id, owner: ownerId });
    if (result.deletedCount === 0) {
      throw new UnauthorizedException('You can only delete your own spaces');
    }
  }

  async addPricingRule(id: string, pricingData: any, ownerId: string): Promise<Space> {
    const space = await this.spaceModel.findOne({ _id: id, owner: ownerId });
    if (!space) {
      throw new UnauthorizedException('You can only update your own spaces');
    }
    
    space.pricingRules.push(pricingData);
    return space.save();
  }
}