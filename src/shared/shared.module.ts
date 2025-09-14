// src/shared/shared.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from '../payments/payments.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class SharedModule {}