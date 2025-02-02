import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectBot } from "nestjs-telegraf";
import { Telegraf } from "telegraf";
import { InputMediaPhoto } from "telegraf/typings/core/types/typegram";

@Injectable()
export class TelegramServiceClient {
  constructor(
    @InjectBot() private bot: Telegraf,
    private configService: ConfigService,
  ) {}

  async sendMessage(chatId: string, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  async sendMessageWithKeyboard(chatId: string, text: string, keyboard: any) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error("Error sending message with keyboard:", error);
      throw error;
    }
  }

  async sendDocument(chatId: string, buffer: Buffer, filename: string, caption: string) {
    try {
      await this.bot.telegram.sendDocument(
        chatId,
        {
          source: buffer,
          filename,
        },
        {
          caption,
        },
      );
    } catch (error) {
      console.error("Error sending document:", error);
      throw error;
    }
  }

  async sendPdfAlbumWithPaymentButton(chatId: string, pdfBuffer: Buffer, caption: string, buttonText: string, buttonUrl: string) {
    try {
      console.log("Отправка PDF альбома пользователю", chatId);
      console.log("URL для оплаты:", buttonUrl);

      await this.bot.telegram.sendDocument(
        chatId,
        {
          source: pdfBuffer,
          filename: "album.pdf",
        },
        {
          caption,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Получить физическую копию альбома (4990₽)",
                  url: buttonUrl,
                },
              ],
            ],
          },
        },
      );

      console.log("PDF альбом успешно отправлен с кнопкой заказа физической копии");
    } catch (error) {
      console.error("Ошибка при отправке PDF альбома:", error);
      return this.sendDocument(chatId, pdfBuffer, "album.pdf", caption);
    }
  }

  async sendMediaGroup(chatId: string, media: InputMediaPhoto[]) {
    try {
      await this.bot.telegram.sendMediaGroup(chatId, media);
    } catch (error) {
      console.error("Ошибка при отправке медиа группы:", error);
      throw error;
    }
  }

  async sendVoice(chatId: string, buffer: Buffer, extra?: any) {
    try {
      await this.bot.telegram.sendVoice(chatId, { source: buffer }, extra);
    } catch (error) {
      console.error("Error sending voice:", error);
      throw error;
    }
  }

  async getFile(fileId: string) {
    return await this.bot.telegram.getFile(fileId);
  }

  async sendPhoto(chatId: string, photo: any, extra?: any) {
    return await this.bot.telegram.sendPhoto(chatId, photo, extra);
  }
}
