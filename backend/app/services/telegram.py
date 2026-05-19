from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes


class TelegramNotifier:
    def __init__(self, token: str) -> None:
        self.token = token
        self.wallet_to_chat: dict[str, int] = {}
        self.app: Application | None = None

    async def start(self) -> None:
        if not self.token:
            return
        self.app = Application.builder().token(self.token).build()
        self.app.add_handler(CommandHandler("link", self.link_wallet))
        await self.app.initialize()
        await self.app.start()
        await self.app.updater.start_polling()

    async def stop(self) -> None:
        if not self.app:
            return
        await self.app.updater.stop()
        await self.app.stop()
        await self.app.shutdown()

    async def link_wallet(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat or not update.message:
            return
        if not context.args:
            await update.message.reply_text("Use /link 0xYourWalletAddress")
            return
        wallet = context.args[0].lower()
        if not wallet.startswith("0x") or len(wallet) != 42:
            await update.message.reply_text("That wallet address does not look valid.")
            return
        self.wallet_to_chat[wallet] = update.effective_chat.id
        await update.message.reply_text(f"Linked {wallet}. Trade alerts are now active.")

    async def notify(self, wallet: str, message: str) -> None:
        if not self.app:
            return
        chat_id = self.wallet_to_chat.get(wallet.lower())
        if chat_id:
            await self.app.bot.send_message(chat_id=chat_id, text=message)
