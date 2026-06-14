// =============================================================================
// TELEGRAM BOT — Widi Expense Tracker
// =============================================================================
// Bot ini adalah cara utama input transaksi.
//
// Cara pakai:
//   Ketik langsung:  makan 25k
//   Commands:        /saldo, /ringkasan, /help
//
// Flow input transaksi:
//   1. User ketik "makan 25k"
//   2. Bot parse → tampilkan preview + tombol konfirmasi
//   3. User tap ✅ Simpan → transaksi masuk database
//   4. Bot tampilkan konfirmasi + saldo terkini
// =============================================================================

import { Bot, InlineKeyboard, Context } from "grammy";
import { api, Wallet, Category } from "./lib/api";
import {
  parseMessage,
  formatIDR,
  ParsedMessage,
  getCategoryList,
} from "./lib/parser";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN belum diset di .env");
  process.exit(1);
}

if (!ALLOWED_USER_ID) {
  console.error("❌ TELEGRAM_USER_ID wajib diset agar bot hanya merespon akun Anda");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ---------------------------------------------------------------------------
// State — Menyimpan transaksi yang belum dikonfirmasi
// ---------------------------------------------------------------------------
// Key: chatId, Value: data transaksi pending
// Karena ini bot personal (1 user), Map sederhana sudah cukup.

interface PendingTransaction {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  walletId: string;
  walletName: string;
  categoryId: string;
  categoryName: string;
  toWalletId?: string;
  toWalletName?: string;
}

const pendingTransactions = new Map<number, PendingTransaction>();

// ---------------------------------------------------------------------------
// Security — Hanya respon user yang diizinkan
// ---------------------------------------------------------------------------

bot.use(async (ctx, next) => {
  if (ctx.from?.id.toString() !== ALLOWED_USER_ID) {
    await ctx.reply("⛔ Bot ini hanya untuk penggunaan pribadi.");
    return;
  }
  await next();
});

// ---------------------------------------------------------------------------
// /start — Welcome message
// ---------------------------------------------------------------------------

bot.command("start", async (ctx) => {
  await ctx.reply(
    `💰 *Widi Expense Tracker*\n\n` +
      `Halo\\! Saya bot pencatat keuangan pribadi Anda\\.\n\n` +
      `*Cara pakai:*\n` +
      `Ketik langsung untuk catat pengeluaran:\n` +
      `\`makan 25k\`\n` +
      `\`kopi starbucks 45000\`\n` +
      `\`gaji 8jt\`\n` +
      `\`grab kantor 15rb\`\n\n` +
      `*Commands:*\n` +
      `/saldo — Lihat saldo semua wallet\n` +
      `/ringkasan — Ringkasan bulan ini\n` +
      `/help — Bantuan lengkap`,
    { parse_mode: "MarkdownV2" }
  );
});

// ---------------------------------------------------------------------------
// /help — Panduan lengkap
// ---------------------------------------------------------------------------

bot.command("help", async (ctx) => {
  await ctx.reply(
    `📖 *Panduan Penggunaan*\n\n` +
      `*Format Input:*\n` +
      `\\[deskripsi\\] \\[jumlah\\]\n\n` +
      `*Contoh Pengeluaran:*\n` +
      `\`makan siang 25k\`\n` +
      `\`bensin 50rb\`\n` +
      `\`netflix 54000\`\n\n` +
      `*Contoh Pemasukan:*\n` +
      `\`gaji 8jt\`\n` +
      `\`freelance 2.5jt\`\n` +
      `\`cashback 15k\`\n\n` +
      `*Format Angka:*\n` +
      `• 25000 atau 25k atau 25rb\n` +
      `• 2500000 atau 2\\.5jt\n\n` +
      `*Commands:*\n` +
      `/saldo — Saldo semua wallet\n` +
      `/ringkasan — Ringkasan bulan ini\n` +
      `/wallet — Ganti default wallet\n` +
      `/batal — Batalkan input terakhir`,
    { parse_mode: "MarkdownV2" }
  );
});

// ---------------------------------------------------------------------------
// /saldo — Tampilkan saldo semua wallet
// ---------------------------------------------------------------------------

bot.command("saldo", async (ctx) => {
  try {
    const wallets = await api.getWallets();

    if (wallets.length === 0) {
      await ctx.reply("Belum ada wallet. Setup lewat dashboard.");
      return;
    }

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    let message = `💰 *Saldo Wallet*\n\n`;

    // Group by type
    const groups: Record<string, Wallet[]> = {};
    for (const w of wallets) {
      const group = w.type === "BANK" ? "🏦 Bank" :
                    w.type === "DIGITAL_BANK" ? "📱 Bank Digital" :
                    w.type === "EWALLET" ? "💳 E-Wallet" : "💵 Cash";
      if (!groups[group]) groups[group] = [];
      groups[group].push(w);
    }

    for (const [group, items] of Object.entries(groups)) {
      message += `*${escMd(group)}*\n`;
      for (const w of items) {
        const bal = formatIDR(w.balance);
        message += `  ${w.icon || "•"} ${escMd(w.name)}: ${escMd(bal)}\n`;
      }
      message += `\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `*Total: ${escMd(formatIDR(totalBalance))}*`;

    await ctx.reply(message, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error /saldo:", error);
    await ctx.reply("❌ Gagal mengambil data saldo. Pastikan backend API berjalan.");
  }
});

// ---------------------------------------------------------------------------
// /ringkasan — Ringkasan keuangan bulan ini
// ---------------------------------------------------------------------------

bot.command("ringkasan", async (ctx) => {
  try {
    const dashboard = await api.getDashboard();

    const income = formatIDR(dashboard.monthlyIncome);
    const expense = formatIDR(dashboard.monthlyExpense);
    const net = formatIDR(dashboard.monthlyNet);
    const netEmoji = dashboard.monthlyNet >= 0 ? "📈" : "📉";

    let message =
      `📊 *Ringkasan Bulan Ini*\n\n` +
      `💰 Pemasukan:  ${escMd(income)}\n` +
      `💸 Pengeluaran: ${escMd(expense)}\n` +
      `${netEmoji} Selisih:     ${escMd(net)}\n`;

    if (dashboard.expenseByCategory.length > 0) {
      message += `\n*Pengeluaran per Kategori:*\n`;
      for (const cat of dashboard.expenseByCategory.slice(0, 8)) {
        const total = formatIDR(cat.total);
        message += `  ${cat.categoryIcon || "•"} ${escMd(cat.categoryName)}: ${escMd(total)}\n`;
      }
    }

    if (dashboard.recentTransactions.length > 0) {
      message += `\n*5 Transaksi Terakhir:*\n`;
      for (const tx of dashboard.recentTransactions.slice(0, 5)) {
        const emoji = tx.type === "INCOME" ? "💰" : tx.type === "EXPENSE" ? "💸" : "🔄";
        const amt = formatIDR(tx.amount);
        const desc = tx.description || tx.categoryName || "-";
        message += `  ${emoji} ${escMd(desc)} — ${escMd(amt)}\n`;
      }
    }

    await ctx.reply(message, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error /ringkasan:", error);
    await ctx.reply("❌ Gagal mengambil ringkasan. Pastikan backend API berjalan.");
  }
});

// ---------------------------------------------------------------------------
// /batal — Batalkan transaksi pending
// ---------------------------------------------------------------------------

bot.command("batal", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId && pendingTransactions.has(chatId)) {
    pendingTransactions.delete(chatId);
    await ctx.reply("❌ Transaksi dibatalkan.");
  } else {
    await ctx.reply("Tidak ada transaksi yang menunggu konfirmasi.");
  }
});

// ---------------------------------------------------------------------------
// Text Message Handler — Parse & preview transaksi
// ---------------------------------------------------------------------------

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  const chatId = ctx.chat.id;

  // Parse pesan
  const parsed = parseMessage(text);

  if (!parsed) {
    // Pesan tidak bisa di-parse sebagai transaksi
    await ctx.reply(
      "🤔 Format tidak dikenali\\.\n\n" +
        "Ketik: `deskripsi jumlah`\n" +
        "Contoh: `makan 25k`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // Ambil daftar wallet untuk default
  let wallets: Wallet[];
  try {
    wallets = await api.getWallets();
  } catch {
    await ctx.reply("❌ Backend API tidak bisa diakses. Pastikan server berjalan.");
    return;
  }

  const defaultWallet = wallets[0]; // Cash sebagai default
  if (!defaultWallet) {
    await ctx.reply("❌ Belum ada wallet. Jalankan seed database dulu.");
    return;
  }

  // Simpan ke pending
  const pending: PendingTransaction = {
    type: parsed.type,
    amount: parsed.amount,
    description: parsed.description,
    walletId: defaultWallet.id,
    walletName: defaultWallet.name,
    categoryId: parsed.suggestedCategoryId,
    categoryName: parsed.suggestedCategoryName,
  };

  pendingTransactions.set(chatId, pending);

  // Tampilkan preview dengan tombol
  const typeEmoji = pending.type === "INCOME" ? "💰" : "💸";
  const typeLabel = pending.type === "INCOME" ? "Pemasukan" : "Pengeluaran";

  const keyboard = new InlineKeyboard()
    .text("✅ Simpan", "confirm")
    .text("❌ Batal", "cancel")
    .row()
    .text("🏷️ Kategori", "change_category")
    .text("💳 Wallet", "change_wallet");

  await ctx.reply(
    `${typeEmoji} *${escMd(typeLabel)}*\n\n` +
      `💵 ${escMd(formatIDR(pending.amount))}\n` +
      `📝 ${escMd(pending.description)}\n` +
      `🏷️ ${escMd(pending.categoryName)}\n` +
      `💳 ${escMd(pending.walletName)}\n\n` +
      `Tap ✅ untuk simpan atau ubah detail\\.`,
    { parse_mode: "MarkdownV2", reply_markup: keyboard }
  );
});

// ---------------------------------------------------------------------------
// Callback: Confirm — Simpan transaksi
// ---------------------------------------------------------------------------

bot.callbackQuery("confirm", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pending = pendingTransactions.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery("Transaksi sudah kadaluarsa.");
    return;
  }

  try {
    await api.createTransaction({
      type: pending.type,
      amount: pending.amount,
      description: pending.description,
      walletId: pending.walletId,
      categoryId: pending.categoryId,
    });

    pendingTransactions.delete(chatId);

    // Ambil saldo terbaru
    const wallets = await api.getWallets();
    const wallet = wallets.find((w) => w.id === pending.walletId);
    const balance = wallet ? formatIDR(wallet.balance) : "?";

    await ctx.editMessageText(
      `✅ *Tersimpan\\!*\n\n` +
        `${pending.type === "INCOME" ? "💰" : "💸"} ${escMd(formatIDR(pending.amount))}\n` +
        `📝 ${escMd(pending.description)}\n` +
        `🏷️ ${escMd(pending.categoryName)}\n` +
        `💳 ${escMd(pending.walletName)} — Saldo: ${escMd(balance)}`,
      { parse_mode: "MarkdownV2" }
    );

    await ctx.answerCallbackQuery("✅ Tersimpan!");
  } catch (error) {
    console.error("Error saving transaction:", error);
    await ctx.answerCallbackQuery("❌ Gagal menyimpan!");
    await ctx.reply("❌ Gagal menyimpan transaksi. Cek log backend.");
  }
});

// ---------------------------------------------------------------------------
// Callback: Cancel — Batalkan
// ---------------------------------------------------------------------------

bot.callbackQuery("cancel", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) pendingTransactions.delete(chatId);

  await ctx.editMessageText("❌ Transaksi dibatalkan.");
  await ctx.answerCallbackQuery();
});

// ---------------------------------------------------------------------------
// Callback: Change Category — Tampilkan pilihan kategori
// ---------------------------------------------------------------------------

bot.callbackQuery("change_category", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId || !pendingTransactions.has(chatId)) {
    await ctx.answerCallbackQuery("Transaksi kadaluarsa.");
    return;
  }

  const pending = pendingTransactions.get(chatId)!;
  const categories = getCategoryList().filter(
    (c) => c.type === pending.type
  );

  const keyboard = new InlineKeyboard();
  for (let i = 0; i < categories.length; i++) {
    keyboard.text(
      `${categories[i].icon} ${categories[i].name.replace(/^[^\s]+ /, "")}`,
      `cat:${categories[i].id}`
    );
    if (i % 2 === 1) keyboard.row(); // 2 tombol per baris
  }
  keyboard.row().text("⬅️ Kembali", "back_to_preview");

  await ctx.editMessageText("🏷️ Pilih kategori:", {
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// ---------------------------------------------------------------------------
// Callback: Select Category
// ---------------------------------------------------------------------------

bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pending = pendingTransactions.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery("Transaksi kadaluarsa.");
    return;
  }

  const categoryId = ctx.match![1];
  const categories = getCategoryList();
  const selected = categories.find((c) => c.id === categoryId);

  if (selected) {
    pending.categoryId = selected.id;
    pending.categoryName = selected.name;
    pendingTransactions.set(chatId, pending);
  }

  // Kembali ke preview
  await showPreview(ctx, pending);
  await ctx.answerCallbackQuery(`✅ ${selected?.name || "Updated"}`);
});

// ---------------------------------------------------------------------------
// Callback: Change Wallet — Tampilkan pilihan wallet
// ---------------------------------------------------------------------------

bot.callbackQuery("change_wallet", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId || !pendingTransactions.has(chatId)) {
    await ctx.answerCallbackQuery("Transaksi kadaluarsa.");
    return;
  }

  let wallets: Wallet[];
  try {
    wallets = await api.getWallets();
  } catch {
    await ctx.answerCallbackQuery("❌ Gagal ambil daftar wallet");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (let i = 0; i < wallets.length; i++) {
    keyboard.text(
      `${wallets[i].icon || "•"} ${wallets[i].name}`,
      `wal:${wallets[i].id}`
    );
    if (i % 2 === 1) keyboard.row();
  }
  keyboard.row().text("⬅️ Kembali", "back_to_preview");

  await ctx.editMessageText("💳 Pilih wallet:", {
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// ---------------------------------------------------------------------------
// Callback: Select Wallet
// ---------------------------------------------------------------------------

bot.callbackQuery(/^wal:(.+)$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pending = pendingTransactions.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery("Transaksi kadaluarsa.");
    return;
  }

  const walletId = ctx.match![1];
  let wallets: Wallet[];
  try {
    wallets = await api.getWallets();
  } catch {
    await ctx.answerCallbackQuery("❌ Error");
    return;
  }

  const selected = wallets.find((w) => w.id === walletId);
  if (selected) {
    pending.walletId = selected.id;
    pending.walletName = selected.name;
    pendingTransactions.set(chatId, pending);
  }

  await showPreview(ctx, pending);
  await ctx.answerCallbackQuery(`✅ ${selected?.name || "Updated"}`);
});

// ---------------------------------------------------------------------------
// Callback: Back to Preview
// ---------------------------------------------------------------------------

bot.callbackQuery("back_to_preview", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pending = pendingTransactions.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery("Transaksi kadaluarsa.");
    return;
  }

  await showPreview(ctx, pending);
  await ctx.answerCallbackQuery();
});

// ---------------------------------------------------------------------------
// Helper: Tampilkan preview transaksi
// ---------------------------------------------------------------------------

async function showPreview(ctx: Context, pending: PendingTransaction) {
  const typeEmoji = pending.type === "INCOME" ? "💰" : "💸";
  const typeLabel = pending.type === "INCOME" ? "Pemasukan" : "Pengeluaran";

  const keyboard = new InlineKeyboard()
    .text("✅ Simpan", "confirm")
    .text("❌ Batal", "cancel")
    .row()
    .text("🏷️ Kategori", "change_category")
    .text("💳 Wallet", "change_wallet");

  await ctx.editMessageText(
    `${typeEmoji} *${escMd(typeLabel)}*\n\n` +
      `💵 ${escMd(formatIDR(pending.amount))}\n` +
      `📝 ${escMd(pending.description)}\n` +
      `🏷️ ${escMd(pending.categoryName)}\n` +
      `💳 ${escMd(pending.walletName)}\n\n` +
      `Tap ✅ untuk simpan atau ubah detail\\.`,
    { parse_mode: "MarkdownV2", reply_markup: keyboard }
  );
}

// ---------------------------------------------------------------------------
// Helper: Escape MarkdownV2 special characters
// ---------------------------------------------------------------------------

function escMd(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ---------------------------------------------------------------------------
// Start Bot
// ---------------------------------------------------------------------------

bot.catch((err) => {
  console.error("❌ Bot error:", err);
});

bot.start({
  onStart: () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🤖 Widi Expense Bot — Running!            ║
║   📱 Open Telegram and start chatting        ║
╚══════════════════════════════════════════════╝
`);
  },
});
