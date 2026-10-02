# Türkçe Klavye Antrenörü — uygulama planı

Hazırlayan: Aykut BOZALAN

## Mimari ve dağıtım
HTML, CSS, bağımsız JavaScript modülleri ve JSON verileri. Çalışma zamanında
paket, sunucu, hesap veya ağ bağlantısı gerekmez. Node.js yalnızca geliştirici
testleri ve derleme içindir. DOM testleri jsdom kullanır. Derleme, modülleri ve verileri tek HTML dosyasında
birleştirir; böylece dosyadan açılışta fetch/CORS sorunu oluşmaz.

- `src/core.mjs`: Türkçe karşılaştırma, istatistik, adaptif seçim, oturum modeli.
- `src/storage.mjs`: sürümlü yerel kayıtlar ve bozuk veri toleransı.
- `src/app.mjs`, `src/index.html`, `src/style.css`: ekranlar ve etkileşim.
- `data/*.json`: kelimeler, cümleler, F/Q haritaları, eğitim hedefleri.
- `scripts/build.mjs`: sürüm bilgisini ekleyen bağımlılıksız derleme.
- `installer/`: kullanıcı hesabına kurulum ve masaüstü kısayolu.
- `.github/workflows/`: testler ve v etiketiyle ZIP/SHA256 Release üretimi.
- `tests/`: Node test runner ile kritik iş kuralları.

## Veri modelleri
Klavye: düzen kimliği, satırlar; her tuşun karakteri, fiziksel kodu, satır,
konum ve parmak bilgisi. Kelime: metin, seviye; uzunluk ve harfler yüklemede
türetilir. Ayarlar: şema sürümü, düzen, yardım, tema, yazı boyutu, ses hızı.
Oturum: şema sürümü, id, başlangıç zamanı, düzen, tür, seviye, etkin süre,
gerçek doğru kelime/dk, standart WPM, net WPM, CPM, doğruluk, kelime ve
karakter sayaçları, Backspace, düzeltilen hata, tuş hataları ve karışıklıklar.
Geçmiş: son 20 oturum. Mevcut şema v1; bilinmeyen sürüm üzerine yazılmaz.

## Eğitim motoru
Başlat → hedef seç → karakter girişini ölç → Enter ile hedefi tamamla →
yeni hedef. Keşif/tuş bulmada tek doğru karakter yeni hedefe geçirir.
Süre ilk girişte başlar; duraklatma ve gizli sekme etkin süreden düşülür.
Hatalar düzeltilse de ilk vuruş doğruluğu korunur. Gerçek kelime/dk yalnızca
tam doğru teslim edilen kelimeleri sayar; standart WPM vuruş/5/dakikadır.
Adaptif seçim ağırlığı, hedef harflerin hata oranlarıyla artar ve sınırlanır;
normal seçim payı korunur, son hedeflerin tekrarından kaçınılır.

## Ekranlar ve aşamalar
1. Ana sayfa, ilk F/Q seçimi, sanal klavye.
2. Klavyeyi tanı ve tuş bulma; dört yardım seviyesi.
3. Harf, kısa/orta/uzun kelime, cümle, süreli test ve serbest metin.
4. Türkçe karakter, karışıklık ve Backspace ölçümü.
5. Zayıf tuşlara ağırlık veren adaptif çalışma.
6. Türkçe ses kontrolü, tekrar dinleme ve hız ayarlı dikte.
7. Sonuç, kişisel gelişim, yerel geçmiş ve JSON dışa aktarım.
8. Erişilebilir ayarlar, büyük yazı, kontrast ve mobil düzen.
9. Kritik hesaplama testleri; derleme, kurulum ve sürümleme kontrolleri.

Merkezi sınıf/öğretmen hesabı yoktur. Ders parametreleri cihazda seçilir.
GitHub deposu: `aykido/KlavyeTrain`. `v1.0.0` etiketi ilk yayın paketini üretir.
