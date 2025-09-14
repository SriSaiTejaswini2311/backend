import { ReservationsService } from '../reservations/reservations.service';
import { Controller, Post, Body, UseGuards, HttpException, HttpStatus, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() body: any) {
    try {
      const { orderId, paymentId, signature } = body;
      const isValid = await this.paymentsService.verifyPaymentSignature(orderId, paymentId, signature);
      
      if (isValid) {
        return { status: 'success', message: 'Payment verified successfully' };
      } else {
        throw new HttpException('Invalid payment signature', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(
        error.message || 'Payment verification failed',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    const webhookData = await this.paymentsService.handleWebhook(body);
    
    if (webhookData.orderId && webhookData.paymentId) {
      await this.reservationsService.updatePaymentStatus(
        webhookData.orderId,
        webhookData.paymentId,
        webhookData.status
      );
    }
    
    return { status: 'received' };
  }

private async handlePaymentCaptured(payment: any) {
  // Update reservation status to confirmed
  await this.reservationsService.updatePaymentStatus(
    payment.order_id,
    payment.id,
    'confirmed'
  );
}

private async handlePaymentFailed(payment: any) {
  // Update reservation status to failed
  await this.reservationsService.updatePaymentStatus(
    payment.order_id,
    payment.id,
    'failed'
  );
}
}