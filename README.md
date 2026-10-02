# Türkçe Klavye Antrenörü

**Hazırlayan: Aykut BOZALAN · Sürüm 1.0.0**

Halk Eğitimi Merkezi kursiyerleri için Türkçe F ve Q klavye eğitimi.
Öncelik doğruluk, klavye hâkimiyeti ve istikrarlı ritimdir. Hedef yaklaşık
30 doğru kelime/dakika ve %95 doğruluktur. Hesap veya sunucu gerekmez.

## İndir ve kur

[GitHub Releases](https://github.com/aykido/KlavyeTrain/releases/latest) bölümünden `KlavyeTrain-v1.0.0-Windows-Portable.zip`
dosyasını indirin, ZIP'i çıkarın ve **Kur.cmd** dosyasını çalıştırın.
Masaüstünde ve Başlat menüsünde kısayol oluşur. Yönetici yetkisi gerekmez.
Kurulum imzasız bir PowerShell betiğidir; `.exe` yükleyici değildir.

Kurulumsuz kullanım için paketteki **index.html** dosyasını tarayıcıda açın.
macOS ve Linux'ta da bu dosya kullanılabilir. Windows betiklerini çalıştırmayın.
[Ayrıntılı kullanım ve kaldırma yönergeleri](KULLANIM.md).

## Özellikler

- F/Q seçimi, gerçek harf yerleşimi, parmak önerileri ve dört yardım seviyesi.
- Klavyeyi tanı, tuş bulma, harf, kısa/orta/uzun kelime, Türkçe karakter ve cümle.
- Sesli dikte, 1/3/5/10 dakika ve özel süre, serbest metin, ders modu.
- Adaptif kelime seçimi, zayıf tuşlar, hata çiftleri, Backspace takibi.
- Sonuçlar, son 20 çalışma, kişisel gelişim ve JSON dışa aktarma.
- Büyük yazı, yüksek kontrast, açık/koyu/sistem teması, klavye erişimi.
- Uygulama içinde görünür sürüm ve **Hazırlayan: Aykut BOZALAN** bilgisi.

Yerel dosyalarda localStorage davranışı tarayıcıya bağlıdır; aynı konum ve
tarayıcı kullanılmalıdır. Dikte, işletim sistemindeki Türkçe sese bağlıdır.
Dosya içeriği ve öğrenci sonuçları uygulama tarafından sunucuya gönderilmez.

## Geliştirme

Node.js 22 veya üzeri yeterlidir. Uygulamanın çalışma zamanı bağımlılığı yoktur.
DOM akış testlerinde geliştirme bağımlılığı olarak jsdom kullanılır.

```sh
npm ci
npm run check
```

Bu komut testleri çalıştırır ve `dist/index.html` üretir. Kaynak HTML doğrudan
çalıştırılmaz; JSON ve modüller derlemede gömülür. `dist/index.html` açılmalıdır.
Windows üzerinde `npm run release:zip` sürümlü ZIP ve SHA256 özeti üretir.

Mimari: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Kelimeler ve hedefler
`data/` altındadır. Sürümün tek kaynağı `package.json` dosyasıdır. Oturum veri
şeması `version: 1` olup uygulama sürümünden bağımsızdır. Gelecekteki bilinmeyen
kayıt sürümleri üzerine yazılmaz.

## Kaynak kod ve sürüm yayını

Depo: [aykido/KlavyeTrain](https://github.com/aykido/KlavyeTrain).

```sh
git clone https://github.com/aykido/KlavyeTrain.git
cd KlavyeTrain
npm ci
npm run check
```

`v1.0.0` etiketi GitHub Actions üzerinden test, derleme, ZIP ve Release
yayınını tetikler. Depoda Actions etkin olmalıdır. `main` ve pull request
değişiklikleri de test edilir. `dist/` ve `release/` Git'e eklenmez.

## Sonraki sürüm

1. `package.json` sürümünü SemVer ile artırın (hata düzeltmesi: yama, özellik:
   küçük sürüm, uyumsuz değişiklik: ana sürüm).
2. `CHANGELOG.md`, `RELEASE_NOTES.md` ve README sürümünü güncelleyin.
3. `npm run check` ile doğrulayın; değişiklikleri commit edip gönderin.
4. Aynı sürümün `vX.Y.Z` etiketini oluşturup gönderin. Sürüm uyuşmazlığında
   yayın durdurulur. Mevcut sürüm etiketini değiştirmeyin; yeni sürüm çıkarın.

Klavye yerleşimi referansı: [MEB F Klavye Uygulamaları](https://fklavye.eba.gov.tr/).
Bu proje için henüz açık kaynak lisansı seçilmemiştir.
