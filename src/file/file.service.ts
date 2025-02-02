import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as fs from "fs";
import { FileUpload } from "graphql-upload-ts";
import * as path from "path";
import * as uuid from "uuid";

export enum FileType {
  MEAL_IMAGE = "meal-images",
  AVATAR = "avatar",
}

@Injectable()
export class FileService {
  async createFile(type: FileType, file: Promise<FileUpload> | null): Promise<string | undefined> {
    if (!file) {
      return undefined;
    }

    try {
      const uploadedFile = await file;
      const { createReadStream, filename, mimetype } = uploadedFile;

      if (!mimetype.startsWith("image/")) {
        throw new HttpException("Неверный формат файла", HttpStatus.BAD_REQUEST);
      }

      const fileExtension = path.extname(filename);
      const fileName = `${uuid.v4()}${fileExtension}`;
      const filePath = path.resolve(process.cwd(), "uploads", type);

      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }

      const writeStream = fs.createWriteStream(path.join(filePath, fileName));

      return new Promise((resolve, reject) => {
        const stream = createReadStream();

        stream.on("error", error => {
          console.error("Ошибка при чтении потока:", error);
          reject(error);
        });

        writeStream.on("error", error => {
          console.error("Ошибка при записи файла:", error);
          reject(error);
        });

        writeStream.on("finish", () => {
          resolve(`${type}/${fileName}`);
        });

        stream.pipe(writeStream);
      });
    } catch (e) {
      console.error("Ошибка при создании файла:", e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  removeFile(fileName: string) {
    try {
      const filePath = path.resolve(process.cwd(), "uploads", fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
