# Cloud adapter contract (prototype — server not provided)

The APK does **not** connect to a preconfigured AI provider. Users must explicitly enable Cloud, consent to thumbnail upload and provide a secure HTTPS API endpoint that they control or trust. Fees depend on that provider.

POST `https://your-service.example/analyze`

Headers: `Content-Type: application/json; charset=utf-8`, optional `Authorization: Bearer <ephemeral-token>`.

Request:
```json
{
  "schema": 1,
  "photos": [
    {"id": "p1", "name": "vi_den_01.jpg", "category": "Ví nam", "thumbnail_base64": "<base64-jpeg>"},
    {"id": "p2", "name": "vi_den_02.jpg", "category": "Ví nam", "thumbnail_base64": "<base64-jpeg>"}
  ]
}
```

Response must contain models and photos. Color must reflect **foreground product color**, not background; uncertain colors should be `Chưa rõ`.
```json
{
  "models": [{"id":"m1", "category":"Ví nam", "name":"Mẫu cần kiểm tra", "verified":false}],
  "photos": [
    {"id":"p1", "modelId":"m1", "color":"Đen", "confidence":0.68},
    {"id":"p2", "modelId":"m1", "color":"Đen", "confidence":0.65}
  ]
}
```

The client must not let a server set prices or final verification. A production service must implement authentication, privacy retention, request-size limits, batch jobs, rate-limits, TLS and user access controls; the prototype only demonstrates the integration point.

 