import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('suggestions')
  suggestions(@Req() request: { user?: AuthenticatedUser | null }) {
    return this.users.getSuggestions(request.user?.userId);
  }

  @Get('search')
  searchUsers(@Query('q') query?: string) {
    return this.users.searchUsers(query || '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/connections')
  connections(@Req() request: { user: AuthenticatedUser }) {
    return this.users.getMyConnections(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/relationship')
  relationship(@Req() request: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.users.relationship(request.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  follow(@Req() request: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.users.follow(request.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollow(@Req() request: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.users.unfollow(request.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/friend')
  addFriend(@Req() request: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.users.addFriend(request.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/friend')
  removeFriend(@Req() request: { user: AuthenticatedUser }, @Param('id', ParseIntPipe) id: number) {
    return this.users.removeFriend(request.user.userId, id);
  }

  @Get(':id/media-post')
  getMediaPost(
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type?: 'avatar' | 'cover',
  ) {
    return this.users.getMediaPost(id, type === 'cover' ? 'cover' : 'avatar');
  }

  @Get('by-username/:username')
  profileByUsername(@Param('username') username: string) {
    return this.users.publicProfile(username);
  }

  @Get(':username')
  profile(@Param('username') username: string) {
    return this.users.publicProfile(username);
  }
}

