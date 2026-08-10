# Sistemin çalışma mantığı

Bu belge sistemin **neyi, ne kadar, neden** yaptığını anlatır. Her sayının bir
gerekçesi var; gerekçesi olmayan sayılar §7'de "tahmin" olarak açıkça işaretli.

Ölçümler 8 Ağustos 2026'da 1.754 kanallık evren üzerinde alındı.

---

## 1. Her şeyi belirleyen tek kısıt

**YouTube Data API: günde 10.000 birim.** Ücretsiz, tek anahtar, kota artışı
talep edilmiyor (Google denetimi istemiyoruz), birden çok anahtar kullanılmıyor
(şartlara aykırı).

Sistemdeki bütün tasarım kararları bu tek sayıdan türüyor. Para değil, kota
kısıtlıyor — altyapı zaten neredeyse bedava (§6).

## 2. Kota fiyat listesi

Google'ın ilan ettiği fiyatlar (bizim seçimimiz değil):

| Çağrı | Birim | Getirdiği |
|---|---|---|
| `search.list` | **100** | 50 video sonucu → kanal adayları |
| `channels.list` | 1 | 50 kanalın istatistiği |
| `playlistItems.list` | 1 | 50 video kimliği |
| `videos.list` | 1 | 50 videonun istatistiği |

Bizim ölçtüğümüz birleşik maliyetler:

| İşlem | Ölçülen maliyet | Nasıl ölçüldü |
|---|---|---|
| **Ucuz tarama** (1 kanalın istatistiği) | **0,02 birim** | 1.765 kanal = 36 birim |
| **Derin tarama** (1 kanalın 100 videosu) | **3,98 birim** | 222 kanal = 884 birim |
| **Keşif** (1 arama sorgusu) | 100 birim | sabit fiyat |

**Aradaki fark 200 kat.** Sistemin bütün mimarisi bu orandan çıkıyor: önce
herkesi ucuza tanı, sadece hak edeni pahalıya işle.

`search.list` neden kaçınılan çağrı: tek arama, 2.500 kanalın ucuz taramasına
bedel. Bu yüzden kanal *bulmak* için kullanılıyor, kanal *takip etmek* için asla.

## 3. Kapasite: evren büyüklüğü × tazelik

Derin tarama 4 birim/kanal olduğuna göre, günlük 10.000 birim şu tavanları koyuyor:

| Tazeleme sıklığı | Taşınabilir azami kanal | Not |
|---|---|---|
| Her gün | **2.500** | Veri hep taze, evren küçük |
| Haftada bir | 17.500 | Dengeli |
| Ayda bir | 75.000 | Evren büyük, veri bayat |

Bugünkü evren **1.754 kanal**. Günlük tam tazeleme 7.016 birim — kotanın %70'i.
Yani şu an günde bir kez tamamını tazeleyip, kalan %30 ile keşif yapabiliyoruz.

**Büyüme ile tazelik birbirinin rakibi.** Evren 2.500'ü geçtiği anda günlük
tazeleme imkânsız hale gelir ve kademelendirme şart olur: popüler kanallar sık,
kuyruktakiler seyrek.

## 4. Günlük çalışma planı

Kotanın önerilen bölüşümü:

| İş | Birim | Ne üretir |
|---|---|---|
| Keşif (`discover:global`) | 2.500 | 25 arama → ~1.000 aday → ~200 kabul |
| Derin tarama (`scan --deep`) | 7.000 | 1.750 kanal tazelenir |
| Yedek | 500 | Hata payı, elle sorgu |

Ucuz tarama bütçeye yazılmıyor çünkü tüm evren için 36 birim — gürültü seviyesinde.

**Keşif planının tamamı 375 arama = 37.500 birim = 4 gün.** Günde 25 arama ile
ilerliyor. Ham cevaplar diske önbellekleniyor, bu yüzden filtre/eşik değiştirip
tekrar çalıştırmak **0 birim**.

## 5. Kanal evrene nasıl girer

Sıra: **bul → ele → ucuz tara → derin tara**

### 5.1 Bulma

Niş × pazar × sorgu üçlüsüyle `search.list`, son 30 günün en çok izlenen
videoları (`order=viewCount`). Çıkan videoların kanalları aday olur.

Neden "son 30 günün en çok izlenenleri": "aktif" ve "izlenen" tanımı gereği
sağlanmış olur. Bir yıldır video atmayan kanal aday listesine giremez.

