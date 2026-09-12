import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedUser } from './jwt.strategy';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { imageUploadOptions } from '../uploads/image-upload';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: { user: AuthenticatedUser }) {
    return this.auth.profile(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  @Post('me/avatar')
  async updateAvatar(@Req() request: { user: AuthenticatedUser }, @UploadedFile() avatar?: Express.Multer.File) {
    if (!avatar) throw new BadRequestException('Choose an image to upload');
    const avatarUrl = await this.cloudinary.uploadImage(avatar, 'social-app/avatars');
    return this.auth.updateAvatar(request.user.userId, avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/avatar')
  removeAvatar(@Req() request: { user: AuthenticatedUser }) {
    return this.auth.removeAvatar(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@Req() request: { user: AuthenticatedUser }, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(request.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('account')
  updateAccount(@Req() request: { user: AuthenticatedUser }, @Body() dto: UpdateAccountDto) {
    return this.auth.updateAccount(request.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() request: { user: AuthenticatedUser }, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(request.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cover', imageUploadOptions))
  @Post('me/cover')
  async updateCover(@Req() request: { user: AuthenticatedUser }, @UploadedFile() cover?: Express.Multer.File) {
    if (!cover) throw new BadRequestException('Choose an image to upload');
    const coverUrl = await this.cloudinary.uploadImage(cover, 'social-app/covers');
    return this.auth.updateCover(request.user.userId, coverUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/cover')
  removeCover(@Req() request: { user: AuthenticatedUser }) {
    return this.auth.removeCover(request.user.userId);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
