import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // သို့မဟုတ် မင်းသုံးထားတဲ့ DB client

const prisma = new PrismaClient();

// မြန်မာဂဏန်းတွေကို အင်္ဂလိပ်ဂဏန်း ပြောင်းပေးမည့် Helper
function mmToEnNumbers(str) {
  const mmNums = { '၀':'0', '၁':'1', '၂':'2', '၃':'3', '၄':'4', '၅':'5', '၆':'6', '၇':'7', '၈':'8', '၉':'9' };
  return str.replace(/[၀-၉]/g, m => mmNums[m]);
}

export async function POST(request) {
  try {
    const data = await request.json();
    const rawText = data.text || ""; // MacroDroid က ပို့မည့် စာသား
    const rawTitle = data.title || "KBZPay Notification";

    if (!rawText) {
      return NextResponse.json({ success: false, error: "No text provided" }, { status: 400 });
    }

    // ၁။ စာသားထဲက ကော်မာ (,) တွေကို ဖြုတ်၊ မြန်မာဂဏန်းတွေကို အင်္ဂလိပ်ပြောင်း
    const cleanText = mmToEnNumbers(rawText).replace(/,/g, '');
    
    // ၂။ Regex သုံးပြီး ငွေပမာဏ ဂဏန်းသီးသန့်ကို ဖြတ်ထုတ်ခြင်း
    const amountMatch = cleanText.match(/\d+/); 
    const amount = amountMatch ? parseInt(amountMatch[0]) : 0;

    // ၃။ Database ရဲ့ UnverifiedKpay Table ထဲကို လှမ်းသိမ်းမည်
    const newKpayLog = await prisma.unverifiedKpay.create({
      data: {
        raw_text: rawText,
        amount: amount,
        status: "PENDING" // ဒီကောင်က မင်း UI က Unverified KPay Bucket ထဲ တန်းပေါ်လာစေမယ့် Status
      }
    });

    // ၄။ (Optional) ဖေဖေ့ Telegram Bot ဆီကို စာလှမ်းပို့ချင်ရင် ဒီမှာ ချိတ်ပါ
    // await sendTelegramNotification(amount, rawText);

    return NextResponse.json({ 
      success: true, 
      message: "Data synced successfully", 
      extracted_amount: amount 
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