**Pazarlar:** TR (Türkçe sorgu) + US (İngilizce sorgu).
İngilizce = global dil erişimi; `regionCode=US` sonuçları Amerikan kanallarıyla
*sınırlamaz*, sadece orada öne çıkanları getirir — Koreli, Vietnamlı, Endonezyalı
kanallar da bu koldan geliyor.

IN ve GB pazarları kaldırıldı: IN evrenin %31'ini Hintçe shorts kanallarıyla
dolduruyordu, GB %2 getirip planı çeyrek oranında pahalılaştırıyordu.

### 5.2 Eleme

| Kural | Değer | Gerekçe |
|---|---|---|
| Abone alt sınırı (TR) | 10.000 | Küçük ama gerçek kanallar evrende kalsın — "küçük kanal outlier'ı" ürünün ayırt edici özelliği |
| Abone alt sınırı (global) | 50.000 | Global aramada aday çok; eşik yüksek olmazsa evren çöple dolar |
| En az video sayısı | 15 | 15 videosu olmayan kanalın medyanı anlamsız |
| Ülke kotası | Niş başına %35 | Tek ülke bir nişi ele geçirmesin. İngilizce aramada Hint kanalları organik olarak baskın — pazar kaldırmak yetmedi (%31→%29), kota gerekti (%27) |
| Kara liste (kalıp) | kurum/TV/plak | Marka kanalları satın alınmış izlenme alır, çarpanları anlamsız şişer |
| Kara liste (elle) | 11 kanal | Kalıp yakalayamadıkları: JYP Entertainment, Netflix India, BirGün TV... |
| Niş başına azami | 60 kanal | Nişler arası denge |

**Kara liste kasten dar.** İsim bazlı kalıp 53 kanal işaretledi ama içinde
gerçek üreticiler vardı (Ricis Official — 49M aboneli Endonezyalı creator,
PC Hocası TV, Deepika Dance Studio). Yanlışlıkla creator silmek, birkaç kurumsal
kanalı tutmaktan kötüdür. Sadece tartışmasız olanlar elle listelendi.

### 5.3 Ucuz tarama — 0,02 birim/kanal

`channels.list` ile: abone, toplam izlenme, video sayısı, açılış tarihi, ülke,
uploads listesi.

Bu faz her kanal için çalışır, istisnasız. 1.754 kanal = 36 birim.

### 5.4 Derin tarama — 4 birim/kanal

Son 100 video + istatistikleri + outlier skorları.

**Sıra en değerliden:** hiç derin taranmamışlar önce, sonra abone sayısına göre.
Bütçe yarıda bitse bile elde en iyiler işlenmiş olur — rastgele bir kesit değil.

## 6. Skorlama

```
medyan  = medyan(izlenme | 30 günden eski videolar), en az 10 video şartı
çarpan  = video_izlenme / medyan          ← ürünün çekirdek metriği
vpd     = izlenme / yaş_gün               ← ivme
izl:abone = izlenme / abone               ← boyuttan bağımsız sinyal
etkileşim = (beğeni + yorum) / izlenme
```

Skor **tarama sırasında değil**, `scripts/score.mts` ile toplu SQL olarak
hesaplanıyor. Gerekçe: skor tarama sırasında hesaplansaydı formülün her
değişikliği 1.754 kanalı yeniden çekmek (~7.000 birim, ~1 saat) demek olurdu.
Skor için gereken her şey zaten tabloda. Ayrılınca formül denemesi **bedava**.

| Sabit | Değer | Gerekçe |
|---|---|---|
| Medyan olgunluk eşiği | 30 gün | Yeni video henüz izlenmesini toplamamış; medyana katılırsa tabanı düşürür ve herkesi yapay outlier yapar |
| Medyan için asgari video | 10 | 10 videonun altında medyan gürültü |
| Medyan tabanı (mutlak) | 500 izlenme | Dejenere durumları eler |
| Shorts sınırı | ≤ 62 saniye | YouTube'un kendi tanımı |

### Kanal kalitesi süzgeçleri — ikisi de ölçümle konuldu

Marka kanalları satın alınmış izlenme aldığı için çarpanları anlamsız şişiyor
ve sıralamanın tepesini işgal ediyorlardı. İki bağımsız sinyal birlikte eliyor:

**1 · Göreli medyan tabanı — medyan ≥ abonenin %2'si**

