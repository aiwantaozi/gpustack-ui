export default {
  'clusters.title': 'Cluster',
  'clusters.table.provider': 'Provider',
  'clusters.table.deployments': 'Deployments',
  'clusters.button.add': 'Add Cluster',
  'clusters.button.addCredential': 'Add Cloud Credential',
  'clusters.button.editCredential': 'Edit Cloud Credential',
  'clusters.filterBy.cluster': 'Filter by cluster',
  'clusters.add.cluster': 'Add {cluster} Cluster',
  'clusters.edit.cluster': 'Edit {cluster}',
  'clusters.provider.custom': 'Custom',
  'clusters.button.register': 'Register Cluster',
  'clusters.button.addNodePool': 'Add Worker Pool',
  'clusters.button.add.credential': 'Add {provider} Credential',
  'clusters.credential.title': 'Cloud Credential',
  'clusters.credential.token': 'Access Token',
  'clusters.workerpool.region': 'Region',
  'clusters.workerpool.zone': 'Zone',
  'clusters.workerpool.instanceType': 'Instance Type',
  'clusters.workerpool.replicas': 'Replicas',
  'clusters.workerpool.batchSize': 'Batch Size',
  'clusters.workerpool.osImage': 'OS Image',
  'clusters.workerpool.volumes': 'Volumes',
  'clusters.workerpool.format': 'Format',
  'clusters.workerpool.size': 'Size (GiB)',
  'clusters.workerpool.title': 'Worker Pools',
  'clusters.workerpool.cloudOptions': 'Add Cloud Options',
  'clusters.workerpool.volumes.add': 'Add Volume',
  'clusters.create.provider.self': 'Self-Hosted',
  'clusters.create.provider.cloud': 'Cloud Provider',
  'clusters.create.steps.selectProvider': 'Select Provider',
  'clusters.create.configBasic': 'Basic Configuration',
  'clusters.create.execCommand': 'Execute Command',
  'clusters.create.supportedGpu': 'Supported GPUs',
  'clusters.create.skipfornow': 'Skip for Now',
  'clusters.create.noImages': 'No images available',
  'clusters.create.noInstanceTypes': 'No instance types available',
  'clusters.create.noRegions': 'No regions available',
  'clusters.workerpool.batchSize.desc':
    'Number of workers created simultaneously in the Worker pool',
  'clusters.create.addworker.tips':
    'Please make sure the <a href={link} target="_blank">prerequisites</a> are met before executing the following command.',
  'clusters.create.addCommand.tips':
    'On the Worker that needs to be added, run the following command to join it to the cluster.',
  'clusters.create.addCommand.k8s.tips':
    '登録する Kubernetes クラスターで以下のコマンドを実行し、Kubernetes リソースを作成してクラスターを登録します。',
  'clusters.create.addCommand.k8s.version.warning':
    'サポートされる Kubernetes の最小バージョンは 1.23 です。GPU Service 機能を使用する場合、サポートされる Kubernetes の最小バージョンは 1.27 です。',
  'cluster.create.checkEnv.tips':
    'Use the following command to check if the environment is ready.',
  'clusters.create.register.tips':
    ' On the Kubernetes cluster that needs to be added, run the following command to join its nodes to the cluster.',
  'cluster.provider.comingsoon': 'Coming soon',
  'clusters.addworker.nvidiaNotes-01':
    'If multiple outbound IPs exist, specify the one you want the worker to use. Please double-check with <span class="bold-text">hostname -I | xargs -n1</span>.',
  'clusters.addworker.nvidiaNotes-02':
    'If a model directory already exists on the worker, you can specify the path to mount it.',
  'clusters.addworker.hygonNotes': `If <span class="bold-text">/opt/hyhal</span> or <span class="bold-text">/opt/dtk</span> does not exist, create symbolic links pointing to the corresponding Hygon installation paths, for example: 
  <span class="desc-fill">ln -s /path/to/hyhal /opt/hyhal</span> 
  <span class="desc-fill">ln -s /path/to/dtk /opt/dtk</span>.`,
  'clusters.addworker.corexNotes': `If the <span class="bold-text">/usr/local/corex</span> directory does not exist, create a symbolic link to the Iluvatar SDK installation path:  
<span class="bold-text">ln -s /path/to/corex /usr/local/corex</span>.`,
  'clusters.addworker.metaxNotes': `If the <span class="bold-text">/opt/mxdriver</span> or <span class="bold-text">/opt/maca</span> directory does not exist, create a symbolic link to the MetaX driver and SDK installation path:  
<span class="desc-fill">ln -s /path/to/mxdriver /opt/mxdriver</span>
<span class="desc-fill">ln -s /path/to/maca /opt/maca</span>.`,
  'clusters.addworker.cambriconNotes': `If the <span class="bold-text">/usr/local/neuware</span> directory does not exist, create a symbolic link to the Cambricon installation path:  
<span class="bold-text">ln -s /path/to/neuware /usr/local/neuware</span>.`,
  'clusters.addworker.hygonNotes-02':
    'If device detection fails, try removing <span class="bold-text">--env ROCM_SMI_LIB_PATH=/opt/hyhal/lib</span>.',
  'clusters.addworker.selectCluster': 'Select Cluster',
  'clusters.addworker.selectCluster.tips':
    'For <span class="bold-text">non-Docker</span> clusters, please register clusters or manage worker pools from the Clusters page.',
  'clusters.addworker.selectGPU': 'Select GPU Vendor',
  'clusters.addworker.selectGPU.multiTag': 'Multi-select',
  'clusters.addworker.selectGPU.subtitle':
    '複数の GPU ベンダーを選択するか、CPU クラスター専用の場合は選択不要です',
  'clusters.addworker.checkEnv': 'Check Environment',
  'clusters.addworker.checkEnv.cpuOnlyTips':
    '以下のコマンドを使用して、Kubernetes クラスターに少なくとも 1 つのレディーノードがあることを確認してください。CPU クラスターを登録しています。',
  'clusters.addworker.specifyArgs': 'Specify Arguments',
  'clusters.addworker.dtkVersion': 'DTK バージョン',
  'clusters.addworker.runCommand': 'Run Command',
  'clusters.addworker.specifyWorkerIP': 'Worker IP',
  'clusters.addworker.detectWorkerIP': 'Worker IP を自動検出',
  'clusters.addworker.specifyWorkerAddress': 'Worker 外部アドレス',
  'clusters.addworker.detectWorkerAddress': 'Worker 外部アドレス',
  'clusters.addworker.detectWorkerAddress.tips':
    '指定がない場合、デフォルトで Worker IP が使用されます。',
  'clusters.addworker.externalIP.tips':
    'VPCやプライベートネットワークで動作している場合は、サーバーから到達可能なWorkerの外部アドレスを指定してください。',
  'clusters.addworker.enterWorkerIP': 'Enter worker IP',
  'clusters.addworker.enterWorkerIP.error': 'Please enter the worker IP.',
  'clusters.addworker.enterWorkerAddress': 'Enter worker external address',
  'clusters.addworker.enterWorkerAddress.error':
    'Please enter the worker external address.',
  'clusters.addworker.extraVolume': 'Additional Volume Mount',
  'clusters.addworker.cacheVolume': 'Model Cache Volume Mount',
  'clusters.addworker.cacheVolume.tips':
    'If you want to customize the model cache directory, you can specify the path to mount it.',
  'clusters.addworker.configSummary': 'Configuration Summary',
  'clusters.addworker.gpuVendor': 'GPU Vendor',
  'clusters.addworker.workerIP': 'Worker IP',
  'clusters.addworker.workerExternalIP': 'Worker External Address',
  'clusters.addworker.notSpecified': 'Not Specified',
  'clusters.addworker.autoDetect': 'Auto',
  'clusters.addworker.extraVolume.holder':
    'e.g. /data/models (path must start with /). Use commas to separate multiple paths.',
  'clusters.addworker.cacheVolume.holder':
    'e.g. /data/cache (path must start with /)',
  'clusters.addworker.vendorNotes.title': 'Notes for {vendor} Device',
  'clusters.button.genToken':
    'Need to create a new token? Click <a href="{link}" target="_blank">here</a>.',
  'clusters.addworker.amdNotes-01': `If the <span class="bold-text">/opt/rocm</span> directory does not exist, please create a symbolic link pointing to the ROCm installed path: <span class="bold-text">ln -s /path/to/rocm /opt/rocm</span>.`,
  'clusters.addworker.message.success_single':
    '{count} new worker has been added to the cluster.',
  'clusters.addworker.message.success_multiple':
    '{count} new workers have been added to the cluster.',
  'clusters.create.serverUrl': 'GPUStack Server URL',
  'clusters.create.workerConfig': 'Worker Configuration',
  'clusters.edit.k8sOptions.changed.tip':
    'Kubernetes オプションを変更しました。変更を有効にするには、対象クラスターで登録コマンドを再実行してください。',
  'clusters.addworker.containerName': 'Worker Container Name',
  'clusters.addworker.containerName.tips':
    'Specify a name for the worker container.',
  'clusters.addworker.dataVolume': 'GPUStack Data Volume',
  'clusters.addworker.dataVolume.tips':
    'Specify a data storage path for GPUStack.',
  'clusters.table.ip.internal': 'Internal',
  'clusters.table.ip.external': 'External',
  'clusters.form.serverUrl.tips':
    'Specify an externally accessible GPUStack service URL if the worker cannot access GPUStack Server directly.',
  'clusters.form.setDefault': 'Set as Default',
  'clusters.form.setDefault.tips': 'Default for deployment.',
  'clusters.addworker.noClusters': 'No available Docker clusters found',
  'clusters.create.steps.complete.tips': 'Cluster created successfully!',
  'clusters.create.steps.complete': 'Complete',
  'clusters.create.steps.configure': 'Configure',
  'clusters.create.dockerTips1': 'Next, add worker to this cluster.',
  'clusters.create.dockerTips2':
    'You can also skip this step and add them later from the cluster list.',
  'clusters.create.k8sTips1': 'Next, register existing Kubernetes cluster.',
  'clusters.create.k8sTips2':
    'You can also skip this step and register it later from the cluster list.',
  'clusters.addworker.theadNotes':
    'If the <span class="bold-text>/usr/local/PPU_SDK</span> directory does not exist, please create a symbolic link pointing to the T-Head PPU SDK installed path: <span class="bold-text>ln -s /path/to/PPU_SDK /usr/local/PPU_SDK</span>',
  'clusters.addworker.theadNotes-02':
    'T-Head PPU uses the Container Device Interface (CDI) for device injection and requires the <span class="bold-text">/var/run/cdi</span> directory to be available for CDI generation.',
  'clusters.addworker.nvidiaNotes':
    'The built-in inference backends in GPUStack require <span class="bold-text">CUDA 12.8+</span>. Please ensure your NVIDIA driver version is <span class="bold-text">570</span> or newer.',
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
    '{provider} instances cannot reach Docker Hub. Use a mirror or a private registry.',
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
  'clusters.topology.title': 'トポロジー',
  'clusters.topology.noRebalance':
    '位置は以後のスケジューリングにのみ影響します。実行中のデプロイは移動されません。',
  'clusters.topology.load.failed': 'トポロジーを読み込めませんでした。',
  'clusters.topology.save.failed': '保存できませんでした。',
  'clusters.topology.preview.failed':
    'このマッピングをプレビューできませんでした。',
  'clusters.topology.preview.noWorkers':
    'このクラスターにはまだ worker がありません。',
  'clusters.topology.preview.capacity':
    '{workers} 台 · {gpus} GPU · 空き {free}',
  'clusters.topology.cluster': 'クラスター',
  'clusters.topology.discard.ok': '破棄',
  'clusters.topology.field.region': 'リージョン',
  'clusters.topology.field.zone': 'ゾーン',
  'clusters.topology.field.room': 'マシンルーム',
  'clusters.topology.field.row': 'ラック列',
  'clusters.topology.field.rack': 'ラック',
  'clusters.topology.field.switch': 'アクセススイッチ',
  'clusters.topology.field.acceleratorDomain': 'アクセラレータードメイン',
  'clusters.topology.field.host': 'ホスト',
  'clusters.topology.field.region.tips':
    'クラウドリージョンまたはデータセンター',
  'clusters.topology.field.zone.tips': 'アベイラビリティゾーンまたはホール',
  'clusters.topology.field.room.tips': 'マシンルーム',
  'clusters.topology.field.row.tips': 'ラックの列',
  'clusters.topology.field.rack.tips': 'ラックまたはキャビネット',
  'clusters.topology.field.switch.tips':
    'デバイス自己報告（LLDP）。手入力も可能',
  'clusters.topology.field.acceleratorDomain.tips':
    'デバイスが報告しない場合は手入力',
  'clusters.topology.overview.workers': '{count} 台の worker',
  'clusters.topology.overview.domains': '{field} {count} 個',
  'clusters.topology.overview.acceleratorDomains':
    'アクセラレータードメイン {count} 個',
  'clusters.topology.overview.acceleratorDomains.auto':
    'アクセラレータードメイン {count} 個（自動）',
  'clusters.topology.overview.unfilled': '{count} 台に{field}がありません',
  'clusters.topology.previewing': '● プレビュー中',
  'clusters.topology.previewing.long':
    '● プレビュー中：メインドロワーは未保存のマッピングで表示中',
  'clusters.topology.view.table': 'テーブル',
  'clusters.topology.view.tree': 'ツリー',
  'clusters.topology.search.placeholder': 'ホストを検索…',
  'clusters.topology.filter.unfilled': '未入力のみ',
  'clusters.topology.columns': '列の設定',
  'clusters.topology.columns.fields': '位置フィールド',
  'clusters.topology.columns.other': 'その他',
  'clusters.topology.columns.custom': 'カスタムフィールド…',
  'clusters.topology.columns.mapping': 'ラベルキーのマッピング…',
  'clusters.topology.columns.deleteCustom': 'フィールド「{name}」を削除',
  'clusters.topology.columns.deleteCustom.confirm':
    'フィールド「{name}」を削除しますか？入力済みの値は worker のラベルに残ります。',
  'clusters.topology.columns.deleted': 'フィールド「{name}」を削除しました',
  'clusters.topology.selected': '{count} 台選択中',
  'clusters.topology.clearSelection': '選択を解除',
  'clusters.topology.batch.button': '位置を設定',
  'clusters.topology.batch.title': '位置を設定 · {count} 台選択中',
  'clusters.topology.batch.field': 'フィールド',
  'clusters.topology.batch.value': '値',
  'clusters.topology.batch.overwrite':
    '{count} 台の既存の値を上書きします：{names}',
  'clusters.topology.batch.overwriteAuto':
    'うち {count} 台の{field}はデバイス自己報告で、上書きされます',
  'clusters.topology.batch.more': '{names} ほか {count} 台',
  'clusters.topology.batch.apply': '{count} 台に適用',
  'clusters.topology.batch.partial':
    '{failed} 個のクラスターで書き込みに失敗しました。',
  'clusters.topology.toast.setOne': '{host} の{field}を {value} に設定しました',
  'clusters.topology.toast.clearedOne': '{host} の{field}をクリアしました',
  'clusters.topology.toast.set': '{count} 台の{field}を {value} に設定しました',
  'clusters.topology.toast.cleared': '{count} 台の{field}をクリアしました',
  'clusters.topology.toast.firstWrite': '（以後のスケジューリングにのみ影響）',
  'clusters.topology.undo': '元に戻す',
  'clusters.topology.undo.done': '元に戻しました',
  'clusters.topology.undo.failed': '元に戻せませんでした：{reason}',
  'clusters.topology.cell.fill': '{field}を入力',
  'clusters.topology.cell.aria': '{field}、{state}、{host}',
  'clusters.topology.state.unfilled': '未入力',
  'clusters.topology.state.discovered.aria': '{value}、デバイス自己報告',
  'clusters.topology.state.override.aria': '{value}、手入力で上書き',
  'clusters.topology.state.discovered.tips':
    'デバイス自己報告（{key}）。手入力すると上書きされます。',
  'clusters.topology.state.override.tips':
    '手入力。クリアするとデバイス報告値 {value} に戻ります',
  'clusters.topology.state.user.tips': '手入力（{key}）',
  'clusters.topology.override.confirm':
    'この値はデバイスの自己報告です。手入力すると上書きされます。',
  'clusters.topology.override.ok': '上書き',
  'clusters.topology.value.count': '{count} 台',
  'clusters.topology.value.create': '“{value}” を新規作成',
  'clusters.topology.value.clear': 'クリア',
  'clusters.topology.column.menu': '{field} 列メニュー',
  'clusters.topology.column.fillUnfilled': '未入力の {count} 台を一括入力…',
  'clusters.topology.column.fillBySwitch':
    'アクセススイッチ別に入力（{count} グループ）…',
  'clusters.topology.column.gpus': 'GPU / 空き',
  'clusters.topology.column.source': 'ソース',
  'clusters.topology.source.user': '手入力',
  'clusters.topology.source.discovered': '自動',
  'clusters.topology.source.node': 'K8s ノード',
  'clusters.topology.host.online': 'オンライン',
  'clusters.topology.host.offline': 'オフライン',
  'clusters.topology.tree.byLayer': 'レイヤー別',
  'clusters.topology.tree.byDomain': 'アクセラレータードメイン別',
  'clusters.topology.tree.byField': '{field}別',
  'clusters.topology.tree.expandAll': 'すべて展開',
  'clusters.topology.tree.collapseAll': 'すべて折りたたむ',
  'clusters.topology.tree.spansDomains': '{count} 個のドメインにまたがる',
  'clusters.topology.tree.unfilled': '{field}未設定',
  'clusters.topology.tree.unknownDomain': '不明なドメイン',
  'clusters.topology.tree.more': 'あと {count} 台',
  'clusters.topology.tree.hostCapacity': '{gpus} GPU · 空き {free}',
  'clusters.topology.onboarding.hosts': '{hosts} 台のホストを認識しました。',
  'clusters.topology.onboarding.withDomains':
    '{hosts} 台のホストと {domains} 個のアクセラレータードメイン（自動）を認識しました。',
  'clusters.topology.onboarding.goal':
    'PD 分離グループのメンバーを近くに配置するには：',
  'clusters.topology.onboarding.steps':
    '① 同じラックのマシンを選択 → ②「位置を設定」でラック名を入力 → ③ デプロイ時に「同じラック」を選択',
  'clusters.topology.onboarding.domains':
    'マルチノード NVLink や Ascend スーパーポッドのマシンは、アクセラレータードメインが自動で表示されます。',
  'clusters.topology.onboarding.dismiss': '了解',
  'clusters.topology.mapping.title': 'ラベルキーのマッピング',
  'clusters.topology.mapping.intro':
    '各フィールドが worker のどのラベルから値を読むか',
  'clusters.topology.mapping.layers': 'レイヤー',
  'clusters.topology.mapping.layers.tips':
    '入れ子構造：下の階層は必ず上の階層の中にあります',
  'clusters.topology.mapping.layers.status': '{count} 個のフィールドを使用中',
  'clusters.topology.mapping.layers.status.empty': 'フィールド未入力',
  'clusters.topology.mapping.domain.status': '{count} 個のドメイン',
  'clusters.topology.mapping.domain.status.inactive': '未認識',
  'clusters.topology.mapping.showUnused':
    '未使用の {count} 個のフィールドを表示',
  'clusters.topology.mapping.hideUnused': '未使用のフィールドを隠す',
  'clusters.topology.mapping.moreKeys': '+ {count} 個の候補キー',
  'clusters.topology.mapping.classified': '認識 {classified} / {total}',
  'clusters.topology.mapping.noKeys': 'ラベルキー未設定',
  'clusters.topology.mapping.domain.tips':
    '階層ではない並列のグループ：NVLink / HCCS / UB で互いのメモリに直接アクセスできるマシンを 1 つに囲みます。1 つのドメインは複数のラックにまたがることも、1 台だけのこともあります',
  'clusters.topology.mapping.domain.stats':
    'ドメイン {domains} 個、最大で {racks} ラックにまたがります',
  'clusters.topology.mapping.subDomain.tips':
    '同じドメインかつ同じ階層のマシンを優先して一緒に配置します（Atlas 950 の計算キャビネットなど）。ドメインができたら、位置フィールドをドメイン内の階層として選べます',
  'clusters.topology.mapping.subDomain.placeholder':
    'アクセラレータードメインを報告するワーカーはまだありません',
  'clusters.topology.layer.labelKeys': 'ラベルキー',
  'clusters.topology.layer.addKey': 'キーを追加',
  'clusters.topology.layer.name': '名前',
  'clusters.topology.advanced.hostKeys': '組み込み、worker 名による',
  'clusters.topology.advanced.locked':
    'GPUStack 固有キー：手入力値はここに書かれます。削除・移動不可。',
  'clusters.topology.advanced.subDomain': 'ドメイン内階層',
  'clusters.topology.advanced.subDomain.none': 'なし',
  'clusters.topology.advanced.subDomain.keys': '独自キー…',
  'clusters.topology.advanced.suggestions': '発見されたラベルキー',
  'clusters.topology.advanced.suggestion':
    '{workers} 台 · {values} 個の値 · {field} のようです',
  'clusters.topology.advanced.discard':
    'フィールドマッピングの変更を破棄しますか？',
  'clusters.topology.advanced.discard.tips':
    'テーブルで入力した値には影響しません。',
  'clusters.topology.advanced.saved':
    '保存しました。以後のスケジューリングにのみ影響し、実行中のグループは移動されません。',
  'clusters.topology.keys.placeholder': 'ラベルキーを入力するか、下から選択',
  'clusters.topology.keys.invalid':
    '有効な Kubernetes ラベルキーではありません（プレフィックス ≤ 253、名前 ≤ 63、英数字 - _ .）',
  'clusters.topology.keys.usage':
    '{count} 台の worker がこのキーを持っています（{values} 個の値）',
  'clusters.topology.keys.exists': 'このキーはすでに追加されています',
  'clusters.topology.custom.title': 'カスタムフィールド',
  'clusters.topology.custom.name.required': '名前を入力してください',
  'clusters.topology.custom.name.taken': 'この名前は使用済みか予約語です',
  'clusters.topology.custom.name.tips':
    'デプロイフォームの選択肢に表示されます',
  'clusters.topology.custom.position': 'チェーンのどこに置くか',
  'clusters.topology.custom.slot.insert': 'ここに挿入',
  'clusters.topology.custom.slot.placeholder': '新しいレイヤー',
  'clusters.topology.custom.slot.explain':
    '1 つの{parent}に複数の{name}があり、1 つの{name}に複数の{child}があります',
  'clusters.topology.custom.slot.explain.top':
    '1 つの{name}に複数の{child}があります',
  'clusters.topology.custom.keys.tips':
    'カスタムレイヤーには固有キーがありません。テーブルから手入力するには、最初のキーを書き込み先にしてください。',
  'clusters.topology.custom.referenced':
    '「{name}」は削除できません：以下のモデルが参照しています'
};
// ========== To-Do: Translate Keys (Remove After Translation) ==========
// 1. 'clusters.title': 'Cluster',
// 2. 'clusters.table.provider': 'Provider',
// 3. 'clusters.table.deployments': 'Deployments',
// 4. 'clusters.button.add': 'Add Cluster',
// 5. 'clusters.button.addCredential': 'Add Cloud Credential',
// 6. 'clusters.button.editCredential': 'Edit Cloud Credential',
// 7. 'clusters.filterBy.cluster': 'Filter by cluster',
// 8. 'clusters.add.cluster': 'Add {cluster} Cluster',
// 9. 'clusters.edit.cluster': 'Edit {cluster}',
// 10. 'clusters.provider.custom': 'Custom',
// 11. 'clusters.button.register': 'Register Cluster',
// 12. 'clusters.button.addNodePool': 'Add Worker Pool',
// 13. 'clusters.button.add.credential': 'Add {provider} Credential',
// 14. 'clusters.credential.token': 'Access Token',
// 15. 'clusters.workerpool.region': 'Region',
// 16. 'clusters.workerpool.zone': 'Zone',
// 17. 'clusters.workerpool.instanceType': 'Instance Type',
// 18. 'clusters.workerpool.replicas': 'Replicas',
// 19. 'clusters.workerpool.batchSize': 'Batch Size',
// 20. 'clusters.workerpool.osImage': 'OS Image',
// 21. 'clusters.workerpool.volumes': 'Volumes',
// 22. 'clusters.workerpool.format': 'Format',
// 23. 'clusters.workerpool.size': 'Size (GiB)',
// 24.  'clusters.credential.title': 'Cloud Credential',
// 25. 'clusters.workerpool.title': 'Worker Pools',
// 26. 'clusters.workerpool.cloudOptions': 'Add Cloud Options',
// 27. 'clusters.workerpool.volumes.add': 'Add Volume'
// 28. 'clusters.create.provider.self': 'Self-Hosted',
// 29. 'clusters.create.provider.cloud': 'Cloud Provider',
// 30. 'clusters.create.steps.selectProvider': 'Select Provider',
// 31. 'clusters.create.configBasic': 'Basic Configuration',
// 32. 'clusters.create.execCommand': 'Execute Command',
// 33. 'clusters.create.supportedGpu': 'Supported GPUs',
// 34. 'clusters.create.skipfornow': 'Skip for Now',
// 35. 'clusters.create.noImages': 'No images available',
// 36. 'clusters.create.noInstanceTypes': 'No instance types available',
// 37. 'clusters.create.noRegions': 'No regions available',
// 38. 'clusters.workerpool.batchSize.desc': 'Number of workers created simultaneously in the Worker pool',
// 39. 'clusters.create.addworker.tips': 'Please make sure the <a href={link} target="_blank">prerequisites</a> for {label} are met before executing the following command.',
// 40. 'clusters.create.addCommand.tips': 'On the Worker that needs to be added, run the following command to join it to the cluster.',
// 41. 'cluster.create.checkEnv.tips': 'Use the following command to check if the environment is ready.',
// 42. 'clusters.create.register.tips': ' On the Kubernetes cluster that needs to be added, run the following command to join its nodes to the cluster.',
// 43. 'cluster.provider.comingsoon': 'Coming soon',
// 44. 'clusters.addworker.nvidiaNotes-01': 'If multiple outbound IPs exist, specify the one you want the worker to use. Please double-check with <span class="bold-text">hostname -I | xargs -n1</span>.',
// 45. 'clusters.addworker.nvidiaNotes-02': 'If a model directory already exists on the worker, you can specify the path to mount it.',
// 46. 'clusters.addworker.hygonNotes': `If <span class="bold-text">/opt/hyhal</span> or <span class="bold-text">/opt/dtk</span> does not exist, create symbolic links pointing to the corresponding Hygon installation paths, for example: <span class="desc-fill">ln -s /path/to/hyhal /opt/hyhal</span> <span class="desc-fill">ln -s /path/to/dtk /opt/dtk</span>.`,
// 47. 'clusters.addworker.corexNotes': `If the <span class="bold-text">/usr/local/corex</span> directory does not exist, create a symbolic link to the Iluvatar SDK installation path: <span class="bold-text">ln -s /path/to/corex /usr/local/corex</span>.`,
// 47. 'clusters.addworker.metaxNotes': `If the <span class="bold-text">/opt/mxdriver</span> or <span class="bold-text">/opt/maca</span> directory does not exist, create a symbolic link to the MetaX driver and SDK installation path:  <span class="desc-fill">ln -s /path/to/mxdriver /opt/mxdriver</span><span class="desc-fill">ln -s /path/to/maca /opt/maca</span>.`,
// 49. 'clusters.addworker.cambriconNotes': 'If the <span class="bold-text">/usr/local/neuware</span> directory does not exist, create a symbolic link to the Cambricon installation path: <span class="bold-text">ln -s /path/to/neuware /usr/local/neuware</span>.'
// 50. 'clusters.addworker.hygonNotes-02': 'If device detection fails, try removing <span class="bold-text">--env ROCM_SMI_LIB_PATH=/opt/hyhal/lib</span>.',
// 51.  'clusters.addworker.selectCluster': 'Select Cluster',
// 52. 'clusters.addworker.selectCluster.tips': 'For <span class="bold-text">non-Docker</span> clusters, please register clusters or manage worker pools from the Clusters page.',
// 53. 'clusters.addworker.selectGPU': 'Select GPU Vendor',
// 54. 'clusters.addworker.checkEnv': 'Check Environment',
// 55. 'clusters.addworker.specifyArgs': 'Specify Arguments',
// 56. 'clusters.addworker.runCommand': 'Run Command',
// 57. 'clusters.addworker.specifyWorkerIP': 'Worker IP',
// 58. 'clusters.addworker.detectWorkerIP': 'Auto-detect Worker IP',
// 59. 'clusters.addworker.enterWorkerIP': 'Enter worker IP',
// 60. 'clusters.addworker.enterWorkerIP.error': 'Please enter the worker IP.',
// 61. 'clusters.addworker.extraVolume': 'Additional Volume Mount',
// 62. 'clusters.addworker.configSummary': 'Configuration Summary',
// 63. 'clusters.addworker.gpuVendor': 'GPU Vendor',
// 64. 'clusters.addworker.workerIP': 'Worker IP',
// 65. 'clusters.addworker.workerExternalIP': 'Worker External Address',
// 65. 'clusters.addworker.notSpecified': 'Not Specified',
// 66. 'clusters.addworker.autoDetect': 'Auto',
// 67.  'clusters.addworker.extraVolume.holder': 'e.g. /data/models (path must start with /). Use commas to separate multiple paths.',
// 68. 'clusters.addworker.vendorNotes.title': 'Notes for {vendor} Device',
// 69. 'clusters.button.genToken': 'Need to create a new token? Click <a href="{link}" target="_blank">here</a>.',
// 70. 'clusters.addworker.amdNotes-01': `If the <span class="bold-text">/opt/rocm</span> directory does not exist, please create a symbolic link pointing to the ROCm installed path: <span class="bold-text">ln -s /path/to/rocm /opt/rocm</span>.`,
// 71.  'clusters.addworker.cacheVolume': 'Model Cache Volume Mount',
// 72.  'clusters.addworker.cacheVolume.tips': 'If you want to customize the model cache directory, you can specify the path to mount it.',
// 73. 'clusters.addworker.cacheVolume.holder': 'e.g. /data/cache (path must start with /)',
// 74. 'clusters.addworker.message.success_single': '{count} new worker has been added to the cluster.',
// 75. 'clusters.addworker.message.success_multiple': '{count} new workers have been added to the cluster.',
// 76. 'clusters.create.serverUrl': 'GPUStack Server URL',
// 77.  'clusters.create.workerConfig': 'Worker Configuration'
// 78.  'clusters.addworker.containerName': 'Worker Container Name',
// 79.  'clusters.addworker.containerName.tips':'Specify a name for the worker container.',
// 77. 'clusters.addworker.dataVolume': 'GPUStack Data Volume',
// 78.  'clusters.addworker.dataVolume.tips': 'Specify a data storage path for GPUStack.',
// 79.  'clusters.table.ip.internal': 'Internal',
// 80.  'clusters.table.ip.external': 'External',
// 81.  'clusters.form.serverUrl.tips': 'Specify an externally accessible GPUStack service URL if the worker cannot access GPUStack Server directly.',
// 82. 'clusters.addworker.externalIP.tips': 'Specify an external IP if the worker is in a VPC or private network.',
// 83. 'clusters.form.setDefault': 'Set as Default',
// 84. 'clusters.form.setDefault.tips': 'Default for deployment',
// 85.  'clusters.addworker.enterWorkerAddress': 'Enter worker external address',
// 86.  'clusters.addworker.enterWorkerAddress.error': 'Please enter the worker external address.',
// 87. 'clusters.addworker.noClusters': 'No available Docker clusters found',
// 88. 'clusters.create.steps.complete.tips': 'Cluster created successfully!',
// 89. 'clusters.create.steps.complete': 'Complete',
// 90. 'clusters.create.dockerTips1': 'Next, add worker to this cluster.',
// 91. 'clusters.create.dockerTips2': 'You can also skip this step and add them later from the cluster list.',
// 92. 'clusters.create.k8sTips1': 'Next, register existing Kubernetes cluster.',
// 93. 'clusters.create.k8sTips2': 'You can also skip this step and register it later from the cluster list.',
// 94. 'clusters.create.steps.configure': 'Configure',
// 99. 'clusters.addworker.theadNotes': 'If the <span class="bold-text>/usr/local/PPU_SDK</span> directory does not exist, please create a symbolic link pointing to the T-Head PPU SDK installed path: <span class="bold-text>ln -s /path/to/PPU_SDK /usr/local/PPU_SDK</span>',
// 100. 'clusters.addworker.theadNotes-02': 'T-Head PPU uses the Container Device Interface (CDI) for device injection and requires the <span class="bold-text">/var/run/cdi</span> directory to be available for CDI generation.',
// 101. 'clusters.addworker.nvidiaNotes': 'The built-in inference backends in GPUStack v2.1 require <span class="bold-text">CUDA 12.6+</span>. Please ensure your NVIDIA driver version is <span class="bold-text">560</span> or newer.'
// ========== End of To-Do List ==========
