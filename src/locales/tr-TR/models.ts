export default {
  'models.button.deploy': 'Model Dağıt',
  'models.title': 'Modeller',
  'models.title.edit': 'Modeli Düzenle',
  'models.title.duplicate': 'Modeli Klonla',
  'models.table.models': 'modeller',
  'models.table.name': 'Model Adı',
  'models.form.source': 'Kaynak',
  'models.form.repoid': 'Depo Kimliği',
  'models.form.repoid.desc': 'Yalnızca .gguf formatı desteklenir',
  'models.form.filename': 'Dosya Adı',
  'models.form.replicas': 'Kopyalar',
  'models.form.selector': 'Seçici',
  'models.form.env': 'Ortam Değişkenleri',
  'models.form.configurations': 'Yapılandırmalar',
  'models.form.s3address': 'S3 Adresi',
  'models.form.partialoffload.tips': `CPU aktarımı etkinleştirildiğinde, GPU kaynakları yetersiz olduğunda GPUStack CPU belleği ayırır. Hibrit CPU+GPU veya tam CPU çıkarımı kullanmak için çıkarım altyapısını doğru şekilde yapılandırmanız gerekir.`,
  'models.form.distribution.tips': `Bir işçi düğümün kaynakları yetersiz olduğunda, modelin katmanlarının bir kısmının tekli veya çoklu uzak işçi düğümlere aktarılmasına olanak tanır.`,
  'models.openinplayground': 'Deneme Alanında Aç',
  'models.instances': 'örnekler',
  'models.table.replicas.edit': 'Kopyaları Düzenle',
  'model.form.ollama.model': 'Ollama Modeli',
  'model.form.ollamaholder': 'Lütfen model adını seçin veya girin',
  'model.deploy.sort': 'Sırala',
  'model.deploy.search.placeholder': 'Modelleri aramak için <kbd>/</kbd> yazın',
  'model.form.ollamatips':
    "İpucu: Aşağıdakiler GPUStack'te önceden yapılandırılmış Ollama modelleridir. İstediğiniz modeli seçin veya dağıtmak istediğiniz modeli doğrudan sağdaki 【{name}】 giriş kutusuna yazın.",
  'models.sort.name': 'Ad',
  'models.sort.size': 'Boyut',
  'models.sort.likes': 'Beğeniler',
  'models.sort.trending': 'Trend',
  'models.sort.downloads': 'İndirmeler',
  'models.sort.updated': 'Güncellenme',
  'models.search.result': '{count} sonuç',
  'models.data.card': 'Model Kartı',
  'models.available.files': 'Mevcut Dosyalar',
  'models.viewin.hf': "Hugging Face'de Görüntüle",
  'models.viewin.modelscope': "ModelScope'da Görüntüle",
  'models.architecture': 'Mimari',
  'models.search.noresult': 'İlgili model bulunamadı',
  'models.search.nofiles': 'Mevcut dosya yok',
  'models.search.networkerror': 'Ağ bağlantı hatası!',
  'models.search.hfvisit': 'Lütfen şu adrese erişebildiğinizden emin olun',
  'models.search.unsupport':
    'Bu model desteklenmiyor ve dağıtımdan sonra kullanılamayabilir.',
  'models.form.scheduletype': 'Zamanlama Modu',
  'models.form.categories': 'Model Kategorisi',
  'models.form.scheduletype.auto': 'Otomatik',
  'models.form.scheduletype.manual': 'Manuel',
  'models.form.scheduletype.gpu': 'GPU Belirle',
  'models.form.scheduletype.gpuType': 'GPU Türü Belirle',
  'models.form.scheduletype.auto.tips':
    "Mevcut kaynak koşullarına göre model örneklerini uygun GPU'lara otomatik olarak dağıtır.",
  'models.form.scheduletype.manual.tips':
    "Model örneklerinin dağıtılacağı GPU'ları manuel olarak belirlemenize olanak tanır.",
  'models.form.gpuallocation': 'GPU Tahsisi',
  'models.form.gpumode.full': 'Tam',
  'models.form.gpumode.slicing': 'Dilimleme',
  'models.form.gpuType.noSlicedCapacity':
    'Bu GPU türünde dilimlenebilir kapasite yok, lütfen başka bir GPU türü seçin.',
  'models.form.gpuType.noPartitionProfile':
    'Bu GPU türünde kullanılabilir bölüm profili yok, lütfen başka bir GPU türü seçin.',
  'models.form.manual.schedule': 'Manuel Zamanlama',
  'models.table.gpuindex': 'GPU İndeksi',
  'models.table.vgpu': 'vGPU',
  'models.table.vgpu.slice': '{memory}% VRAM / {cores}% İşlem',
  'models.table.backend': 'Altyapılar',
  'models.table.acrossworker': 'İşçi Düğümler Arası Dağıtık',
  'models.table.cpuoffload': 'CPU Aktarımı',
  'models.table.layers': 'Katmanlar',
  'models.form.backend': 'Altyapı',
  'models.form.backend_parameters': 'Altyapı Parametreleri',
  'models.instance.params.configured': 'User Configured',
  'models.instance.params.autoInjected': 'Otomatik Enjekte Edilen Parametreler',
  'models.search.gguf.tips':
    'GGUF modelleri llama-box kullanır (Linux, macOS ve Windows destekler).',
  'models.search.vllm.tips':
    'GGUF olmayan modeller ses için vox-box, diğerleri için vLLM (yalnızca x86 Linux) kullanır.',
  'models.search.voxbox.tips':
    'Bir ses modeli dağıtmak için onay kutusunun işaretini kaldırın.',
  'models.form.ollamalink':
    'Daha fazlasını <a href="https://www.ollama.com/library" target="_blank">Ollama Kütüphanesi</a>\'nde bulabilirsiniz.',
  'models.form.backend_parameters.llamabox.placeholder':
    'örn., --ctx-size=8192 (ad ve değeri ayırmak için = veya boşluk kullanın)',
  'models.form.backend_parameters.vllm.placeholder':
    'örn., --max-model-len=8192 (ad ve değeri ayırmak için = veya boşluk kullanın)',
  'models.form.backend_parameters.sglang.placeholder':
    'örn., --context-length=8192 (ad ve değeri ayırmak için = veya boşluk kullanın)',
  'models.form.backend_parameters.vllm.tips':
    '{backend} parametreleri hakkında daha fazla bilgi için <a href={link} target="_blank">buraya tıklayın</a>.',
  'models.logs.pagination.prev': 'Önceki {lines} Satır',
  'models.logs.pagination.next': 'Sonraki {lines} Satır',
  'models.logs.pagination.last': 'Son Sayfa',
  'models.logs.pagination.first': 'İlk Sayfa',
  'models.form.localPath': 'Yerel Yol',
  'models.form.filePath': 'Model Yolu',
  'models.form.backendVersion': 'Altyapı Sürümü',
  'models.form.backendVersion.tips':
    '{backend}{version} sürümünü kullanmak için sistem, ilgili sürümü yüklemek üzere çevrimiçi ortamda otomatik olarak sanal ortam oluşturur. GPUStack yükseltmesinden sonra altyapı sürümü sabit kalır. {link}',
  'models.form.gpuselector': 'GPU Seçici',
  'models.form.backend.llamabox':
    'GGUF format modeller için, Linux, macOS ve Windows destekler.',
  'models.form.backend.vllm':
    'NVIDIA, AMD, Ascend, Hygon, Moore Threads, Iluvatar, MetaX, T-Head PPU cihazları için yerleşik destek.',
  'models.form.backend.voxbox':
    "Yalnızca NVIDIA GPU'ları ve CPU'ları destekler.",
  'models.form.backend.mindie': "Yalnızca Ascend NPU'ları destekler.",
  'models.form.backend.sglang':
    'NVIDIA, AMD, Ascend, Moore Threads, MetaX, T-Head PPU cihazları için yerleşik destek.',
  'models.form.search.gguftips':
    "İşçi düğüm olarak macOS veya Windows kullanılıyorsa GGUF'u işaretleyin (ses modelleri için işareti kaldırın).",
  'models.form.button.addlabel': 'Etiket Ekle',
  'models.filter.category': 'Kategoriye göre filtrele',
  'models.list.more.logs': 'Daha Fazla Göster',
  'models.catalog.release.date': 'Yayınlanma Tarihi',
  'models.localpath.gguf.tips.title': 'GGUF biçiminde model',
  'models.localpat.safe.tips.title': 'Safetensors biçiminde model',
  'models.localpath.shared.tips.title': 'Parçalı GGUF format model',
  'models.localpath.gguf.tips':
    ' Model dosyasını belirtin, örn., /data/models/model.gguf.',
  'models.localpath.safe.tips':
    '.safetensors ve config.json dosyaları içeren model dizinini belirtin, örn., /data/models/model.',
  'models.localpath.chunks.tips': `Modelin ilk parça dosyasını belirtin, örn., /data/models/model-00001-of-00004.gguf.`,
  'models.form.replicas.tips':
    'Birden fazla kopya, { api } çıkarım istekleri için yük dengelemeyi etkinleştirir.',
  'models.table.list.empty': 'Henüz model yok!',
  'models.table.list.getStart':
    '<span style="margin-right: 5px;font-size: 13px;">Başlamak için</span> <span style="font-size: 14px;font-weight: 700">DeepSeek-R1-Distill-Qwen-1.5B</span>',
  'models.table.llamaAcrossworker': 'Llama-box İşçi Düğümler Arası',
  'models.table.vllmAcrossworker': 'vLLM İşçi Düğümler Arası',
  'models.form.releases': 'Sürümler',
  'models.form.moreparameters': 'Parametre Açıklaması',
  'models.table.vram.allocated': 'Ayrılan VRAM',
  'models.table.vram.workers': '{n} işçi düğüm',
  'models.form.backend.warning':
    'Seçilen altyapı GGUF modellerini desteklemiyor. Lütfen Çıkarım Altyapısına GGUF desteği olan bir altyapı ekleyin.',
  'models.form.backend.warning.gguf':
    'Lütfen seçilen özel altyapının GGUF modellerini desteklediğinden emin olun.',
  'models.form.ollama.warning':
    'Ollama model altyapısını llama-box kullanarak dağıtın.',
  'models.form.backend.warning.llamabox':
    'llama-box altyapısını kullanmak için model dosyasının tam yolunu belirtin (örn., <span style="font-weight: 700">/data/models/model.gguf</span>). Parçalı modeller için ilk parçanın yolunu verin (örn., <span style="font-weight: 700">/data/models/model-00001-of-00004.gguf</span>).',
  'models.form.keyvalue.paste':
    'Birden fazla satır metin yapıştırın, her satırda bir anahtar-değer çifti olmalıdır. Anahtar ve değer = işareti ile ayrılır, farklı anahtar-değer çiftleri satır sonları ile ayrılır.',
  'models.form.files': 'dosyalar',
  'models.table.status': 'Durum',
  'models.form.submit.anyway': 'Yine de Gönder',
  'models.form.evaluating': 'Model Uyumluluğu Değerlendiriliyor',
  'models.form.incompatible': 'Uyumsuzluk Tespit Edildi',
  'models.form.nativeAnthropicApi': 'Yerel Anthropic API',
  'models.form.nativeAnthropicApi.tips':
    'Çıkarım sunucusu Anthropic Messages API’sini kendisi uyguluyorsa (örneğin yeni vLLM sürümleri) etkinleştirin; /v1/messages istekleri olduğu gibi iletilir. Kapalıyken de /v1/messages çalışır, ancak önce /v1/chat/completions biçimine dönüştürülür.',
  'models.form.restart.onerror': 'Hata Durumunda Otomatik Yeniden Başlat',
  'models.form.restart.onerror.tips':
    'Hata oluştuğunda otomatik olarak yeniden başlatmayı dener.',
  'models.form.check.params': 'Yapılandırma kontrol ediliyor...',
  'models.form.check.passed': 'Uyumluluk Kontrolü Başarılı',
  'models.form.check.claims':
    'Model yaklaşık {vram} VRAM ve {ram} RAM tüketecektir.',
  'models.form.check.claims2': 'Model yaklaşık {vram} VRAM tüketecektir.',
  'models.form.check.claims3': 'Model yaklaşık {ram} RAM tüketecektir.',
  'models.form.update.tips':
    'Değişiklikler yalnızca örneği silip yeniden oluşturduğunuzda geçerli olur.',
  'models.table.download.progress': 'İlerleme',
  'models.table.button.apiAccessInfo': 'API Erişim Bilgisi',
  'models.table.button.apiAccessInfo.tips': `Bu modeli üçüncü taraf uygulamalarla entegre etmek için şu bilgileri kullanın: erişim URL'si, model adı ve API anahtarı. Bu kimlik bilgileri, model hizmetine düzgün bağlantı ve kullanım sağlamak için gereklidir.`,
  'models.table.apiAccessInfo.endpoint': "Erişim URL'si",
  'models.table.apiAccessInfo.modelName': 'Model Adı',
  'models.table.apiAccessInfo.apikey': 'API Anahtarı',
  'models.table.apiAccessInfo.openaiCompatible': 'OpenAI Uyumlu',
  'models.table.apiAccessInfo.anthropicCompatible': 'Anthropic Uyumlu',
  'models.table.apiAccessInfo.jinaCompatible': 'Jina Uyumlu',
  'models.table.apiAccessInfo.gotoCreate': 'Oluşturmaya Git',
  'models.search.parts': '{n} parça',
  'models.search.evaluate.error': 'Değerlendirme sırasında bir hata oluştu: ',
  'models.ollama.deprecated.title': 'Kullanımdan Kaldırma Bildirimi',
  'models.ollama.deprecated.current':
    '<span class="bold-text">Mevcut Sürüm (v0.6.1): </span>Ollama modelleri şu anda kullanılabilir.',
  'models.ollama.deprecated.upcoming':
    '<span class="bold-text">Gelecek Sürüm (v0.7.0): </span>Ollama model kaynağı arayüzden kaldırılacaktır.',
  'models.ollama.deprecated.following':
    '<span class="bold-text">v0.7.0 güncellemesinin ardından,</span> daha önce dağıtılmış tüm modeller beklendiği gibi çalışmaya devam edecektir.',
  'models.ollama.deprecated.issue':
    'İlgili soruna bakın: <a href="https://github.com/gpustack/gpustack/issues/1979" target="_blank">GitHub\'da #1979</a>.',
  'models.ollama.deprecated.notice': `Ollama model kaynağı v0.6.1 itibarıyla kullanımdan kaldırılmıştır. Daha fazla bilgi için <a href="https://github.com/gpustack/gpustack/issues/1979" target="_blank">ilgili GitHub sorununa</a> bakın.`,
  'models.backend.mindie.310p':
    'Ascend 310P yalnızca FP16 destekler, bu nedenle --dtype=float16 ayarlamanız gerekir.',
  'models.form.gpuCount': 'Kopya Başına GPU',
  'models.form.gpuType': 'GPU Türü',
  'models.form.optimizeLongPrompt': 'Uzun İstemi Optimize Et',
  'models.form.enableSpeculativeDecoding': 'Spekülatif Çözümlemeyi Etkinleştir',
  'models.form.check.clusterUnavailable': 'Mevcut küme kullanılamıyor',
  'models.form.check.otherClustersAvailable':
    'Kullanılabilir kümeler: {clusters}. Lütfen küme değiştirin.',
  'models.button.accessSettings': 'Erişim Ayarları',
  'models.table.accessScope': 'Erişim Kapsamı',
  'models.table.accessScope.all': 'Tüm kullanıcılar',
  'models.table.userSelection': 'Kullanıcı Seçimi',
  'models.button.accessSettings.tips':
    'Erişim ayarlarındaki değişiklikler bir dakika sonra geçerli olur.',
  'models.table.userSelection.tips':
    'Yönetici kullanıcılar varsayılan olarak tüm modellere erişebilir.',
  'models.table.filterByName': 'Kullanıcı adına göre filtrele',
  'models.table.admin': 'Yönetici',
  'models.table.noselected': 'Kullanıcı seçilmedi',
  'models.table.users.all': 'Tüm Kullanıcılar',
  'models.table.users.selected': 'Seçili Kullanıcılar',
  'models.table.nouserFound': 'Kullanıcı bulunamadı',
  'models.form.performance': 'Performans',
  'models.form.gpus.notfound': 'GPU bulunamadı',
  'models.form.extendedkvcache': 'Genişletilmiş KV Önbelleğini Etkinleştir',
  'models.form.chunkSize': 'Önbellek Parça Boyutu',
  'models.form.maxCPUSize': 'Maksimum CPU Önbellek Boyutu (GiB)',
  'models.form.remoteURL': "Uzak Depolama URL'si",
  'models.form.remoteURL.tips':
    'Ayrıntılar için <a href="https://docs.lmcache.ai/api_reference/configurations.html" target="_blank">yapılandırma dokümantasyonuna</a> bakın.',
  'models.form.runCommandPlaceholder':
    'örn., vllm serve Qwen/Qwen2.5-1.5B-Instruct',
  'models.accessSettings.public': 'Herkese Açık',
  'models.accessSettings.authed': 'Kimlik Doğrulamalı',
  'models.accessSettings.allowedUsers': 'İzin verilen kullanıcılar',
  'models.accessSettings.public.tips':
    'Herkese açık olarak ayarlandığında, herkes kimlik doğrulaması olmadan bu modele erişebilir, bu da veri ifşa risklerine yol açabilir.',
  'models.table.button.deploy': 'Şimdi Dağıt',
  'models.form.backendVersion.holder': 'Sürüm girin veya seçin',
  'models.form.gpusperreplica': 'Kopya Başına GPU',
  'models.form.gpusAllocationType': 'GPU Tahsis Türü',
  'models.form.gpusAllocationType.auto': 'Otomatik',
  'models.form.gpusAllocationType.custom': 'Özel',
  'models.form.gpusAllocationType.auto.tips':
    "Sistem kopya başına GPU sayısını otomatik hesaplar, varsayılan olarak ikinin kuvvetlerini kullanır ve seçilen GPU'larla sınırlandırılır.",
  'models.form.gpusAllocationType.custom.tips':
    'Kopya başına tam GPU sayısını belirleyebilirsiniz.',
  'models.mymodels.status.inactive': 'Durduruldu',
  'models.mymodels.status.degrade': 'Hazır Değil',
  'models.mymodels.status.active': 'Hazır',
  'models.form.kvCache.tips':
    'Genişletilmiş KV önbellek ve spekülatif çözümleme yalnızca yerleşik altyapılarda (vLLM / SGLang) kullanılabilir. Etkinleştirmek için lütfen altyapıyı değiştirin.',
  'models.form.kvCache.tips2':
    'Yalnızca yerleşik çıkarım altyapıları (vLLM veya SGLang) kullanılırken desteklenir.',
  'models.form.kvCache.backend': 'Cache Backend',
  'models.form.kvCache.local': 'In-Process Cache',
  'models.form.kvCache.service.tips':
    'Only cache services in the same cluster and compatible with the selected backend are listed.',
  'models.form.kvCache.shared.builtinBackends':
    'Cache Service yalnızca yerleşik vLLM ve SGLang arka uçlarıyla desteklenir.',
  'models.kvCache.degraded.tips':
    'Shared KV cache is not active for this instance',
  'models.kvCache.endpointDead.tips':
    'The shared cache this instance attached to is no longer available; restart the instance to recover',
  'models.form.scheduling': 'Zamanlama',
  'models.form.scaling': 'Zamanlanmış Ölçekleme',
  'models.form.scaling.enable': 'Zamanlanmış ölçeklemeyi etkinleştir',
  'models.form.scaling.enable.tips':
    'Kopya sayısını yinelenen zaman pencerelerinde ölçekleyin (ör. gündüz daha fazla, gece daha az). Hiçbir pencerede değilken model, yapılandırılan kopya sayısını taban değer olarak kullanır.',
  'models.form.scaling.tz.note':
    'Zamanlama saatleri sunucu genelindeki saat dilimini kullanır (GPUSTACK_TIMEZONE, varsayılan olarak sunucunun saat dilimi).',
  'models.form.scaling.rules': 'Kurallar',
  'models.form.scaling.cron': 'Cron İfadesi',
  'models.form.scaling.useCron': 'CRON ifadesi kullan',
  'models.form.scaling.repeat': 'Tekrar',
  'models.form.scaling.repeat.daily': 'Her gün',
  'models.form.scaling.repeat.weekdays': 'Hafta içi (Pzt–Cum)',
  'models.form.scaling.repeat.weekends': 'Hafta sonu (Cmt–Paz)',
  'models.form.scaling.repeat.weekly': 'Her hafta',
  'models.form.scaling.repeat.monthly': 'Her ay',
  'models.form.scaling.repeat.cron': 'CRON',
  'models.form.scaling.weekdaysLabel': 'Haftanın günleri',
  'models.form.scaling.monthdaysLabel': 'Ayın günleri',
  'models.form.scaling.startTime': 'Başlangıç saati',
  'models.form.scaling.endTime': 'Bitiş saati',
  'models.form.scaling.crossDay': 'Ertesi gün biter',
  'models.form.scaling.nextDayBadge': '+1 gün',
  'models.form.scaling.timezone': 'Saat dilimi',
  'models.form.scaling.tz.all': 'Tüm zamanlamalar {tz} saat dilimini kullanır',
  'models.form.scaling.duration': 'Süre',
  'models.form.scaling.durationUnit': 'Zaman birimi',
  'models.form.scaling.windowReplicas': 'Penceredeki kopyalar',
  'models.form.scaling.unit.minutes': 'Dakika',
  'models.form.scaling.unit.hours': 'Saat',
  'models.form.scaling.unit.days': 'Gün',
  'models.form.scaling.startCron': 'Pencere Başlangıcı',
  'models.form.scaling.endCron': 'Pencere Bitişi',
  'models.form.scaling.baseline': 'Taban Kopya Sayısı',
  'models.form.scaling.baseline.tips':
    'Geçerli saat hiçbir pencerede değilken kullanılan kopya sayısı.',
  'models.form.scaling.baselineNote':
    'Yukarıda ayarlanan Replicas değeri temel (baseline) olarak kullanılır — geçerli saat hiçbir pencerede değilken uygulanan kopya sayısı.',
  'models.form.scaling.cron.invalid': 'Geçersiz cron ifadesi',
  'models.form.scaling.meaning': 'Özet',
  'models.form.scaling.summary.monthDays': 'Gün {days}',
  'models.form.scaling.freq.minute': 'Her dakika',
  'models.form.scaling.freq.hour': 'Saatte bir',
  'models.form.scaling.freq.day': 'Günde bir',
  'models.form.scaling.freq.week': 'Haftada bir',
  'models.form.scaling.freq.month': 'Ayda bir',
  'models.form.scaling.freq.year': 'Yılda bir',
  'models.form.scaling.next': 'Sonraki pencere:',
  'models.form.scaling.addRule': 'Kural ekle',
  'models.form.scaling.removeRule': 'Kuralı kaldır',
  'models.form.scaling.rules.required':
    'En az bir kural ekleyin veya zamanlanmış ölçeklemeyi kapatın.',
  'models.form.scaling.hint':
    'Her kural, başlangıç saatinde belirtilen süre boyunca bir pencere açar ve o sırada kendi kopya sayısını çalıştırır. Hiçbir pencerede değilken model, yukarıdaki taban kopya sayısını kullanır. Pencereler çakıştığında en son başlayan pencere geçerli olur.',
  'models.form.scaling.conflict':
    'Çakışma: aynı başlangıç saatine ({times}) sahip kuralların kopya sayıları farklı. Aynı kopya sayısını veya farklı başlangıç saatleri kullanın.',
  'models.form.scaling.overlap':
    'Örtüşme: pencereler ({times}) örtüşüyor; örtüşen yerlerde sonra başlayan kural geçerli olur.',
  'models.form.ramRatio': 'RAM-VRAM Oranı',
  'models.form.ramSize': 'Maksimum RAM Boyutu (GiB)',
  'models.form.ramRatio.tips':
    "KV önbellek için kullanılan sistem RAM'in GPU VRAM'e oranı. Örneğin, 2.0 RAM'deki önbelleğin GPU VRAM'in iki katı olabileceği anlamına gelir.",
  'models.form.ramSize.tips': `Sistem belleğinde depolanan KV önbelleğin maksimum boyutu (GiB). Ayarlanırsa, bu değer "{content}" değerini geçersiz kılar.`,
  'models.form.chunkSize.tips': 'KV önbellek parçası başına token sayısı.',
  'models.form.mode': 'Mod',
  'models.form.algorithm': 'Algoritma',
  'models.form.draftModel': 'Taslak Model',
  'models.form.numDraftTokens': 'Taslak Token Sayısı',
  'models.form.ngramMinMatchLength': 'N-gram Minimum Eşleme Uzunluğu',
  'models.form.ngramMaxMatchLength': 'N-gram Maksimum Eşleme Uzunluğu',
  'models.form.mode.throughput': 'Verim',
  'models.form.mode.latency': 'Gecikme',
  'models.form.mode.baseline': 'Standart',
  'models.form.mode.throughput.tips':
    'Yüksek istek eşzamanlılığı altında yüksek verim için optimize edilmiştir.',
  'models.form.mode.latency.tips':
    'Düşük istek eşzamanlılığı altında düşük gecikme için optimize edilmiştir.',
  'models.form.mode.baseline.tips':
    'Tam (orijinal) hassasiyette çalışır ve uyumluluğu ön planda tutar.',
  'models.form.draftModel.placeholder':
    'Lütfen bir taslak model seçin veya girin',
  'models.form.draftModel.tips':
    "Yerel yol (örn., /path/to/model) girebilir veya Hugging Face ya da ModelScope'dan bir model seçebilirsiniz (örn., Tengyunw/qwen3_8b_eagle3). Sistem birincil model kaynağına göre otomatik eşleme yapar.",
  'models.form.quantization': 'Niceleme',
  'models.form.backend.custom': 'Kullanıcı tanımlı',
  'models.form.rules.name':
    'En fazla 63 karakter; yalnızca harf, rakam, nokta (.), alt çizgi (_) ve tire (-); alfanümerik karakterle başlamalı ve bitmelidir.',
  'models.catalog.button.explore': 'Daha Fazla Model Keşfet',
  'models.catalog.precision': 'Hassasiyet',
  'models.form.gpuPerReplica.tips': 'Özel bir sayı girin',
  'models.form.generic_proxy': "Genel Proxy'yi Etkinleştir",
  'models.form.enableModelRoute': 'Model Yönlendirmesini Etkinleştir',
  'models.form.enableModelRoute.tips': 'Model Yönlendirmesini Etkinleştir',
  'models.form.generic_proxy.tips':
    'Genel proxy etkinleştirildikten sonra OpenAI API standardına uymayan URI yollarına erişebilirsiniz.',
  'models.form.generic_proxy.button': 'Genel Proxy',
  'models.accessControlModal.includeusers': 'Dahil Edilen Kullanıcılar',
  'models.table.genericProxy':
    'Aşağıdaki yol önekini kullanın ve model adını <span class="bold-text">X-GPUStack-Model</span> istek başlığında veya istek gövdesindeki model alanında ayarlayın. Bu yol öneki altındaki tüm istekler çıkarım altyapısına yönlendirilir.',
  'models.form.backendVersion.deprecated': 'Kullanımdan Kaldırıldı',
  'models.accessSettings.public.desc':
    'Kimlik doğrulaması olmadan herkes tarafından erişilebilir.',
  'models.accessSettings.authed.tips':
    'Tüm kimliği doğrulanmış platform kullanıcıları tarafından erişilebilir.',
  'models.accessSettings.allowedUsers.tips':
    'Yalnızca belirlenen kullanıcılar modele erişebilir.',
  'models.form.backendVersions.tips': `Daha fazla sürüm kullanmak için {link} sayfasına gidin ve sürüm eklemek üzere altyapıyı düzenleyin.`,
  'models.catalog.nogpus.tips':
    'Seçili kümede bu model için uyumlu GPU bulunmuyor.',
  'models.form.modelfile.notfound': `Belirttiğiniz model dosyası yolu GPUStack sunucusunda mevcut değil. Model dosyasını hem GPUStack sunucusunda hem de GPUStack işçi düğümlerinde aynı yola yerleştirmeniz önerilir. Bu, GPUStack'in daha iyi kararlar almasına yardımcı olur.`,
  'models.form.readyWorkers': 'hazır işçi düğüm',
  'models.form.maxContextLength': 'Maksimum Bağlam Uzunluğu',
  'models.form.backend.helperText':
    'Henüz etkinleştirilmedi. Dağıtımdan sonra etkinleştirilecektir. ',
  'models.table.instance.benchmark': 'Kıyaslama Çalıştır',
  'models.table.modelView': 'Model List',
  'models.table.instanceView': 'Instance List',
  'models.table.category': 'Category',
  'models.instance.currentRun': 'Current Run',
  'models.instance.previousRun': 'Previous Run',
  'models.instance.startHistory': 'Run History',
  'models.instance.startHistory.tips':
    'Shows logs from the run before the last error-triggered restart.',
  'models.form.lora.label': 'LoRA Adapters',
  'models.form.lora.add': 'Add LoRA Adapter',
  'models.form.lora.select': 'Select LoRA',
  'models.form.lora.name': 'LoRA name',
  'models.form.lora.rule.empty': 'Input cannot be empty',
  'models.form.lora.rule.duplicate': 'LoRA name cannot be duplicated',
  // Model catalog source configuration
  'models.catalog.source.title': 'Katalog Kaynağı',
  'models.catalog.source.official':
    'Follows the catalog GPUStack publishes, on top of the one packaged with this release.',

  // --- Prefill/decode disaggregation ---
  'models.form.pd.enable': 'PD Ayrıştırma',
  'models.form.pd.enable.off': 'Kapalı',
  'models.form.pd.enable.on': 'PD Ayrıştırma',
  'models.form.pd.enable.tips':
    'Ön dolgu (prefill) ile kod çözmeyi (decode) ayrı örneklere böler; bedeli bir ek ağ atlaması ve bir KV aktarımıdır. Düşük eşzamanlılıkta, kısa istemlerde veya yüksek önek önbelleği isabetinde toplu dağıtım genellikle daha hızlıdır. Önce bir kıyaslama çalıştırın.',
  'models.form.pd.shape.mono': 'Birleşik dağıtım',
  'models.form.pd.shape.mono.tips':
    'Tek bir örnek hem prefill hem decode işlemini yürütür.',
  'models.form.pd.shape.pd': 'PD Ayrıştırma',
  'models.form.pd.shape.pd.tips':
    'Prefill ve decode ayrı roller olarak çalışır; her birinin motoru, parametreleri ve kopya sayısı bağımsızdır.',
  'models.form.pd.shape.current': 'Mevcut',
  'models.form.pd.mode': 'Taşıma',
  'models.form.pd.mode.holder': 'Bir taşıma seçin',
  'models.form.pd.mode.tips':
    'Bağlantı durumu parametrelerinin tümü - connector, portlar, karşı taraf adresleri - seçilen moddan türetilir; elle ayarlanmaz.',
  'models.form.pd.mode.custom.tips':
    'Özel modda hiçbir bağlantı parametresi eklenmez: --kv-transfer-config, portlar ve karşı taraf adreslerini kendiniz vermelisiniz.',
  'models.form.pd.mode.backend.mismatch':
    '{targets} gerekiyor; seçili motor {backend}. Roller arasında motor karıştırmak için Özel modu kullanın.',
  'models.form.pd.mode.runtime.mismatch':
    '{runtime} hızlandırıcı gerekiyor; bu kümede yalnızca {vendors} var.',
  'models.form.pd.mode.only.custom':
    'Bu motor ve hızlandırıcı bileşimi için yerleşik bir reçete yok. Özel mod hâlâ kullanılabilir: bağlayıcı, portlar ve el sıkışma değişkenlerini kendiniz girersiniz.',
  'models.form.pd.mode.derived':
    'Taşıma: {mode} · {vendor} hızlandırıcılara dağıtılacak',
  'models.form.pd.vendor': 'Hızlandırıcı üreticisi',
  'models.form.pd.vendor.tips':
    'Bu kümede grubu barındırabilecek birden fazla üretici var ve bir PD grubu üreticiler arasına yayılamaz — KV taşıma yolu farklıdır. Dağıtılacak bölümü seçin.',
  'models.form.pd.replicas.moved':
    'PD dağıtımında replika sayıları her rol için ayrı ayarlanır.',
  'models.form.pd.disabled.gguf':
    'PD ayrıştırma yalnızca vLLM / SGLang motorlarını destekler; bu model GGUF biçiminde.',
  'models.form.pd.disabled.backend':
    'PD ayrıştırma yalnızca vLLM / SGLang motorlarını destekler. Diğer motorlar Özel mod ile kullanılabilir.',
  'models.form.pd.disabled.schedule':
    'PD dağıtımı için zamanlanmış ölçekleme kullanılamaz. Rol başına replika sayısıyla ölçekleyin.',
  'models.form.pd.cache.cleared':
    'PD dağıtımında KV önbelleği rol başına ayarlanır; model düzeyindeki ayar temizlendi. Gereken roller için tek tek seçin.',
  'models.form.roles': 'Roller',
  'models.form.roles.prefill': 'Prefill',
  'models.form.roles.decode': 'Decode',
  'models.form.roles.router': 'Router',
  'models.form.roles.inherit': 'Modelle aynı',
  'models.form.roles.override': 'Özel',
  'models.form.roles.inherited': 'Devralınan',
  'models.form.roles.group.backend': 'Motor ve imaj',
  'models.form.roles.group.parameters': 'Parametreler ve ortam değişkenleri',
  'models.form.roles.group.scheduling': 'Kaynaklar ve zamanlama',
  'models.form.roles.group.cache': 'Paylaşılan KV önbelleği',
  'models.form.roles.group.wide': 'Grup genelinde',
  'models.form.roles.replicas': 'Replikalar',
  'models.form.roles.router.managed': 'Sistem tarafından yönetilir',
  'models.form.roles.router.replicas.tips':
    'Bu sürümde Router tek replika çalışır.',
  'models.form.roles.router.order.tips':
    'Router, Prefill ve Decode hazır olduktan sonra oluşturulur.',
  'models.form.roles.router.custom.forced':
    'Özel PD modu Router türetmez. İmajını ve başlatma komutunu verin.',
  'models.form.roles.router.peers':
    'Prefill / Decode örnek adresleri dağıtımdan sonra sistem tarafından eklenir.',
  'models.form.roles.cache.holder': 'Kullanılmıyor',
  'models.form.roles.cache.tips':
    'Bağlantı yöntemi ve öncelik sırası sistem tarafından türetilir; ayar gerekmez.',
  'models.form.roles.cache.custom.conflict':
    'Özel PD modunda motor parametrelerinde --kv-transfer-config gerekir; bu nedenle önbellek servisi de seçilemez.',
  'models.form.roles.cache.param.conflict':
    'Seçili PD modu ile çakışıyor. Özel moda geçin veya --kv-transfer-config parametresini kaldırın.',
  'models.state.pending': 'Bekliyor',
  'models.state.partial': 'Kısmen hazır',
  'models.state.running': 'Çalışıyor',
  'models.state.error': 'Hata',
  'models.form.speculativeDecoding': 'Speculative Decoding',
  'models.pd.tag': 'PD',
  'models.pd.roles.detail': 'Rol başına durum',
  'models.pd.role.waiting': 'Bekliyor',
  'models.pd.replicas.readonly':
    'PD dağıtımı için rol başına replika sayılarını Düzenle içinde ayarlayın.',
  'models.pd.degraded.cache':
    'Paylaşılan KV önbelleği bağlanmadı; grup onsuz hizmet veriyor.',
  'models.pd.degraded.ratio':
    'Hazır üye sayısı istenenden az; dağıtım düşük kapasiteyle hizmet veriyor.',
  'models.form.roles.override.empty':
    'This group has no values, so it will be saved as inheriting the model-level configuration. Fill in at least one field to keep it custom.',
  'models.form.pd.mode.cleared':
    'The PD mode was cleared when disaggregation was turned off. Please select it again.',
  'models.pd.degraded.pairing':
    'No prefill member shares a host with any decode member, so every KV transfer crosses the network. On a link without RDMA that is usually slower than not disaggregating at all. Co-locate at least one pair, or pick GPUs on the same host for both roles.',
  'models.pd.degraded.placement':
    'Bazı üyeler hâlâ yükseltmeden önceki ad alanında dağıtılmış durumda. Hizmet etkilenmez, ancak bu üyelerin tuttuğu hızlandırıcılar kiracı kota defterinde yer almadığından grubun atomik kabulü o kadar iyimserdir. Taşımak için modeli yeniden başlatın.',
  'models.pd.degraded.ineffective':
    'Grup hizmet veriyor ancak hiç KV aktarımı olmuyor — ayrıştırma sessizce toplu çıkarıma geriledi. Eşleştirmeyi ve KV bağlayıcı yapılandırmasını denetleyin.',
  'models.pd.heterogeneous.warning':
    'Prefill ve Decode farklı GPU türleri kullanıyor; grup atomik olarak kabul edilemez: eşzamanlı gönderimde yalnızca bazı roller başlayabilir.',
  'models.pd.admission.infeasible':
    'Mevcut kapasite bu grubu barındıramıyor (gereken {required}, mevcut {available}). Replika sayısını azaltın, dilimlenmiş kart türü kullanın veya düğüm ekleyin.',
  'models.pd.effectiveness.degraded':
    'PD toplu sunuma geriledi - KV aktarımı algılanmadı. PD modunu ve motor parametrelerini kontrol edin.',
  'models.pd.effectiveness.partial':
    "KV yalnızca trafiğin bir kısmı için aktarılıyor - bazı istekler iki kez prefill ediliyor. Bir rolün üyelerinden birinin connector'ünü yitirip yitirmediğini kontrol edin.",
  'models.pd.stat.avg': 'ort.',
  'models.pd.window': 'son {window}',
  'models.pd.effectiveness': 'PD Effectiveness',
  'models.pd.bandwidth': 'KV Transfer',
  // Neither is a degradation, and they are different answers: nobody
  // called the model vs this mode's router exports no request counter.
  'models.pd.effectiveness.idle': '(no traffic)',
  'models.pd.effectiveness.unmeasurable': 'no denominator',
  'models.pd.transferP99': 'Transfer p99',
  'models.pd.bytesPerTransfer': 'Per transfer',
  'models.pd.ttft': 'TTFT',
  'models.pd.tpot': 'TPOT',
  'models.pd.queue': 'Queue',
  'models.pd.ttft.tips':
    "Time to first token belongs to prefill: that is what a user waited for. Decode's TTFT is measured from its own first forward pass and is not comparable.",
  'models.pd.tpot.tips':
    'Time per output token belongs to decode. Prefill emits one token and hands over, so its inter-token latency is not a steady-state figure.',
  'models.pd.queue.tips':
    'Mean queue depth. The only objective signal for whether the prefill:decode ratio is right and which way it is wrong: a queue that only ever builds on one side is that side asking for more replicas. Read the shape, not the value -- a queue that drains is healthy at any depth.',
  'models.pd.failedTransfers': 'KV Transfer Failures',
  'models.pd.kvExpired': 'KV Leases Expired',
  'models.pd.kvExpired.tips':
    'Requests dropped between the two hops, whose prefill was computed for nothing. A rising value means requests are being lost between hop 1 and hop 2.',
  'models.pd.bandwidth.sentence':
    'Transmitting the {seqLen}-token KV cache ({perRequest}) within {budget} ms requires a link bandwidth of {required}.',
  'models.pd.bandwidth.kvMath':
    '2 (K and V) × {kvHeads} KV heads × {headDim} head dim × {element} B ({dtype}) × {layers} layers = {perToken} per token, × {seqLen} tokens = {perRequest}',
  'models.pd.bandwidth.kvMath.mla':
    '{latentDim} latent dim × {element} B ({dtype}) × {layers} layers = {perToken} per token, × {seqLen} tokens = {perRequest}',
  'models.pd.denominator.weak': 'coarse denominator',
  'models.pd.denominator.weak.tips':
    "The ratio came from the router's route-aggregated total rather than per-worker counters: it still answers whether anything was routed, but no longer points at which decode stopped pulling.",
  'models.pd.ratio.waiting':
    'Oran {configured} (şu an {current}, {role} bekleniyor)',
  'models.pd.group.restarting':
    'Grup yeniden başlatılıyor: {stopped}/{total} durduruldu, {ready}/{total} yeniden oluşturuldu',
  'models.pd.group.restart.confirm':
    'Bu değişiklik tüm PD grubunun yeniden başlatılmasını gerektirir: önce {total} örneğin tümü durdurulur, sonra yeni yapılandırmayla yeniden oluşturulur; bu sürede model kullanılamaz.',
  'models.pd.instance.stale':
    'Bu örnek eski bir yapılandırmayla çalışıyor; değişikliği uygulamak için grubu yeniden başlatın.',
  'models.pd.stale':
    'Yapılandırma değişti; uygulamak için grubu yeniden başlatın.',
  'models.restart': 'Yeniden başlat',
  'models.restart.confirm':
    '{name} modelinin tüm örnekleri durdurulur ve geçerli yapılandırmayla yeniden oluşturulur. Bu sırada model kullanılamaz.',
  'models.restart.done':
    'Yeniden başlatılıyor: örnekler durduruldu ve geçerli yapılandırmayla yeniden oluşturulacak.',
  'models.restart.uptodate':
    'Örnekler zaten geçerli yapılandırmayla çalışıyor, yeniden başlatmaya gerek yok.',
  'models.restart.failed': 'Model yeniden başlatılamadı.',
  'models.restart.inprogress':
    'Zaten bir yeniden başlatma sürüyor. Tamamlanmasını bekleyip yeniden deneyin.',
  'models.stale.tag': 'Eski',
  'models.pd.group.id': 'Grup',
  'models.form.pd.disabled.gpus':
    'PD ayrıştırma en az 2 kullanılabilir GPU gerektirir (bir Prefill, bir Decode); seçili kümede {count} adet var.',
  'models.pd.ratio': 'Oran',
  'models.form.roles.router.entrypoint': 'Çalıştırma komutu',
  'models.form.roles.router.connectionArgs':
    'Bağlantı parametreleri (GPUStack tarafından verilir)',
  'models.form.roles.router.tunableArgs':
    'Strateji ve dayanıklılık (geçersiz kılınabilir)',
  'models.form.roles.resources': 'Kaynaklar',
  'models.form.roles.resources.cpu': 'CPU (çekirdek)',
  'models.form.roles.resources.memory': 'Bellek (GiB)',
  'models.form.roles.resources.tips':
    'Router konteynerinin istediği kaynaklar. Varsayılan 2 çekirdek ve 2 GiB.',
  'models.form.roles.router.health': 'Sağlık kontrolü',
  'models.form.roles.router.peerslabel': 'Karşı taraflar',
  'models.form.roles.router.image.tips':
    'Seçilen PD modundan türetilen görüntüyü kullanmak için boş bırakın. Yalnızca o görüntüde router çalıştırılabiliri yoksa doldurun — başlatma komutu yine türetilir.',
  'models.form.roles.cpuonly': 'Yalnızca CPU',
  'models.form.roles.cpuonly.tips':
    'Router yalnızca istekleri iletir ve model ağırlığı tutmaz, bu yüzden GPU kullanmaz.',

  'models.form.gather.title': 'KV Transfer Locality',
  'models.form.gather.title.tips':
    'Where this group must fit. The scheduler always places into the tightest domain that fits; this decides whether to refuse or to spread out when it does not.',
  'models.form.gather.prefer': 'As close as possible',
  'models.form.gather.prefer.tips': 'Spread out rather than fail. Default.',
  'models.form.gather.sameHost': 'Same host, or do not deploy',
  'models.form.gather.sameLayer': 'Same {layer}, or do not deploy',
  'models.form.gather.fits': 'fits',
  'models.form.gather.fits.domain': 'fits in {domain}',
  'models.form.gather.short':
    '{domain} is the roomiest and holds {available} of {needed}',
  'models.form.gather.noRoom': 'nothing at this level has room',
  'models.form.gather.unknown':
    'capacity unknown on {count} worker(s), so this cannot be checked',
  'models.form.gather.declare':
    'Kümenin “Topoloji” bölümünde kabinleri doldurarak daha kaba düzeyleri açın.',
  'models.form.gather.largeGroup':
    'At this size about {percent}% of requests pair on the same host, whatever the topology. For KV transfer locality, consider several smaller disaggregated groups instead.',

  'models.form.gather.checking': 'Checking what fits…',
  'models.form.gather.unavailable':
    'Could not check what fits right now, so only the default is offered.',
  'models.form.gather.retry': 'Retry',

  'models.form.groupSettings': 'Group Settings',
  'models.form.groupSettings.tips':
    'These cannot differ between roles: one value is applied to Prefill and Decode alike.',

  // Topology-aware gather tiers
  'models.form.gather.sameDomain':
    'Aynı hızlandırıcı etki alanı, yoksa dağıtma',
  'models.form.gather.domain.tips':
    'Etki alanı içinde eşler birbirinin belleğine doğrudan erişir; etki alanları arasında trafik ağ üzerinden gider',
  'models.form.gather.tree.tips':
    'Aynı hızlandırıcı etki alanı içindeki aktarım aynı kabin içindekinden hızlıdır, bu nedenle bunu da karşılar',
  'models.form.gather.goFill': 'Doldur',
  'models.form.gather.infeasible.warning':
    'Mevcut kapasiteyle bu grup yerleştirilemez; kaydedildikten sonra yer açılana kadar bekler. Seçenekler: “olabildiğince yakın” seçeneğine geçin (sunuculara yayılabilir, KV aktarımı yavaşlar) · kopya sayısını veya kopya başına GPU sayısını azaltın'
};