Mutlak taban (500) hiçbir şeyi elemiyordu ama absürt skorlar üretiyordu: `HBL`
287.000 aboneli, Shorts medyanı 803 (abonesinin %0,28'i), bir Short'u 23 milyon
almış → 29.006x. Mutlak tabanı yükseltmek yanlış çözüm — küçük kanalları
cezalandırır, oysa "küçük kanal outlier'ı" ürünün ayırt edici özelliği.

Ölçüm (1.389 kanal): medyan/abone oranı → 5. yüzdelik %0,83 · ortanca %19,3.

| Eşik | Elenen kanal | 1000x üstü kalan |
|---|---|---|
| %0,5 | 0 | 27 |
| %1 | 49 | 24 |
| **%2** | **130** | **6** |
| %3 | 203 | 5 |

%2 kırılma noktası; sonrası azalan getiri.

**2 · Kanal içi yayılım — p90(izlenme) ÷ ortanca ≤ 100**

Göreli taban tek başına yetmedi: `Borusan Next` elendi ama yerine `Cklass`
(Meksikalı doğrudan satış markası) geldi, tam %2,0'da durup süzgeci geçti.
Eşiği yükselttikçe bir üstünde başka marka beliriyordu — semptom tedavisi.

Yayılım farklı bir şey ölçüyor: **markanın videolarının çoğu ölü, birkaçı
satın alınmış izlenmeyle patlıyor** — dağılım iki tepeli. Gerçek üreticinin
kitlesi videolarının çoğunu izler, dağılım pürüzsüzdür.

Ölçüm (en az 20 videolu 1.746 kanal):

| | Yayılım |
|---|---|
| Ortanca | 4,5 |
| %90 | 14,1 |
| %99 | **58,2** |
| `Cklass` (marka) | **1747** |
| `Bioxcin` (marka) | **154** |
| `Buildtech` (üretici) | 42 |
| `RasoiOpus` (üretici) | 30 |

Eşik **100** — 99. yüzdeliğin neredeyse iki katı, 1.746 kanalın yalnızca 8'ini
eliyor. Kasten temkinli: bir videosu viral olmuş gerçek üreticiyi elemektense
birkaç markayı tutmak yeğdir.

**Sonuç:** 1000x üstü video 43 → 28. Sıralamanın tepesi marka reklamlarından
gerçek üreticilere döndü — 16 bin aboneli bir yemek kanalının 9 milyon izlenen
videosu gibi. Ürünün satacağı şey bu.

### Bilinen kusur: Shorts çarpanı şişiriyor

Ölçüm (53.800 video üzerinde):

| Format | Adet | Ortalama çarpan | 10x üstü |
|---|---|---|---|
| Uzun video | 17.686 | 2,07 | 416 |
| Shorts | 15.421 | **2,60** | 494 |

Shorts, videoların %47'si ama en yüksek çarpanlı 100 videonun **%56'sı**.

Sebep: kanalın medyanı iki formatı karıştırıyor. Normalde uzun video basan bir
kanal bir Short atınca, Short'un izlenmesi uzun video medyanına bölünüyor —
ölçtüğümüz şey içeriğin başarısı değil, formatın izlenme farkı oluyor.

Taranan 341 kanalın **289'u** her iki formatı da basıyor. Yani istisna değil, kural.

**Önerilen düzeltme:** medyanı format başına ayrı hesapla. Short, Short medyanına;
uzun video, uzun video medyanına bölünsün. Bir formatta 10'dan az video varsa
o format için skor 0 (mevcut asgari-video kuralıyla tutarlı).

## 7. Depolama ve para

Ölçülen (53.800 video, embedding yok):

| Tablo | Boyut |
|---|---|
| videos | 42 MB |
| view_snapshots | 9,9 MB |
| channels | 968 kB |
| **Toplam veritabanı** | **64 MB** |

Video başına 268 bayt ham veri, indekslerle ~780 bayt.

### Tam evren projeksiyonu (1.754 kanal × 100 video = 175.400 video)

| Senaryo | Tahmini boyut | Supabase ücretsiz (500 MB) |
|---|---|---|
| Embedding **yok** | ~180 MB | ✅ sığar |
| Embedding **var** (768 boyut) | ~720 MB | ❌ **sığmaz** |

768 boyutlu vektör = 3.072 bayt. 175.400 video × 3 kB = **539 MB sadece vektör**,
üstüne HNSW indeksi.

**Bu gerçek bir mimari kararı zorluyor.** Seçenekler:

| Seçenek | Boyut | Kayıp |
|---|---|---|
| Kanal başına 20 video örnekle | ~110 MB | Semantik arama tüm videolarda çalışmaz; niş tespiti çalışır |
| Vektör boyutunu 256'ya düşür | ~180 MB | Anlam çözünürlüğü düşer, şema değişikliği gerekir (0004 `vector(768)` sabitlemiş) |
| Supabase Pro | sınırsız | **$25/ay** |

### Aylık nakit maliyet

| Kalem | Bugün | Ölçekte |
|---|---|---|
| YouTube Data API | $0 | $0 (kota kısıtlı, para değil) |
| Supabase | $0 (ücretsiz kademe) | $25 (embedding'ler için gerekebilir) |
| Gemini embedding | ~$0,40 tek seferlik | 175.400 başlık ≈ 2,6M token |
| Gemini sohbet | ~$1-5 | kullanıma bağlı |
| Vercel | $0 | $20 (trafik artınca) |
| **Toplam** | **~$1** | **~$50** |

## 8. Gerekçesi olmayan sayılar — dürüst liste

Yukarıdaki tabloların hepsi ölçüm ya da Google'ın ilan ettiği fiyat değil.
Ayrımı net tutmak için:

**Ölçtüğümüz (deneyle doğrulanmış):**
0,02 birim/kanal ucuz tarama · 3,98 birim/kanal derin tarama · 2,0 sn/kanal
tarama hızı · 268 bayt/video · Shorts çarpıklığı · ülke dağılımı ·
**göreli medyan tabanı %2** (kırılma noktası ölçüldü) · **yayılım tavanı 100**
(99. yüzdeliğin iki katı) · **embedding örneklemesi** (768 boyut × 175.400 video
= 539 MB > 500 MB tavan)

**Google'ın fiyatı (bizim seçimimiz değil):**
search.list 100 birim · diğerleri 1 birim · günlük 10.000 birim

**Alperen'in kararı, gerekçesi kodda yazılı:**
medyan tabanı 500 · 30 gün olgunluk · 10 video asgari · Shorts ≤62sn ·
gemini-3.1-flash-lite (2.5-flash-lite bu anahtara 404 dönüyor) · 768 boyut

**Tahmin — hiçbir ölçüme dayanmıyor, değişebilir:**

| Sabit | Değer | Durum |
|---|---|---|
| Abone alt sınırı TR | 10.000 | Alperen'in seçimi, test edilmedi |
| Abone alt sınırı global | 50.000 | 200.000'den indirildi; 200k global kanalların neredeyse tamamını eliyordu. 50k da tahmin |
| Ülke kotası | %35 | Denendi, IN'i %29→%27 yaptı. Doğru değer mi bilinmiyor |
| Niş başına azami kanal | 60 | Keyfî |
| Keşif penceresi | 30 gün | Keyfî ("aktif" tanımı) |
| Kanal başına video | 100 | Keyfî. 50'ye düşürmek maliyeti yarıya indirir, medyan kalitesini düşürür |
| Ucuz tarama bayatlama | 7 gün | Keyfî |

Bu tablo küçüldükçe sistem sağlamlaşır. Her satır, ölçümle değiştirilmeyi bekliyor.

## 9. Yazılmamış olanlar

Dürüstlük gereği: bunlar planda vardı, henüz yok.

- **Niş skorları** — tutma oranı, doygunluk, giriş zorluğu, Türkçe boşluk.
  Gösterilecek ekran olmadığı için kapsam dışı bırakıldı (8 Ağustos kararı).
- **Acil durdurma** — saatlik anormal harcamada kendini kapatma. Kota defteri
  var, anomali tespiti yok.
- **30 gün kuralı** — YouTube şartları API verisinin 30 günden uzun saklanmasını
  kısıtlıyor. Şu an istatistikler süresiz duruyor. Yayına çıkmadan çözülmeli.
- **Niş doğrulama** — kod hazır (`verify-niches.mts`), embedding'ler üretilmedi.
  Evrende yanlış nişe düşmüş kanallar var (örn. bir lokanta kanalı "egitim"de).

---

# NİŞ MOTORU (10 Ağustos 2026)

Ürünün sorusu değişti: *"hangi videoyu çekeyim"* → **"hangi nişe gireyim"**.
Cevabın birimi de değişti: video değil **kanıt-kanal** — *"6 aydan genç,
yüzünü göstermeyen, az emekle patlamış kanal"*.

## Beş kapı

| # | Kapı | Eşik | Gerekçe |
|---|---|---|---|
| 1 | Kanal yaşı | ≤ 6 ay | Genç kanal patlıyorsa patlama otoriteden değil FORMATTAN gelir — kopyalanabilir olan tek şey odur |
| 2 | Marka/kurum değil | isim süzgeci | Satın alınmış izlenme sahte kanıt üretir |
| 3 | Başlık dili | TR veya EN | Hintçe içerik Türk kullanıcıya bir şey öğretmez. Bölgeler: TR + US |
| 4 | Format eşiği | Shorts ≥30 B **veya** uzun ≥50 B izlenme/video | **Biri yeterli** |
| 5 | Yüzsüzlük | kapaklarda gerçek insan yüzü ≤ %10 | Animasyon/çizim yüz sayılmaz |

## Kapı OLMAYANLAR — ve neden

**Video sayısı.** İlk tasarımda "≤30 video" vardı. Ölçtük: 6 aydan genç 85
kanalın **80'i (%94)** 30'dan fazla videoluydu. Yüzsüz kanalların klasik
modeli günde 3-5 Shorts; kapı aradığımızın %94'ünü eliyordu. Verimliliği
video sayısı değil, **video başına izlenme** ölçer. Video sayısı gösterge
olarak kalır, kullanıcı filtreleyebilir.

**Abone sayısı.** Ters metrik: 3 bin aboneli kanalın 3 milyon izlenmesi,
kanıtın zayıflığı değil **gücüdür**. Gösterge, kapı değil.

## Format ayrı yargılanır

Bir kanal Shorts'ta boğulup uzun formatta patlamış olabilir — ya da tersi.
Tek ortalamaya sıkıştırmak onu eler. Her kanal **iki ayrı karne** taşır;
biri kapıyı geçerse kanal içeri girer ve **yalnız o formatın vitrininde**
görünür.

Yan fayda: "Shorts'ta boğulup uzun formatta patlayanlar" kendi başına
değerli bir sinyal — *"bu nişte Shorts çalışmıyor"* dersini tek kanaldan
öğretir.

## Kalıcı kanıt defteri (`evidence`)

`channels` tablosundaki sayılar **Google'ın verisi** — 30 günde tazelenir ya
da silinir. Kanıt defterindeki satır ise **bizim hükmümüz**: *"3 Ağustos'ta
keşfedildi, 8 günlüktü, 180x yapmıştı."* Türetilmiş veri olduğu için
süresiz saklanır ve niş tarihçesini (*"bu niş üç haftadır yükseliyor"*)
mümkün kılan tek şey budur.

## 30 gün temizliği (`npm run temizlik`)

Her gece: 30 günü dolan ve tazelenmemiş kayıtların **Google alanları
boşaltılır** — başlık, kapak, izlenme, beğeni. **Kimlikler ve kanıt defteri
dokunulmaz.** Satır silinmez, alan boşaltılır: ertesi gün aynı kimlikle
yarım kuruşluk çağrıyla hepsi geri gelir.

Çoğu kişi "sadece sayılar silinir" sanır — şartlar başlık, açıklama ve kapak
gibi tanıtıcı alanları da kapsar.

## Keşif ayarı: genç kanal avı

| | Önce | Sonra | Neden |
|---|---|---|---|
| Arama penceresi | 30 gün | **7 gün** | 30 günde çok izlenen video yerleşik kanaldan gelir; 7 günde patlayan, kanalın da yeni olma ihtimalini büyütür |
| Abone eşiği | 10-50 bin | **3 bin** | Altı aylık kanal çok abone toplayamaz — yüksek eşik tam aradığımızı eliyordu |
| Bölgeler | TR, US, GB, IN | **TR + US** | ABD = en yüksek RPM pazarı; TR = yerel pazar. Gerisi gelir mantığını sulandırıyordu |

## Boru hattı

```
1 BUL      arama (TR+US, 7 gün) + trend + açıklama linkleri
2 TANI     channels.list — 0,02 birim/kanal, HERKESE
3 KAPI     beş kapı (npm run kapi) — ucuz veriyle eleme
4 ÖLÇ      geçenlerin son 20 videosu — 1 birim/kanal
5 SUN      vitrin: format sekmeleri + niş karneleri
6 TAZELE   battaniye yok: dokunulan + vitrindekiler
7 TEMİZLE  her gece 30 gün kuralı
```

Eski tasarımda her kanala 4 birim harcanıyordu; yenisinde kapıyı geçmeyene
**0,02 birim**. Kabaca 200 kat tasarruf — ödeme yapmadan ölçek büyütmenin yolu.
