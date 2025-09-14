import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument, ReservationStatus } from '../schemas/reservation.schema';
import { SpacesService } from '../spaces/spaces.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    private spaceService: SpacesService,
    private paymentsService: PaymentsService,
  ) {}

  async findAll(userId: string, userRole: string): Promise<Reservation[]> {
    let query = {};
    if (userRole === 'consumer') {
      query = { user: new Types.ObjectId(userId) };
    } else if (userRole === 'brand_owner') {
      // For brand owners, get reservations for their spaces
      const mySpaces = await this.spaceService.findByOwner(userId);
      const spaceIds = mySpaces.map(space => (space as any)._id);
      query = { space: { $in: spaceIds } };
    }
    
    return this.reservationModel.find(query)
      .populate('space')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string, userRole: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(id)
      .populate('space')
      .populate('user', 'name email');
    
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    
    // Check if user has access to this reservation
    if (userRole === 'consumer' && (reservation.user as any)._id.toString() !== userId) {
      throw new UnauthorizedException('You can only view your own reservations');
    }
    
    if (userRole === 'brand_owner') {
      const space = await this.spaceService.findOne((reservation.space as any)._id.toString());
      if ((space.owner as any)._id.toString() !== userId) {
        throw new UnauthorizedException('You can only view reservations for your spaces');
      }
    }
    
    return reservation;
  }

  async create(reservationData: any, userId: string): Promise<Reservation> {
    try {
      const { spaceId, startTime, endTime, promoCode } = reservationData;
  
      // Check if the space is available
      const space = await this.spaceService.findOne(spaceId);
      
      // Check for overlapping reservations
      const overlappingReservations = await this.reservationModel.find({
        space: spaceId,
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        $or: [
          { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } },
        ],
      });
  
      if (overlappingReservations.length > 0) {
        throw new BadRequestException('This space is already booked for the selected time slot');
      }
  
      // Calculate price
      const durationHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
      let price = space.pricingRules[0]?.rate * durationHours || 0;
      
      // Apply discounts
      let discountAmount = 0;
      if (promoCode === 'WELCOME10') {
        discountAmount = price * 0.1;
        price -= discountAmount;
      }
  
      // Create Razorpay order
      const order = await this.paymentsService.createOrder(
        price,
        'INR',
        `reservation_${Date.now()}`
      );
  
      const reservation = new this.reservationModel({
        user: userId,
        space: spaceId,
        startTime,
        endTime,
        totalAmount: price,
        discountAmount,
        promoCode,
        razorpayOrderId: order.id,
        status: ReservationStatus.PENDING,
      });
  
      await reservation.save();
      return reservation.populate('space');
    } catch (error) {
      this.logger.error(`Failed to create reservation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updatePaymentStatus(orderId: string, paymentId: string, status: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findOne({ razorpayOrderId: orderId });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    
    reservation.razorpayPaymentId = paymentId;
    reservation.status = status === 'confirmed' ? ReservationStatus.CONFIRMED : ReservationStatus.CANCELLED;
    
    await reservation.save();
    await reservation.populate('space');
    await reservation.populate('user', 'name email');
    return reservation;
  }

  async cancelReservation(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    
    if (reservation.user.toString() !== userId) {
      throw new UnauthorizedException('You can only cancel your own reservations');
    }
    
    if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Cannot cancel this reservation');
    }
    
    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save();
    
    // Initiate refund if payment was made
    if (reservation.razorpayPaymentId) {
      await this.paymentsService.initiateRefund(reservation.razorpayPaymentId, reservation.totalAmount);
    }
    
    await reservation.populate('space');
    await reservation.populate('user', 'name email');
    return reservation;
  }

  async checkIn(id: string, userId: string, userRole: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    
    // Staff can check in any reservation
    if (userRole !== 'staff') {
      // Brand owners can only check in reservations for their spaces
      const space = await this.spaceService.findOne(reservation.space.toString());
      if (space.owner.toString() !== userId) {
        throw new UnauthorizedException('You can only check in reservations for your spaces');
      }
    }
    
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed reservations can be checked in');
    }
    
    reservation.status = ReservationStatus.CHECKED_IN;
    reservation.checkInTime = new Date();
    await reservation.save();
    
    await reservation.populate('space');
    await reservation.populate('user', 'name email');
    return reservation;
  }

  async checkOut(id: string, userId: string, userRole: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(id);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    
    // Staff can check out any reservation
    if (userRole !== 'staff') {
      // Brand owners can only check out reservations for their spaces
      const space = await this.spaceService.findOne(reservation.space.toString());
      if (space.owner.toString() !== userId) {
        throw new UnauthorizedException('You can only check out reservations for your spaces');
      }
    }
    
    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestException('Only checked in reservations can be checked out');
    }
    
    reservation.status = ReservationStatus.CHECKED_OUT;
    reservation.checkOutTime = new Date();
    await reservation.save();
    
    await reservation.populate('space');
    await reservation.populate('user', 'name email');
    return reservation;
  }

  async getTodayReservations(): Promise<Reservation[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.reservationModel.find({
      startTime: { $gte: today, $lt: tomorrow },
      status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
    })
    .populate('space')
    .populate('user', 'name email')
    .sort({ startTime: 1 })
    .exec();
  }
}