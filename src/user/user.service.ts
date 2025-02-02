import { FileService } from "@/file/file.service";
import { PrismaService } from "@/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { FileUpload } from "graphql-upload-ts";
import { UpdateUserInput } from "./dto/update-user.input";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  async byId(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(id: string, updateUserDto: UpdateUserInput, picture: FileUpload) {
    try {
      let avatarPath: string | undefined = undefined;

      if (picture) {
      }

      const data = {
        ...updateUserDto,
      };

      return this.prisma.user.update({
        where: {
          id: id,
        },
        data,
      });
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    return user;
  }
}
