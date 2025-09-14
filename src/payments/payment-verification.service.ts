import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentVerificationService {
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    
    return generatedSignature === signature;
  }

  verifyWebhookSignature(body: any, signature: string, secret: string): boolean {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    
    return generatedSignature === signature;
  }
}