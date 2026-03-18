Satış Offline Android layihəsi
=============================

Bu qovluqda sənin Excel məntiqinə uyğun hazırlanmış tam offline mobil layihə var.

Nə işləyir:
- Müştəri əlavə et / düzəlt
- Müştəriyə özəl qiymət yaz
- Məhsul və stok idarəsi
- Satış əlavə et
- Satış zamanı alınan pul
- Borc hesablanması
- Sonradan əlavə ödəniş daxil et
- İadə / əvəz qeydi
- Cari stok hesabı
- Müştəri xülasəsi
- Keçən ay və cari il göstəriciləri
- JSON backup / restore

Qaydalar:
- Satış zamanı alınan pul satış məbləğini keçə bilməz
- Əlavə ödəniş mövcud borcdan çox ola bilməz
- Müştəriyə özəl qiymət varsa avtomatik gəlir
- İadədə yalnız əvəz verilən say anbardan düşür
- Bütün məlumatlar cihazın daxilində saxlanılır

Vacib qeyd:
Bu mühitdə Android SDK olmadığı üçün real APK build edə bilmədim.
Amma Android Studio-da açıb birbaşa APK çıxarmaq üçün layihə hazır vəziyyətdədir.

APK çıxarma addımı:
1) Android Studio aç
2) Bu qovluğu Open Project ilə aç
3) Lazım olsa Gradle sync etsin
4) Build > Build APK(s)
5) APK faylı app/build/outputs/apk/ içində yaranacaq

Əsas texnologiya:
- Android WebView wrapper
- Local HTML/CSS/JS offline tətbiq
- Məlumat saxlanması: localStorage

Fayl strukturu:
- app/src/main/java/.../MainActivity.java  -> Android wrapper
- app/src/main/assets/webapp/            -> əsas offline tətbiq
- app/build.gradle                       -> Android build konfiqi

