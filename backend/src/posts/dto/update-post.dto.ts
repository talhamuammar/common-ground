import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @IsOptional()
  mentionedUsernames?: string | string[];

  @IsOptional()
  existingImageUrls?: string | string[];
}
