# YouTube ဗီဒီယိုလင့်ခ် သိမ်းဆည်းမှု ပြင်ဆင်နည်း

ဒီအပိုင်းက YouTube မှ အများမြင်ဗီဒီယိုရှာဖွေမှုရလဒ်များထဲမှ URL၊ ခေါင်းစဉ်နဲ့ ချန်နယ်အမည်ကိုသာ TiDB ထဲ သိမ်းဆည်းပါတယ်။ ဗီဒီယိုဖိုင်ကို ဒေါင်းလုဒ်မလုပ်ပါ၊ တခြားနေရာသို့ အလိုအလျောက် မတင်ပါ။ ရလဒ်တိုင်းကို `pending` အဖြစ်ထားပြီး ပြန်လည်အသုံးပြုခွင့်ကို `unverified` အဖြစ် မှတ်သားပါတယ်။

## နေ့စဉ် လုပ်ဆောင်မည့်အချိန်

Cloudflare Worker Cron ကို `30 2 * * *` UTC ဟု သတ်မှတ်ထားပါတယ်။ မြန်မာစံတော်ချိန်အရ နေ့စဉ် နံနက် ၉:၀၀ ဖြစ်ပါတယ်။ တစ်ကြိမ်လုပ်ဆောင်ရာတွင် ရှာဖွေရေးစကားစု ၅ ခုကို အသုံးပြုပြီး စကားစုတစ်ခုစီအတွက် ရလဒ် ၁၀ ခုအထိ ရယူပါတယ်။ YouTube ၏ တရားဝင်စာတမ်းအရ `search.list` ကို တစ်နေ့လျှင် ပုံမှန်အားဖြင့် ၁၀၀ ကြိမ်ခေါ်နိုင်ပြီး ခေါ်ဆိုမှုတစ်ကြိမ်လျှင် quota unit ၁ ခု သုံးပါတယ်။ ဒီပြင်ဆင်မှုက တစ်နေ့လျှင် ၅ ကြိမ်သာ ခေါ်ပါတယ်။

`regionCode=MM` သည် မြန်မာနိုင်ငံအတွင်း ကြည့်ရှုနိုင်သော ဗီဒီယိုများကို ရှာရန် သတ်မှတ်ချက်ဖြစ်ပါတယ်။ `relevanceLanguage=my` သည် မြန်မာဘာသာဖြင့် ဆက်စပ်မှုရှိသောရလဒ်များကို ဦးစားပေးရန်ဖြစ်ပြီး ဘာသာစကားကို တိတိကျကျ စစ်ထုတ်ခြင်းမဟုတ်ပါ။ ဤသတ်မှတ်ချက်များက ဗီဒီယိုကို မြန်မာနိုင်ငံတွင် ရိုက်ကူးထားသည်ဟု မဆိုလိုပါ။ ပြန်လည်အသုံးပြုခွင့်ကို လူက သီးခြားစစ်ဆေးရပါမယ်။

## တစ်ကြိမ်သာ ပြင်ဆင်ရမည့်အရာများ

1. TiDB Cloud Serverless ၏ SQL Editor ထဲတွင် `001_create_event_video_links.sql` ကို တစ်ကြိမ်လုပ်ဆောင်ပြီး ဇယားကို ဖန်တီးပါ။
2. Google Cloud project ထဲတွင် YouTube Data API v3 ကို ဖွင့်ပြီး API key တစ်ခု ဖန်တီးပါ။ ထို key ကို YouTube Data API v3 အတွက်သာ အသုံးပြုနိုင်အောင် ကန့်သတ်ပါ။
3. Cloudflare Dashboard → Workers & Pages → `zin-portfolio-live` → Settings → Variables and Secrets မှာ အောက်ပါနှစ်ခုကို **Secret** အဖြစ် ထည့်ပါ။
   - `TIDB_DATABASE_URL` — TiDB Serverless ချိတ်ဆက် URL။
   - `YOUTUBE_DATA_API_KEY` — YouTube Data API key။
4. လျှို့ဝှက်တန်ဖိုးများကို ဒီ chat ထဲ မပို့ပါနဲ့။ Secrets နဲ့ ဇယားကို ပြင်ဆင်ပြီးပါက နောက်တစ်ကြိမ် နေ့စဉ် နံနက် ၉ နာရီတွင် အလိုအလျောက်ရှာပါမယ်။

TiDB URL သို့မဟုတ် YouTube API key မရှိပါက၊ သို့မဟုတ် TiDB ဇယား မရှိပါက၊ Cron က အကြောင်းရင်းကို လျှို့ဝှက်ချက်မပါဘဲ မှတ်တမ်းတင်ပြီး ရှာဖွေမှုကို ကျော်သွားပါမယ်။ ထိုအခါ YouTube API ကို မခေါ်ပါ။

## သိမ်းဆည်းမည့်အချက်အလက်

`event_video_links` ဇယားမှာ ဗီဒီယို URL၊ platform၊ ခေါင်းစဉ်၊ ချန်နယ်အမည်၊ တွေ့ရှိစေသော ရှာဖွေရေးစကားစု၊ license အမည်ရရှိပါက ထိုအမည်၊ စစ်ဆေးမှုအခြေအနေနှင့် ပထမ/နောက်ဆုံးတွေ့ရှိချိန်တို့ကို သိမ်းပါတယ်။ URL hash ကို အသုံးပြုပြီး ထပ်နေသော link များကို တစ်ခုတည်းအဖြစ် စုစည်းပါတယ်။

**အများမြင်နိုင်ခြင်း သို့မဟုတ် မြန်မာနိုင်ငံတွင် ကြည့်ရှုနိုင်ခြင်းသည် ဒေါင်းလုဒ်လုပ်ခွင့်၊ ပြန်တင်ခွင့် သို့မဟုတ် ပြန်လည်အသုံးပြုခွင့်ကို မပေးပါ။**

## တရားဝင်စာတမ်းများ

- https://developers.google.com/youtube/v3/docs/search/list
- https://developers.google.com/youtube/v3/determine_quota_cost
- https://developers.cloudflare.com/workers/configuration/cron-triggers/


The Worker sends `YOUTUBE_DATA_API_KEY` in Google's recommended `X-Goog-Api-Key` HTTP header; the key is not added to the request URL or returned in application logs. Google API key security guidance: https://docs.cloud.google.com/docs/authentication/api-keys-best-practices
