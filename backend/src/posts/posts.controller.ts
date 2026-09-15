import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UploadedFiles, UseGuards, UseInterceptors, Sse, MessageEvent } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import { multiImageUploadOptions } from '../uploads/image-upload';
import { CloudinaryService } from '../uploads/cloudinary.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('posts')
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Sse('stream/reactions')
  streamReactions(): Observable<MessageEvent> {
    return this.posts.reactionStream.pipe(
      map((event) => ({
        data: event,
      })),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor(multiImageUploadOptions))
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const text = dto.content ? dto.content.trim() : '';
    const allFiles = files && files.length > 0 ? files : [];
    if (!text && allFiles.length === 0) {
      throw new BadRequestException('Post must contain text or at least one image');
    }
    // Filter out duplicate 'image' field if 'images' field is present
    const imagesFieldFiles = allFiles.filter((f) => f.fieldname === 'images');
    const filesToUpload = imagesFieldFiles.length > 0 ? imagesFieldFiles : allFiles;

    const imageUrls: string[] = [];
    if (filesToUpload.length > 0) {
      const uploadPromises = filesToUpload.map((img) => this.cloudinary.uploadImage(img, 'social-app/posts'));
      const results = await Promise.all(uploadPromises);
      imageUrls.push(...results);
    }
    let mentionedList: string[] = [];
    if (Array.isArray(dto.mentionedUsernames)) {
      mentionedList = dto.mentionedUsernames;
    } else if (typeof dto.mentionedUsernames === 'string') {
      try {
        const parsed = JSON.parse(dto.mentionedUsernames);
        if (Array.isArray(parsed)) mentionedList = parsed;
        else if (typeof parsed === 'string') mentionedList = [parsed];
      } catch {
        mentionedList = [dto.mentionedUsernames];
      }
    }

    return this.posts.create(request.user.userId, text, imageUrls, mentionedList);
  }

  @Get()
  findAll() {
    return this.posts.findAll();
  }

  @Get('trending-tags')
  getTrendingTags() {
    return this.posts.getTrendingTags();
  }

  @Get('suggested-tags')
  getSuggestedTags() {
    return this.posts.getSuggestedTags();
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  getBookmarks(@Req() request: AuthenticatedRequest) {
    return this.posts.getBookmarks(request.user.userId);
  }

  @Get('liked')
  @UseGuards(JwtAuthGuard)
  getLikedPosts(@Req() request: AuthenticatedRequest) {
    return this.posts.getLikedPosts(request.user.userId);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.posts.toggleBookmark(request.user.userId, id);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  toggleCommentLike(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('type') reactionType?: string,
  ) {
    return this.posts.toggleCommentLike(request.user.userId, id, reactionType);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('comments/:id/likes')
  getCommentLikes(@Param('id', ParseIntPipe) id: number, @Req() request: { user?: AuthenticatedUser | null }) {
    return this.posts.getCommentLikes(id, request.user?.userId);
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Body('mentionedUsernames') mentionedUsernames?: string[] | string,
  ) {
    let parsedMentions: string[] = [];
    if (Array.isArray(mentionedUsernames)) {
      parsedMentions = mentionedUsernames;
    } else if (typeof mentionedUsernames === 'string' && mentionedUsernames.trim()) {
      try {
        const parsed = JSON.parse(mentionedUsernames);
        if (Array.isArray(parsed)) parsedMentions = parsed;
        else parsedMentions = [mentionedUsernames.trim()];
      } catch {
        parsedMentions = [mentionedUsernames.trim()];
      }
    }

    return this.posts.updateComment(
      request.user.userId,
      id,
      content,
      parsedMentions,
    );
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.posts.deleteComment(request.user.userId, id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posts.findOne(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Body('parentId') parentId?: number,
    @Body('mentionedUsernames') mentionedUsernames?: string[] | string,
  ) {
    let parsedMentions: string[] = [];
    if (Array.isArray(mentionedUsernames)) {
      parsedMentions = mentionedUsernames;
    } else if (typeof mentionedUsernames === 'string' && mentionedUsernames.trim()) {
      try {
        const parsed = JSON.parse(mentionedUsernames);
        if (Array.isArray(parsed)) parsedMentions = parsed;
        else parsedMentions = [mentionedUsernames.trim()];
      } catch {
        parsedMentions = [mentionedUsernames.trim()];
      }
    }

    return this.posts.addComment(
      request.user.userId,
      id,
      content,
      parentId ? Number(parentId) : undefined,
      parsedMentions,
    );
  }

  @Get(':id/comments')
  getComments(@Param('id', ParseIntPipe) id: number) {
    return this.posts.getComments(id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/likes')
  getLikes(@Param('id', ParseIntPipe) id: number, @Req() request: { user?: AuthenticatedUser | null }) {
    return this.posts.getPostLikes(id, request.user?.userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('type') reactionType?: string,
  ) {
    return this.posts.toggleLike(request.user.userId, id, reactionType);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor(multiImageUploadOptions))
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const text = dto.content !== undefined ? dto.content.trim() : undefined;
    const allFiles = files && files.length > 0 ? files : [];
    const imagesFieldFiles = allFiles.filter((f) => f.fieldname === 'images');
    const filesToUpload = imagesFieldFiles.length > 0 ? imagesFieldFiles : allFiles;

    const newImageUrls: string[] = [];
    if (filesToUpload.length > 0) {
      const uploadPromises = filesToUpload.map((img) => this.cloudinary.uploadImage(img, 'social-app/posts'));
      const results = await Promise.all(uploadPromises);
      newImageUrls.push(...results);
    }

    let retainedImages: string[] | undefined = undefined;
    if (dto.existingImageUrls !== undefined) {
      if (Array.isArray(dto.existingImageUrls)) {
        retainedImages = dto.existingImageUrls;
      } else if (typeof dto.existingImageUrls === 'string') {
        try {
          const parsed = JSON.parse(dto.existingImageUrls);
          if (Array.isArray(parsed)) retainedImages = parsed;
          else if (parsed) retainedImages = [String(parsed)];
        } catch {
          retainedImages = dto.existingImageUrls ? [dto.existingImageUrls] : [];
        }
      }
    }

    let mentionedList: string[] = [];
    if (Array.isArray(dto.mentionedUsernames)) {
      mentionedList = dto.mentionedUsernames;
    } else if (typeof dto.mentionedUsernames === 'string') {
      try {
        const parsed = JSON.parse(dto.mentionedUsernames);
        if (Array.isArray(parsed)) mentionedList = parsed;
        else if (typeof parsed === 'string') mentionedList = [parsed];
      } catch {
        mentionedList = [dto.mentionedUsernames];
      }
    }

    return this.posts.update(request.user.userId, id, text, newImageUrls, retainedImages, mentionedList);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.posts.remove(request.user.userId, id);
  }
}
