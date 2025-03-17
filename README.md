# CF_Download_Proxy

A secure proxy service built on the Cloudflare network that allows users to download content through the proxy, ensuring enhanced security and privacy.

<div dir="rtl">
یک سرویس پروکسی امن که بر روی شبکه Cloudflare ساخته شده است و به کاربران امکان می‌دهد محتوا را از طریق پروکسی دانلود کنند، امنیت و حریم خصوصی را تضمین می‌کند.
</div>

## Overview | مرور کلی

This project provides a proxy solution for downloading content through the Cloudflare network. It's designed to offer secure and private access to various online resources through a clean and user-friendly interface.

<div dir="rtl">
این پروژه یک راه‌حل پروکسی برای دانلود محتوا از طریق شبکه Cloudflare ارائه می‌دهد. این سرویس طراحی شده است تا دسترسی امن و خصوصی به منابع مختلف آنلاین را از طریق یک رابط کاربری تمیز و کاربرپسند ارائه دهد.
</div>

## Note for Iranian Users | توجه برای کاربران ایرانی

Iranian users can access our services at half bandwidth using the services of this site: [https://cdn.ir/](https://cdn.ir/)

<div dir="rtl">
کاربران ایرانی می‌توانند با استفاده از سرویس های این سایت، به سرویس ما به صورت نیم بها دسترسی پیدا کنند: https://cdn.ir

</div>

## Features | ویژگی‌ها

- **Multi-URL Processing**: Process multiple URLs simultaneously (one per line)
- **URL Encoding**: Automatic base64 encoding for secure URL processing
- **Range Request Support**: Resume downloading capabilities with range requests for large files
- **Responsive Design**: Works seamlessly across various devices and screen sizes
- **Bulk Actions**: Copy all proxied links or download them as a text file
- **Multi-language Support**: Available in English and Persian (Farsi)

<div dir="rtl">

- **پردازش چند URL**: پردازش همزمان چندین URL (هر کدام در یک خط)
- **کدگذاری URL**: کدگذاری خودکار به base64 برای پردازش امن URLها
- **پشتیبانی از درخواست‌های محدوده (Range)**: قابلیت ادامه دانلود با درخواست‌های محدوده برای فایل‌های بزرگ
- **طراحی واکنش‌گرا**: کارکرد روان روی دستگاه‌ها و اندازه‌های صفحه مختلف
- **اقدامات دسته‌ای**: کپی تمام لینک‌های پروکسی شده یا دانلود آن‌ها به عنوان یک فایل متنی  
- **پشتیبانی چند زبانه**: در دسترس به زبان‌های انگلیسی و فارسی
</div>

## Usage | استفاده

1. Enter the URLs you want to proxy (one per line) in the text area.
2. Click "Process URLs" to generate proxied links.
3. For each URL, you can:
   - Click "Download" to access the content through the proxy
   - Click "Copy Link" to copy the proxied URL to your clipboard
4. Use bulk actions to:
   - Copy all proxied links at once
   - Download all links as a text file

<div dir="rtl">

1. لینک هایی که می‌خواهید پروکسی کنید (هر لینک در یک خط) را در ناحیه متنی وارد کنید.
2. برای تولید لینک‌های پروکسی شده، روی "پردازش لینک ها" کلیک کنید.
3. برای هر لینک، می‌توانید:
   - روی "دانلود" کلیک کنید تا به محتوا از طریق پروکسی دسترسی پیدا کنید
   - روی "کپی لینک" کلیک کنید تا لینک پروکسی شده را در کلیپ‌بورد خود کپی کنید
4. از اقدامات دسته‌ای استفاده کنید برای:
   - کپی کردن تمام لینک‌های پروکسی شده به یکباره
   - دانلود تمام لینک‌ها به عنوان یک فایل متنی
</div>

To make your website half-bandwidth (for Iranian internet users), you first need to add a custom domain to your Worker or Pages. Then, register it in the cdn.ir system under the "Cloud Distribution" section. After that, place your half-bandwidth domain in the second line of the worker.js_ file.

## Note | نکته
Please edit the second line of the worker.js_ file and enter your Worker or half-bandwidth domain.

لطفا خط دوم فایل worker.js_ رو ویرایش کنید و دامنه پیجتون یا نیم بها رو وارد کنید.



 
## نیم بها کردن سایت
برای نیم بها کردن سایتتون اول باید یک Custom domain به ورکر یا Pages خودتون اضافه کنید و اون رو در سامانه cdn.ir قسمت توزیع ابری اضافه کنید و بعد از اون دامنه نمیبهاتون رو در خط دوم فایل worker.js_ قرار بدین.


## Contact
Since this code was written with the help of AI, it may have Bugs.
For any questions or feedback, please open an issue or contact the [repository owner](https://GeekSpotSupbot.t.me).


## Share and Join my channel 🫂🤍
  <a href="https://t.me/Geek_Spot" target="_blank"><img src="https://anokhanews.com/wp-content/uploads/2024/06/2i8mVvNFBHDJ7t5FTJF8b1uontK.svg" width="150" alt="Join my Channel!"></a>
