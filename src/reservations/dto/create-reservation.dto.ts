import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  spaceId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedAmount?: number;
}