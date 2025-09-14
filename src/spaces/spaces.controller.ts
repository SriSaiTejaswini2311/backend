import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { Space } from '../schemas/space.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  async findAll(): Promise<Space[]> {
    return this.spacesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Space> {
    return this.spacesService.findOne(id);
  }

  @Get('my/spaces')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER)
  async findMySpaces(@Request() req): Promise<Space[]> {
    return this.spacesService.findByOwner(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER)
  async create(@Body() spaceData: Partial<Space>, @Request() req): Promise<Space> {
    return this.spacesService.create(spaceData, req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER)
  async update(@Param('id') id: string, @Body() spaceData: Partial<Space>, @Request() req): Promise<Space> {
    return this.spacesService.update(id, spaceData, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER)
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.spacesService.remove(id, req.user.userId);
  }

  @Post(':id/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND_OWNER)
  async addPricingRule(@Param('id') id: string, @Body() pricingData: any, @Request() req): Promise<Space> {
    return this.spacesService.addPricingRule(id, pricingData, req.user.userId);
  }
}