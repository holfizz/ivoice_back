import { FileModule } from "@/file/file.module";
import { FileService } from "@/file/file.service";
import { PrismaService } from "@/prisma.service";
import { Module } from "@nestjs/common";
import { UserResolver } from "./user.resolver";
import { UserService } from "./user.service";

@Module({
  providers: [UserService, PrismaService, FileService, UserResolver],
  exports: [UserService],
  imports: [FileModule],
})
export class UserModule {}
