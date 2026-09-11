import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hometown?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hometownLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hometownLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  work?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  pronouns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  relationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  languages?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  interests?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value !== null && value !== undefined)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }
    return value;
  })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_valid_protocol: true }, { message: 'website must be a valid website URL (e.g. www.example.com or https://example.com)' })
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  github?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  twitter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  theme?: string;
}

