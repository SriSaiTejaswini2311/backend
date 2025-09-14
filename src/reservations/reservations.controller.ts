import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Reservation } from '../schemas/reservation.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req): Promise<Reservation[]> {
    return this.reservationsService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req): Promise<Reservation> {
    return this.reservationsService.findOne(id, req.user.userId, req.user.role);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  async create(@Body() reservationData: any, @Request() req): Promise<Reservation> {
    return this.reservationsService.create(reservationData, req.user.userId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req): Promise<Reservation> {
    return this.reservationsService.cancelReservation(id, req.user.userId);
  }

  @Patch(':id/check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER, UserRole.STAFF)
  async checkIn(@Param('id') id: string, @Request() req): Promise<Reservation> {
    return this.reservationsService.checkIn(id, req.user.userId, req.user.role);
  }

  @Patch(':id/check-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER, UserRole.STAFF)
  async checkOut(@Param('id') id: string, @Request() req): Promise<Reservation> {
    return this.reservationsService.checkOut(id, req.user.userId, req.user.role);
  }

  @Get('staff/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.BRAND_OWNER)
  async getTodayReservations(): Promise<Reservation[]> {
    return this.reservationsService.getTodayReservations();
  }
}