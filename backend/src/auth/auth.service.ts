import { BadRequestException, ConflictException, Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../generated/profile-client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { generateUniqueUserId } from '../common/id-generator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.birthDate && (dto.birthDate < '1900-01-01' || dto.birthDate > new Date().toISOString().slice(0, 10))) {
      throw new BadRequestException('Date of birth must be between 1900 and today');
    }
    const uniqueId = await generateUniqueUserId(this.prisma);
    try {
      const user = await this.prisma.user.create({
        data: {
          id: uniqueId,
          email: dto.email.toLowerCase(),
          username: dto.username,
          fullName: dto.fullName,
          birthDate: dto.birthDate ? new Date(dto.birthDate + 'T00:00:00.000Z') : null,
          bio: dto.bio?.trim() || null,
          location: dto.location?.trim() || null,
          website: dto.website || null,
          password: await argon2.hash(dto.password),
        },
        select: { id: true, email: true, username: true, createdAt: true },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or username is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    if (!user || !(await argon2.verify(user.password, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, username: user.username }),
    };
  }

  async profile(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, email: true, createdAt: true,
        fullName: true, birthDate: true, bio: true, location: true, locationLat: true, locationLng: true,
        hometown: true, hometownLat: true, hometownLng: true,
        work: true, education: true, pronouns: true, relationship: true, languages: true, interests: true,
        website: true, github: true, twitter: true, linkedin: true, instagram: true,
        avatarUrl: true, coverUrl: true, isVerified: true, theme: true,
        _count: { select: { posts: true, followers: true, following: true } },
        posts: {
          orderBy: { createdAt: 'desc' }, take: 50,
          include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return user;
  }

  async updateAvatar(id: number, avatarUrl: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
    const result = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
    if (existing?.avatarUrl && existing.avatarUrl !== avatarUrl) {
      this.cloudinary.deleteImage(existing.avatarUrl).catch((err) => {
        this.logger.warn(`Failed to delete previous avatar from Cloudinary: ${err}`);
      });
    }
    return result;
  }

  async removeAvatar(id: number) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
    const result = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: { id: true, avatarUrl: true },
    });
    if (existing?.avatarUrl) {
      try {
        await this.cloudinary.deleteImage(existing.avatarUrl);
      } catch (err) {
        this.logger.warn(`Failed to delete avatar from Cloudinary: ${err}`);
      }
    }
    return result;
  }

  async updateCover(id: number, coverUrl: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { coverUrl: true } });
    const result = await this.prisma.user.update({
      where: { id },
      data: { coverUrl },
      select: { id: true, coverUrl: true },
    });
    if (existing?.coverUrl && existing.coverUrl !== coverUrl) {
      this.cloudinary.deleteImage(existing.coverUrl).catch((err) => {
        this.logger.warn(`Failed to delete previous cover from Cloudinary: ${err}`);
      });
    }
    return result;
  }

  async removeCover(id: number) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { coverUrl: true } });
    const result = await this.prisma.user.update({
      where: { id },
      data: { coverUrl: null },
      select: { id: true, coverUrl: true },
    });
    if (existing?.coverUrl) {
      try {
        await this.cloudinary.deleteImage(existing.coverUrl);
      } catch (err) {
        this.logger.warn(`Failed to delete cover from Cloudinary: ${err}`);
      }
    }
    return result;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() || null }),
        ...(dto.bio !== undefined && { bio: dto.bio?.trim() || null }),
        ...(dto.location !== undefined && { location: dto.location?.trim() || null, locationLat: null, locationLng: null }),
        ...(dto.hometown !== undefined && { hometown: dto.hometown?.trim() || null, hometownLat: null, hometownLng: null }),
        ...(dto.work !== undefined && { work: dto.work?.trim() || null }),
        ...(dto.education !== undefined && { education: dto.education?.trim() || null }),
        ...(dto.pronouns !== undefined && { pronouns: dto.pronouns?.trim() || null }),
        ...(dto.relationship !== undefined && { relationship: dto.relationship?.trim() || null }),
        ...(dto.languages !== undefined && { languages: dto.languages?.trim() || null }),
        ...(dto.interests !== undefined && { interests: dto.interests?.trim() || null }),
        ...(dto.website !== undefined && { website: dto.website?.trim() || null }),
        ...(dto.github !== undefined && { github: dto.github?.trim() || null }),
        ...(dto.twitter !== undefined && { twitter: dto.twitter?.trim() || null }),
        ...(dto.linkedin !== undefined && { linkedin: dto.linkedin?.trim() || null }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram?.trim() || null }),
        ...(dto.theme !== undefined && { theme: dto.theme }),
      },
      select: {
        id: true, fullName: true, bio: true, location: true, locationLat: true, locationLng: true,
        hometown: true, hometownLat: true, hometownLng: true,
        work: true, education: true, pronouns: true, relationship: true, languages: true, interests: true,
        website: true, github: true, twitter: true, linkedin: true, instagram: true, theme: true,
      },
    });
  }

  async updateAccount(userId: number, dto: UpdateAccountDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: { equals: dto.email, mode: 'insensitive' },
          id: { not: userId },
        },
      });
      if (existing) throw new ConflictException('This email address is already in use by another account');
    }

    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: { equals: dto.username, mode: 'insensitive' },
          id: { not: userId },
        },
      });
      if (existing) throw new ConflictException('This username is already taken');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() || null }),
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      select: {
        id: true, username: true, email: true, fullName: true,
        avatarUrl: true, coverUrl: true, isVerified: true, bio: true,
      },
    });

    const accessToken = await this.jwt.signAsync({ sub: updated.id, username: updated.username });
    return { user: updated, accessToken };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new UnauthorizedException('Account not found');

    const isValid = await argon2.verify(user.password, dto.currentPassword);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteAccount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Account not found');

    // Deletes the user; PostgreSQL CASCADE removes all associated posts, comments, likes,
    // comment likes, bookmarks, friendships, follows, and notifications automatically.
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Account and all associated data have been permanently deleted.' };
  }
}
