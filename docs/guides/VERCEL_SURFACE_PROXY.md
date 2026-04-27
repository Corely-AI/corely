# Vercel Surface Proxy

Corely surface projects should proxy same-origin `/api/*` requests to `https://api.corely.one/*` and attach a surface-specific trusted header. The API trusts only `x-corely-proxy-key` for surface resolution. `x-corely-surface` is optional and is used only for logs and mismatch detection.

`pos.corely.one` is the only POS host. Do not send a vertical header from the browser. POS vertical selection is resolved on the API from workspace configuration (`workspace.verticalId`), not from the host.

Examples below use Vercel `routes` plus `transforms` so request headers are set at the edge from project environment variables.

## app.corely.one

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "^/api/(.*)$",
      "dest": "https://api.corely.one/$1",
      "transforms": [
        {
          "type": "request.headers",
          "op": "set",
          "target": { "key": "x-corely-proxy-key" },
          "args": "$CORELY_PROXY_KEY_APP",
          "env": ["CORELY_PROXY_KEY_APP"]
        },
        {
          "type": "request.headers",
          "op": "set",
          "target": { "key": "x-corely-surface" },
          "args": "app"
        }
      ]
    }
  ]
}
```

## pos.corely.one

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "^/api/(.*)$",
      "dest": "https://api.corely.one/$1",
      "transforms": [
        {
          "type": "request.headers",
          "op": "set",
          "target": { "key": "x-corely-proxy-key" },
          "args": "$CORELY_PROXY_KEY_POS",
          "env": ["CORELY_PROXY_KEY_POS"]
        },
        {
          "type": "request.headers",
          "op": "set",
          "target": { "key": "x-corely-surface" },
          "args": "pos"
        }
      ]
    }
  ]
}
```

## crm.corely.one

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "^/api/(.*)$",
      "dest": "https://api.corely.one/$1",
      "transforms": [
        {
          "type": "request.headers",
          "op": "set",
          "target": { "key": "x-corely-proxy-key" },
          "args": "$CORELY_PROXY_KEY_CRM",
          "env": ["CORELY_PROXY_KEY_CRM"]
        },
        {
          "type": "request.headers",
          "op": "set",
          "target": { "key": "x-corely-surface" },
          "args": "crm"
        }
      ]
    }
  ]
}
```
