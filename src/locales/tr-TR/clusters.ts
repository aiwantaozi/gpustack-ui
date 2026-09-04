export default {
  'clusters.title': 'Küme',
  'clusters.table.provider': 'Sağlayıcı',
  'clusters.table.deployments': 'Dağıtımlar',
  'clusters.button.add': 'Küme Ekle',
  'clusters.button.addCredential': 'Bulut Kimlik Bilgisi Ekle',
  'clusters.button.editCredential': 'Bulut Kimlik Bilgisini Düzenle',
  'clusters.filterBy.cluster': 'Kümeye göre filtrele',
  'clusters.add.cluster': '{cluster} Kümesi Ekle',
  'clusters.edit.cluster': '{cluster} Düzenle',
  'clusters.provider.custom': 'Özel',
  'clusters.button.register': 'Küme Kaydet',
  'clusters.button.addNodePool': 'İşçi Havuzu Ekle',
  'clusters.button.add.credential': '{provider} Kimlik Bilgisi Ekle',
  'clusters.credential.title': 'Bulut Kimlik Bilgisi',
  'clusters.credential.token': 'Erişim Anahtarı',
  'clusters.workerpool.region': 'Bölge',
  'clusters.workerpool.zone': 'Alan',
  'clusters.workerpool.instanceType': 'Örnek Türü',
  'clusters.workerpool.replicas': 'Kopyalar',
  'clusters.workerpool.batchSize': 'Toplu İş Boyutu',
  'clusters.workerpool.osImage': 'İşletim Sistemi İmajı',
  'clusters.workerpool.volumes': 'Birimler',
  'clusters.workerpool.format': 'Format',
  'clusters.workerpool.size': 'Boyut (GiB)',
  'clusters.workerpool.title': 'İşçi Havuzları',
  'clusters.workerpool.cloudOptions': 'Bulut Seçenekleri Ekle',
  'clusters.workerpool.volumes.add': 'Birim Ekle',
  'clusters.create.provider.self': 'Barındırılan',
  'clusters.create.provider.cloud': 'Bulut Sağlayıcı',
  'clusters.create.steps.selectProvider': 'Sağlayıcı Seç',
  'clusters.create.configBasic': 'Temel Yapılandırma',
  'clusters.create.execCommand': 'Komutu Çalıştır',
  'clusters.create.supportedGpu': "Desteklenen GPU'lar",
  'clusters.create.skipfornow': 'Şimdilik Atla',
  'clusters.create.noImages': 'Kullanılabilir imaj yok',
  'clusters.create.noInstanceTypes': 'Kullanılabilir örnek türü yok',
  'clusters.create.noRegions': 'Kullanılabilir bölge yok',
  'clusters.workerpool.batchSize.desc':
    'İşçi havuzunda eşzamanlı olarak oluşturulan işçi düğüm sayısı',
  'clusters.create.addworker.tips':
    'Aşağıdaki komutu çalıştırmadan önce lütfen <a href={link} target="_blank">ön koşulların</a> karşılandığından emin olun.',
  'clusters.create.addCommand.tips':
    'Eklenmesi gereken İşçi Düğümde, kümeye katılması için aşağıdaki komutu çalıştırın.',
  'clusters.create.addCommand.k8s.tips':
    'Kaydedilmesi gereken Kubernetes kümesinde, Kubernetes kaynaklarını oluşturmak ve kümeyi kaydetmek için aşağıdaki komutu çalıştırın.',
  'clusters.create.addCommand.k8s.version.warning':
    'Desteklenen minimum Kubernetes sürümü 1.23’tür. GPU Service özelliğini kullanmak için desteklenen minimum Kubernetes sürümü 1.27’dir.',
  'clusters.create.register.tips':
    'Eklenmesi gereken Kubernetes kümesinde, düğümlerini kümeye katılması için aşağıdaki komutu çalıştırın.',
  'cluster.create.checkEnv.tips':
    'Ortamın hazır olup olmadığını kontrol etmek için aşağıdaki komutu kullanın.',
  'cluster.provider.comingsoon': 'Yakında',
  'clusters.addworker.nvidiaNotes-01':
    'Birden fazla çıkış IP\'si varsa, işçi düğümün kullanmasını istediğinizi belirtin. Lütfen <span class="bold-text">hostname -I | xargs -n1</span> ile kontrol edin.',
  'clusters.addworker.nvidiaNotes-02':
    'İşçi düğümde zaten bir model dizini varsa, bağlamak için yolu belirtebilirsiniz.',
  'clusters.addworker.hygonNotes': `<span class="bold-text">/opt/hyhal</span> veya <span class="bold-text">/opt/dtk</span> mevcut değilse, ilgili Hygon kurulum yollarına işaret eden sembolik bağlantılar oluşturun, örneğin: 
  <span class="desc-fill">ln -s /path/to/hyhal /opt/hyhal</span>
  <span class="desc-fill">ln -s /path/to/dtk /opt/dtk</span>.`,
  'clusters.addworker.corexNotes': `<span class="bold-text">/usr/local/corex</span> dizini mevcut değilse, Iluvatar SDK kurulum yoluna sembolik bağlantı oluşturun:  
<span class="bold-text">ln -s /path/to/corex /usr/local/corex</span>.`,
  'clusters.addworker.metaxNotes': `<span class="bold-text">/opt/mxdriver</span> veya <span class="bold-text">/opt/maca</span> dizini mevcut değilse, MetaX sürücü ve SDK kurulum yoluna sembolik bağlantı oluşturun:  
<span class="desc-fill">ln -s /path/to/mxdriver /opt/mxdriver</span>
<span class="desc-fill">ln -s /path/to/maca /opt/maca</span>.`,
  'clusters.addworker.cambriconNotes': `<span class="bold-text">/usr/local/neuware</span> dizini mevcut değilse, Cambricon kurulum yoluna sembolik bağlantı oluşturun:  
<span class="bold-text">ln -s /path/to/neuware /usr/local/neuware</span>.`,
  'clusters.addworker.hygonNotes-02':
    'Cihaz algılama başarısız olursa, <span class="bold-text">--env ROCM_SMI_LIB_PATH=/opt/hyhal/lib</span> parametresini kaldırmayı deneyin.',
  'clusters.addworker.selectCluster': 'Küme Seç',
  'clusters.addworker.selectCluster.tips':
    '<span class="bold-text">Docker dışı</span> kümeler için lütfen Kümeler sayfasından küme kaydı oluşturun veya işçi havuzlarını yönetin.',
  'clusters.addworker.selectGPU': 'GPU Üreticisi Seç',
  'clusters.addworker.selectGPU.multiTag': 'Multi-select',
  'clusters.addworker.selectGPU.subtitle':
    'Birden fazla GPU Üreticisi seçebilir veya yalnızca CPU kümeleri için hiçbirini seçmeyebilirsiniz',
  'clusters.addworker.checkEnv': 'Ortamı Kontrol Et',
  'clusters.addworker.checkEnv.cpuOnlyTips':
    'Kubernetes kümesinde en az bir hazır düğüm olduğunu doğrulamak için aşağıdaki komutu kullanın. Yalnızca CPU kümelerini kaydediyorsunuz.',
  'clusters.addworker.specifyArgs': 'Argümanları Belirle',
  'clusters.addworker.dtkVersion': 'DTK Sürümü',
  'clusters.addworker.runCommand': 'Komutu Çalıştır',
  'clusters.addworker.specifyWorkerIP': "İşçi Düğüm IP'si",
  'clusters.addworker.detectWorkerIP': "İşçi Düğüm IP'sini Otomatik Algıla",
  'clusters.addworker.specifyWorkerAddress': 'İşçi Düğüm Harici Adresi',
  'clusters.addworker.detectWorkerAddress': 'İşçi Düğüm Harici Adresi',
  'clusters.addworker.detectWorkerAddress.tips':
    "Belirtilmezse İşçi Düğüm IP'si varsayılır.",
  'clusters.addworker.externalIP.tips':
    'VPC veya özel ağda çalıştırılıyorsa, lütfen GPUStack Sunucusuna erişilebilir İşçi Düğüm harici adresini belirtin.',
  'clusters.addworker.enterWorkerIP': "İşçi düğüm IP'sini girin",
  'clusters.addworker.enterWorkerIP.error': "Lütfen işçi düğüm IP'sini girin.",
  'clusters.addworker.enterWorkerAddress': 'İşçi düğüm harici adresini girin',
  'clusters.addworker.enterWorkerAddress.error':
    'Lütfen işçi düğüm harici adresini girin.',
  'clusters.addworker.extraVolume': 'Ek Birim Bağlama',
  'clusters.addworker.cacheVolume': 'Model Önbellek Birimi Bağlama',
  'clusters.addworker.cacheVolume.tips':
    'Model önbellek dizinini özelleştirmek istiryorsanız, bağlamak için yolu belirtebilirsiniz.',
  'clusters.addworker.configSummary': 'Yapılandırma Özeti',
  'clusters.addworker.gpuVendor': 'GPU Üreticisi',
  'clusters.addworker.workerIP': "İşçi Düğüm IP'si",
  'clusters.addworker.workerExternalIP': 'İşçi Düğüm Harici Adresi',
  'clusters.addworker.notSpecified': 'Belirtilmedi',
  'clusters.addworker.autoDetect': 'Otomatik',
  'clusters.addworker.extraVolume.holder':
    'örn. /data/models (yol / ile başlamalıdır). Birden fazla yolu virgülle ayırın.',
  'clusters.addworker.cacheVolume.holder':
    'örn. /data/cache (yol / ile başlamalıdır)',
  'clusters.addworker.vendorNotes.title': '{vendor} Cihaz Notları',
  'clusters.button.genToken':
    'Yeni token oluşturmanız mı gerekiyor? <a href="{link}" target="_blank">Buraya tıklayın</a>.',
  'clusters.addworker.amdNotes-01': `<span class="bold-text">/opt/rocm</span> dizini mevcut değilse, lütfen ROCm kurulum yoluna işaret eden sembolik bağlantı oluşturun: <span class="bold-text">ln -s /path/to/rocm /opt/rocm</span>.`,
  'clusters.addworker.message.success_single':
    '{count} yeni işçi düğüm kümeye eklendi.',
  'clusters.addworker.message.success_multiple':
    '{count} yeni işçi düğüm kümeye eklendi.',
  'clusters.create.serverUrl': "GPUStack Sunucu URL'si",
  'clusters.create.workerConfig': 'İşçi Düğüm Yapılandırması',
  'clusters.edit.k8sOptions.changed.tip':
    'Kubernetes seçeneklerini değiştirdiniz. Değişikliklerin etkili olması için kayıt komutunu hedef kümede yeniden çalıştırın.',
  'clusters.addworker.containerName': 'İşçi Düğüm Konteyner Adı',
  'clusters.addworker.containerName.tips':
    'İşçi düğüm konteyneri için bir ad belirtin.',
  'clusters.addworker.dataVolume': 'GPUStack Veri Birimi',
  'clusters.addworker.dataVolume.tips':
    'GPUStack için veri depolama yolu belirtin.',
  'clusters.table.ip.internal': 'Dahili',
  'clusters.table.ip.external': 'Harici',
  'clusters.form.serverUrl.tips':
    "İşçi düğüm GPUStack Sunucusuna doğrudan erişemiyorsa, harici olarak erişilebilir bir GPUStack hizmet URL'si belirtin.",
  'clusters.form.setDefault': 'Varsayılan Olarak Ayarla',
  'clusters.form.setDefault.tips': 'Dağıtım için varsayılan.',
  'clusters.addworker.noClusters': 'Kullanılabilir Docker kümesi bulunamadı',
  'clusters.create.steps.complete.tips': 'Küme başarıyla oluşturuldu!',
  'clusters.create.steps.complete': 'Tamamla',
  'clusters.create.steps.configure': 'Yapılandır',
  'clusters.create.dockerTips1': 'Sonraki adım, bu kümeye işçi düğüm ekleyin.',
  'clusters.create.dockerTips2':
    'Bu adımı atlayabilir ve daha sonra küme listesinden ekleyebilirsiniz.',
  'clusters.create.k8sTips1':
    'Sonraki adım, mevcut Kubernetes kümesini kaydedin.',
  'clusters.create.k8sTips2':
    'Bu adımı atlayabilir ve daha sonra küme listesinden kaydedebilirsiniz.',
  'clusters.addworker.theadNotes':
    '<span class="bold-text">/usr/local/PPU_SDK</span> dizini mevcut değilse, lütfen T-Head PPU SDK kurulum yoluna işaret eden sembolik bağlantı oluşturun: <span class="bold-text">ln -s /path/to/PPU_SDK /usr/local/PPU_SDK</span>.',
  'clusters.addworker.theadNotes-02':
    'T-Head PPU, cihaz enjeksiyonu için Container Device Interface (CDI) kullanır ve CDI oluşturma için <span class="bold-text">/var/run/cdi</span> dizininin kullanılabilir olmasını gerektirir.',
  'clusters.addworker.nvidiaNotes':
    'GPUStack\'teki yerleşik çıkarım altyapıları <span class="bold-text">CUDA 12.8+</span> gerektirir. Lütfen NVIDIA sürücü sürümünüzün <span class="bold-text">570</span> veya daha yeni olduğundan emin olun.',
  'clusters.volume.title': 'Volume Mounts',
  'clusters.volume.name': 'Volume Name',
  'clusters.volume.mountPath': 'Container Path',
  'clusters.volume.mountPath.format': 'Path must start with /',
  'clusters.volume.readOnly': 'Read Only',
  'clusters.volume.sourceType': 'Source Type',
  'clusters.volume.sourceType.hostPath': 'Host Path',
  'clusters.volume.sourceType.pvc': 'Persistent Volume Claim (PVC)',
  'clusters.volume.sourceType.configMap': 'ConfigMap',
  'clusters.volume.hostPath.path': 'Host Path',
  'clusters.volume.hostPath.type': 'Path Type',
  'clusters.volume.hostPath.type.directory': 'Directory',
  'clusters.volume.hostPath.type.directoryOrCreate':
    'Directory (create if not exists)',
  'clusters.volume.hostPath.type.file': 'File',
  'clusters.volume.hostPath.type.fileOrCreate': 'File (create if not exists)',
  'clusters.volume.hostPath.type.socket': 'Socket',
  'clusters.volume.hostPath.type.charDevice': 'Character Device',
  'clusters.volume.hostPath.type.blockDevice': 'Block Device',
  'clusters.volume.pvc.claimName': 'PVC Name',
  'clusters.volume.pvc.readOnly': 'Read Only',
  'clusters.volume.configMap.name': 'ConfigMap Name',
  'clusters.volume.configMap.optional': 'Optional',
  'clusters.volume.add': 'Add Volume Mount',
  'clusters.systemDefaultContainerRegistry.title': 'Default Container Registry',
  'clusters.systemDefaultContainerRegistry.tip':
    'Default registry used to resolve GPUStack images for this cluster. Falls back to the server default when unset.',
  'clusters.systemDefaultContainerRegistry.dockerHubUnreachable':
    '{provider} örnekleri Docker Hub’a erişemez. Bir ayna veya özel kayıt defteri kullanın.',
  'clusters.k8sOptions.title': 'Kubernetes Deployment Options',
  'clusters.imageCredentials.title': 'Image Credentials',
  'clusters.imageCredentials.add': 'Add Credential',
  'clusters.imageCredentials.registry': 'Registry',
  'clusters.imageCredentials.username': 'Username',
  'clusters.imageCredentials.password': 'Password',
  'clusters.nodeSelector.title': 'Node Selector',
  'clusters.nodeSelector.tip':
    'Pod nodeSelector applied to every worker DaemonSet — only nodes whose labels match are eligible to run the worker.',
  'clusters.operatorImage.title': 'Operator Image',
  'clusters.operatorImage.tip':
    'Override for the GPUStack Operator container image. Leave empty to use the server default.',
  'clusters.namespace.title': 'Namespace',
  'clusters.namespace.tip':
    'Kubernetes namespace the cluster’s manifests render into. Leave empty to use gpustack-system.',
  'clusters.clusterType.title': 'Cluster Type',
  'clusters.modelService.title': 'Model Service',
  'clusters.modelService.tip':
    'For LLM inference and API serving — e.g. exposing model APIs and token-based services.',
  'clusters.gpuInstances.title': 'GPU Service',
  'clusters.gpuInstances.tip':
    'For on-demand GPU compute — e.g. interactive development, training jobs, or custom environments.',
  'clusters.gpuInstances.staticAddress': 'GPU Service Static Access Address',
  'clusters.gpuInstances.staticAddress.tip':
    'Static address the operator uses to access GPU instances in this cluster (e.g. a LoadBalancer VIP). Operator default: empty — the access address is generated from host IPs. Changing it does not re-address GPU instances that are already deployed; it applies to newly created ones.',
  'clusters.gpuInstances.derivedFromNode': 'Derive Instance Types from Nodes',
  'clusters.gpuInstances.derivedFromNode.tip':
    'Whether the operator auto-derives instance types (and their backing queues) from node hardware. Enabled: the operator authors a derived instance type for each node flavor. Disabled: it only aligns the resource flavor, and you define every instance type yourself. Operator default: Enabled.',
  'clusters.gpuInstances.mixedOnNode': 'Allow Mixed Instance Types on a Node',
  'clusters.gpuInstances.mixedOnNode.tip':
    'Whether one node may serve both an accelerated and a CPU-only instance type. Enabled: a node is summarized into every type it can serve. Disabled: a node with accelerators yields only an accelerated type, and a CPU-only node only a general one. Operator default: Enabled.',
  'clusters.gpuInstances.setting.enabled': 'Enabled',
  'clusters.gpuInstances.setting.disabled': 'Disabled',
  'clusters.gpuInstances.setting.unmanaged':
    'Unmanaged (the cluster keeps its own value)',

  // Topology: where this cluster's workers sit.
  'clusters.topology.title': 'Topoloji',
  'clusters.topology.noRebalance':
    'Konum yalnızca sonraki zamanlamayı etkiler. Çalışan dağıtımlar taşınmaz.',
  'clusters.topology.load.failed': 'Topoloji yüklenemedi.',
  'clusters.topology.save.failed': 'Kaydedilemedi.',
  'clusters.topology.preview.failed': 'Bu eşleme önizlenemedi.',
  'clusters.topology.preview.noWorkers': 'Bu kümede henüz worker yok.',
  'clusters.topology.preview.capacity':
    '{workers} worker · {gpus} GPU · {free} boş',
  'clusters.topology.cluster': 'Küme',
  'clusters.topology.discard.ok': 'Vazgeç',
  'clusters.topology.field.region': 'Bölge',
  'clusters.topology.field.zone': 'Kullanılabilirlik alanı',
  'clusters.topology.field.room': 'Oda',
  'clusters.topology.field.row': 'Sıra',
  'clusters.topology.field.rack': 'Kabin',
  'clusters.topology.field.switch': 'Erişim anahtarı',
  'clusters.topology.field.acceleratorDomain': 'Hızlandırıcı etki alanı',
  'clusters.topology.field.host': 'Sunucu',
  'clusters.topology.field.region.tips': 'Bulut bölgesi veya veri merkezi',
  'clusters.topology.field.zone.tips': 'Kullanılabilirlik alanı veya salon',
  'clusters.topology.field.room.tips': 'Makine odası',
  'clusters.topology.field.row.tips': 'Kabin sırası',
  'clusters.topology.field.rack.tips': 'Kabin',
  'clusters.topology.field.switch.tips':
    'Cihaz tarafından bildirilir (LLDP); elle de doldurulabilir',
  'clusters.topology.field.acceleratorDomain.tips':
    'Cihaz bildirmiyorsa elle doldurun',
  'clusters.topology.overview.workers': '{count} worker',
  'clusters.topology.overview.domains': '{count} {field}',
  'clusters.topology.overview.acceleratorDomains':
    '{count} hızlandırıcı etki alanı',
  'clusters.topology.overview.acceleratorDomains.auto':
    '{count} hızlandırıcı etki alanı (otomatik)',
  'clusters.topology.overview.unfilled': '{count} tanesinde {field} yok',
  'clusters.topology.previewing': '● Önizleme',
  'clusters.topology.previewing.long':
    '● Önizleme: ana çekmece kaydedilmemiş eşlemeyi gösteriyor',
  'clusters.topology.view.table': 'Tablo',
  'clusters.topology.view.tree': 'Ağaç',
  'clusters.topology.search.placeholder': 'Sunucu ara…',
  'clusters.topology.filter.unfilled': 'Yalnızca doldurulmamışlar',
  'clusters.topology.columns': 'Sütunlar',
  'clusters.topology.columns.fields': 'Konum alanları',
  'clusters.topology.columns.other': 'Diğer',
  'clusters.topology.columns.custom': 'Özel alan…',
  'clusters.topology.columns.mapping': 'Etiket anahtarı eşlemesi…',
  'clusters.topology.columns.deleteCustom': '“{name}” alanını sil',
  'clusters.topology.columns.deleteCustom.confirm':
    '“{name}” alanı silinsin mi? Doldurulmuş değerler worker etiketlerinde kalır.',
  'clusters.topology.columns.deleted': '“{name}” alanı silindi',
  'clusters.topology.selected': '{count} seçili',
  'clusters.topology.clearSelection': 'Seçimi temizle',
  'clusters.topology.batch.button': 'Konum ayarla',
  'clusters.topology.batch.title': 'Konum ayarla · {count} seçili',
  'clusters.topology.batch.field': 'Alan',
  'clusters.topology.batch.value': 'Değer',
  'clusters.topology.batch.overwrite':
    '{count} mevcut değerin üzerine yazılacak: {names}',
  'clusters.topology.batch.overwriteAuto':
    'Bunların {count} tanesinin {field} değeri cihaz tarafından bildirildi; geçersiz kılınacak',
  'clusters.topology.batch.more': '{names} ve {count} tane daha',
  'clusters.topology.batch.apply': '{count} tanesine uygula',
  'clusters.topology.batch.partial': 'Yazma {failed} kümede başarısız oldu.',
  'clusters.topology.toast.setOne': '{host} için {field}: {value}',
  'clusters.topology.toast.clearedOne': '{host} için {field} temizlendi',
  'clusters.topology.toast.set': '{count} worker için {field}: {value}',
  'clusters.topology.toast.cleared': '{count} worker için {field} temizlendi',
  'clusters.topology.toast.firstWrite':
    ' (yalnızca sonraki zamanlamayı etkiler)',
  'clusters.topology.undo': 'Geri al',
  'clusters.topology.undo.done': 'Geri alındı',
  'clusters.topology.undo.failed': 'Geri alınamadı: {reason}',
  'clusters.topology.cell.fill': '{field} doldur',
  'clusters.topology.cell.aria': '{field}, {state}, {host}',
  'clusters.topology.state.unfilled': 'doldurulmamış',
  'clusters.topology.state.discovered.aria':
    '{value}, cihaz tarafından bildirildi',
  'clusters.topology.state.override.aria':
    '{value}, bildirilen değerin üzerine elle girildi',
  'clusters.topology.state.discovered.tips':
    'Cihaz tarafından bildirildi ({key}). Elle doldurmak bunu geçersiz kılar.',
  'clusters.topology.state.override.tips':
    'Elle girildi. Temizlemek bildirilen {value} değerini geri getirir',
  'clusters.topology.state.user.tips': 'Elle girildi ({key})',
  'clusters.topology.override.confirm':
    'Bu değer cihaz tarafından bildirildi; elle doldurmak onu geçersiz kılar.',
  'clusters.topology.override.ok': 'Geçersiz kıl',
  'clusters.topology.value.count': '{count} worker',
  'clusters.topology.value.create': '“{value}” oluştur',
  'clusters.topology.value.clear': 'Temizle',
  'clusters.topology.column.menu': '{field} sütun menüsü',
  'clusters.topology.column.fillUnfilled':
    'Doldurulmamış {count} taneyi doldur…',
  'clusters.topology.column.fillBySwitch':
    'Erişim anahtarına göre doldur ({count} grup)…',
  'clusters.topology.column.gpus': 'GPU / boş',
  'clusters.topology.column.source': 'Kaynak',
  'clusters.topology.source.user': 'elle',
  'clusters.topology.source.discovered': 'otomatik',
  'clusters.topology.source.node': 'K8s düğümü',
  'clusters.topology.host.online': 'Çevrimiçi',
  'clusters.topology.host.offline': 'Çevrimdışı',
  'clusters.topology.tree.byLayer': 'Katmana göre',
  'clusters.topology.tree.byDomain': 'Hızlandırıcı etki alanına göre',
  'clusters.topology.tree.byField': '{field} alanına göre',
  'clusters.topology.tree.expandAll': 'Tümünü genişlet',
  'clusters.topology.tree.collapseAll': 'Tümünü daralt',
  'clusters.topology.tree.spansDomains': '{count} etki alanına yayılıyor',
  'clusters.topology.tree.unfilled': 'Henüz {field} yok',
  'clusters.topology.tree.unknownDomain': 'Bilinmeyen etki alanı',
  'clusters.topology.tree.more': '{count} tane daha',
  'clusters.topology.tree.hostCapacity': '{gpus} GPU · {free} boş',
  'clusters.topology.onboarding.hosts': '{hosts} sunucu bulundu.',
  'clusters.topology.onboarding.withDomains':
    '{hosts} sunucu ve {domains} hızlandırıcı etki alanı bulundu (otomatik).',
  'clusters.topology.onboarding.goal':
    'Ayrıştırılmış bir grubun üyelerini bir arada tutmak için:',
  'clusters.topology.onboarding.steps':
    '① Aynı kabindeki makineleri seçin → ② “Konum ayarla” ile kabin adını girin → ③ Dağıtırken “aynı kabin” seçin',
  'clusters.topology.onboarding.domains':
    'Çok düğümlü NVLink veya Ascend süper pod içeren makinelerin hızlandırıcı etki alanı burada otomatik görünür.',
  'clusters.topology.onboarding.dismiss': 'Anladım',
  'clusters.topology.mapping.title': 'Etiket anahtarı eşlemesi',
  'clusters.topology.mapping.intro':
    'Her alanın değerini hangi worker etiketinden okuduğu',
  'clusters.topology.mapping.layers': 'Katmanlar',
  'clusters.topology.mapping.layers.tips':
    'İç içe: her seviye bir üsttekinin içinde yer alır',
  'clusters.topology.mapping.layers.status': '{count} alan kullanımda',
  'clusters.topology.mapping.layers.status.empty': 'Hiç alan dolu değil',
  'clusters.topology.mapping.domain.status': '{count} etki alanı',
  'clusters.topology.mapping.domain.status.inactive': 'Çözümlenmedi',
  'clusters.topology.mapping.showUnused': 'Kullanılmayan {count} alanı göster',
  'clusters.topology.mapping.hideUnused': 'Kullanılmayan alanları gizle',
  'clusters.topology.mapping.moreKeys': '+ {count} aday anahtar',
  'clusters.topology.mapping.classified': 'Çözümlenen {classified} / {total}',
  'clusters.topology.mapping.noKeys': 'Etiket anahtarı yok',
  'clusters.topology.mapping.domain.tips':
    'Katman değil, düz gruplar: NVLink / HCCS / UB üzerinden birbirinin belleğine doğrudan erişebilen makineler aynı çembere alınır. Bir etki alanı birkaç kabini kapsayabilir ya da tek bir makine kadar küçük olabilir',
  'clusters.topology.mapping.domain.stats':
    '{domains} etki alanı; en büyüğü {racks} kabini kapsıyor',
  'clusters.topology.mapping.subDomain.tips':
    'Aynı etki alanı ve kademedeki makineler önce bir araya yerleştirilir (ör. Atlas 950 hesaplama kabini); etki alanları oluştuğunda, etki alanı içindeki kademe olarak bir konum alanı seçilebilir',
  'clusters.topology.mapping.subDomain.placeholder':
    'Henüz hızlandırıcı etki alanı bildiren worker yok',
  'clusters.topology.layer.labelKeys': 'Etiket anahtarları',
  'clusters.topology.layer.addKey': 'Anahtar ekle',
  'clusters.topology.layer.name': 'Ad',
  'clusters.topology.advanced.hostKeys': 'Yerleşik, worker adına göre',
  'clusters.topology.advanced.locked':
    'GPUStack’in kendi anahtarı: elle girilen değerler buraya yazılır. Silinemez veya taşınamaz.',
  'clusters.topology.advanced.subDomain': 'Alt etki alanı',
  'clusters.topology.advanced.subDomain.none': 'Yok',
  'clusters.topology.advanced.subDomain.keys': 'Kendi anahtarlarım…',
  'clusters.topology.advanced.suggestions': 'Keşfedilen etiket anahtarları',
  'clusters.topology.advanced.suggestion':
    '{workers} worker · {values} değer · {field} gibi görünüyor',
  'clusters.topology.advanced.discard':
    'Alan eşlemesindeki değişiklikler atılsın mı?',
  'clusters.topology.advanced.discard.tips':
    'Tabloda girilen değerler etkilenmez.',
  'clusters.topology.advanced.saved':
    'Kaydedildi. Yalnızca sonraki zamanlamayı etkiler; çalışan gruplar taşınmaz.',
  'clusters.topology.keys.placeholder':
    'Bir etiket anahtarı yazın veya aşağıdan seçin',
  'clusters.topology.keys.invalid':
    'Geçerli bir Kubernetes etiket anahtarı değil (önek ≤ 253, ad ≤ 63, harf/rakam - _ .)',
  'clusters.topology.keys.usage':
    '{count} worker bu anahtarı taşıyor ({values} değer)',
  'clusters.topology.keys.exists': 'Bu anahtar zaten eklendi',
  'clusters.topology.custom.title': 'Özel alan',
  'clusters.topology.custom.name.required': 'Bir ad girin',
  'clusters.topology.custom.name.taken': 'Bu ad alınmış veya ayrılmış',
  'clusters.topology.custom.name.tips':
    'Dağıtım formunda bir seçenek olarak görünür',
  'clusters.topology.custom.position': 'Zincirde nereye',
  'clusters.topology.custom.slot.insert': 'Buraya ekle',
  'clusters.topology.custom.slot.placeholder': 'Yeni katman',
  'clusters.topology.custom.slot.explain':
    'Bir {parent} içinde birden çok {name}, bir {name} içinde birden çok {child} bulunur',
  'clusters.topology.custom.slot.explain.top':
    'Bir {name} içinde birden çok {child} bulunur',
  'clusters.topology.custom.keys.tips':
    'Özel katmanın kendi anahtarı yoktur; tablodan doldurabilmek için ilk anahtarı yazmayı planladığınız anahtar yapın.',
  'clusters.topology.custom.referenced':
    '“{name}” silinemez: şu modeller buna göre topluyor'
};
