这个项目开发态会把前端请求代理到 `PROXY_HOST`，配置入口在 [config/config.ts](./config/config.ts#L16) 和 [config/proxy.ts](./config/proxy.ts#L14)。默认值现在是 `http://localhost`，所以你本机没起后端时会连不上。

最直接的跑法是不要改代码，直接带环境变量启动：

```bash
PROXY_HOST=http://192.168.50.16:8084 npm run dev
```

然后浏览器打开前端开发地址，一般是 `http://localhost:8000` 或终端里显示的地址。登录时再输入：
`admin / Seal@123`

如果你想写死到代码里，就把 [config/proxy.ts](./config/proxy.ts#L17) 这一行：

```ts
const newTarget = target || 'http://localhost';
```

改成：

```ts
const newTarget = target || 'http://192.168.50.16:8084';
```

另外前端接口基路径是 [src/app.tsx](./src/app.tsx#L114) 里的 `/v2`，通常不用改，只要你的服务端这个地址下有 `/v2`、`/auth`、`/version` 这些接口就能跑。
