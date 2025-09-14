import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
    
    // Validate that keys exist
    if (!keyId || !keySecret) {
      this.logger.error('Razorpay API keys are not configured properly');
      throw new Error('Razorpay API keys are missing');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(amount: number, currency: string = 'INR', receipt?: string) {
    try {
      const options = {
        amount: amount * 100, // Convert to paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1, // Auto-capture payments
      };

      this.logger.log(`Creating order with options: ${JSON.stringify(options)}`);
      
      // Check if Razorpay keys are configured
      const keyId = this.configService.get('RAZORPAY_KEY_ID');
      const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
      
      if (!keyId || keyId === 'your-razorpay-key-id' || !keySecret || keySecret === 'your-razorpay-key-secret') {
        // Return mock order for demo purposes
        const mockOrder = {
          id: `order_mock_${Date.now()}`,
          entity: 'order',
          amount: options.amount,
          amount_paid: 0,
          amount_due: options.amount,
          currency: options.currency,
          receipt: options.receipt,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000)
        };
        
        this.logger.log(`Mock order created for demo: ${mockOrder.id}`);
        return mockOrder;
      }
      
      const order = await this.razorpay.orders.create(options);
      this.logger.log(`Order created successfully: ${order.id}`);
      
      return order;
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET'));
    hmac.update(orderId + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');
    
    return generatedSignature === signature;
  }

  async initiateRefund(paymentId: string, amount: number) {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amount * 100, // amount in paise
      });
      return refund;
    } catch (error) {
      console.error('Refund failed:', error);
      throw new Error(`Failed to initiate refund: ${error.message}`);
    }
  }

  async handleWebhook(event: any) {
    // Return webhook event data for controller to handle
    return {
      event: event.event,
      orderId: event.payload?.payment?.entity?.order_id,
      paymentId: event.payload?.payment?.entity?.id,
      status: event.event === 'payment.captured' ? 'confirmed' : 'failed'
    };
  }
}